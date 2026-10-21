import Fastify from 'fastify';
import { Command } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { countTokensApproximately } from 'langchain';
import { serverConfig, describeDb, resolveRequestConfig } from './config.js';
import type { RequestConfigInput, ResolvedConfig } from './config.js';
import { buildSystemPrompt, getRuntime, pingModel } from './runtime.js';
import { VISUAL_TOOL_NAMES } from './tools.js';
import { closeAllPools, pingDatabase } from './db.js';
import { decryptConfigPayload, handshake } from './crypto.js';
import type { ConfigEncPayload } from './crypto.js';
import { TurnBudget, runWithBudget } from './budget.js';
import { logLine } from './log.js';
import { buildVariantHint, guessTemplateFromText, pickReportVariant } from './report-variant.js';

const app = Fastify({ logger: true });

app.addHook('onRequest', async (_request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
  reply.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
});

app.options('/*', async (_request, reply) => {
  reply.code(204).send();
});

// 健康检查：仅表示服务存活，不含任何配置/密钥
const bootedAt = new Date().toISOString();
app.get('/health', async () => ({
  status: 'ok',
  pid: process.pid,
  startedAt: bootedAt,
  uptimeSec: Math.round(process.uptime()),
}));

// 传输加密公钥：前端用它加密 config（含数据库密码 / API Key）
app.get('/handshake', async () => handshake);

interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessageInput[];
  conversationId?: string;
  config?: RequestConfigInput;
  configEnc?: ConfigEncPayload;
  /** 上一份报告的版式，由前端从 visuals 里带回，用于避免连续重复 */
  lastLayout?: string;
  lastVisualStyle?: string;
  lastElements?: string[];
}

function toMessage(message: ChatMessageInput): BaseMessage {
  if (message.role === 'assistant') return new AIMessage(message.content);
  if (message.role === 'system') return new SystemMessage(message.content);
  return new HumanMessage(message.content);
}

function resolveOrThrow(input?: RequestConfigInput | null): ResolvedConfig {
  return resolveRequestConfig(input);
}

/** 优先使用加密配置 configEnc（解密后），否则回落明文 config。 */
function configFromBody(body: {
  config?: RequestConfigInput;
  configEnc?: ConfigEncPayload;
}): RequestConfigInput | undefined {
  if (body.configEnc) {
    return decryptConfigPayload(body.configEnc) as RequestConfigInput;
  }
  return body.config;
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
};

// /chat/stream 任何情况下都必须返回 SSE（包括 body 解析失败），
// 否则前端的 SSE 客户端只会报 content-type 不匹配，看不到真正的错误。
app.setErrorHandler((error, request, reply) => {
  if (request.url.split('?')[0] === '/chat/stream') {
    if (!reply.raw.headersSent) reply.raw.writeHead(200, SSE_HEADERS);
    if (!reply.raw.writableEnded) {
      const message = error instanceof Error ? error.message : String(error);
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      reply.raw.end();
    }
    return;
  }
  reply.send(error);
});

let activeStreams = 0;

app.post('/chat/stream', async (request, reply) => {
  const body = request.body as ChatRequestBody;

  // 一开始就切到 SSE，校验失败也用 SSE 返回错误。
  // 否则前端 SSE 客户端会先报 "Expected content-type to be text/event-stream,
  // Actual: application/json"，真正的原因（缺配置、解密失败等）反而看不到。
  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, SSE_HEADERS);

  const send = (payload: unknown) => {
    if (raw.writableEnded || raw.destroyed) return;
    raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  const fail = (message: string) => {
    send({ type: 'error', message });
    raw.end();
  };

  if (!body || !Array.isArray(body.messages)) {
    fail('messages 必须是数组');
    return;
  }

  // 合并前端下发配置（不传则回落 .env 默认）
  let resolved: ResolvedConfig;
  try {
    resolved = resolveOrThrow(configFromBody(body));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    request.log.warn({ err: e }, 'chat/stream config error');
    fail(message);
    return;
  }

  request.log.info(
    { db: describeDb(resolved.db), model: resolved.llm.model },
    'chat/stream config',
  );

  // 并发上限：防止同时发起大量对话放大 token 与数据库压力
  if (activeStreams >= resolved.maxConcurrent) {
    fail('当前会话过多，请稍后再试');
    return;
  }

  // 历史直接交给 agent；上下文优化由 LangChain 的 summarizationMiddleware 负责
  const messages: BaseMessage[] = body.messages.map(toMessage);

  // 报告版式轮换：在模型选模板前先按用户措辞推断类型，再结合上一份版式避开重复。
  const lastUserText =
    [...body.messages].reverse().find(message => message.role === 'user')?.content || '';
  const wantsReport = /报告|日报|周报|月报|年报|年度|汇报|大屏|出一份|来一份/.test(lastUserText);
  if (wantsReport) {
    const userTurns = body.messages.filter(message => message.role === 'user').length;
    const variant = pickReportVariant({
      template: guessTemplateFromText(lastUserText),
      userText: lastUserText,
      lastLayout: body.lastLayout,
      lastVisualStyle: body.lastVisualStyle,
      lastElements: Array.isArray(body.lastElements) ? body.lastElements : [],
      seed: `${body.conversationId || 'anonymous'}|${userTurns}`,
    });
    const hint = buildVariantHint(variant, {
      layout: body.lastLayout,
      visualStyle: body.lastVisualStyle,
      elements: Array.isArray(body.lastElements) ? body.lastElements : [],
    });
    const lastUserIndex = messages.reduce(
      (index, message, i) => (message._getType() === 'human' ? i : index),
      -1,
    );
    if (lastUserIndex >= 0) {
      messages.splice(lastUserIndex, 0, new SystemMessage(hint));
    }
    request.log.info(
      {
        layout: variant.layout,
        visualStyle: variant.visualStyle,
        elements: variant.featureElements,
        reason: variant.reason,
      },
      'report variant',
    );
    logLine(
      `report variant ${variant.reason} style=${variant.visualStyle} ` +
        `elements=${variant.featureElements.join(',')}`,
    );
  }

  // 单轮总时长上限 + 客户端断开即中止（避免挂起、持续烧 token / 占着数据库）
  const controller = new AbortController();
  let timedOut = false;
  let finished = false;
  const turnTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, resolved.turnTimeoutMs);
  // 仅当客户端提前断开时才中止（正常结束时 finished=true）
  const onClientClose = () => {
    if (!finished) controller.abort();
  };
  raw.on('close', onClientClose);

  activeStreams += 1;

  const budget = new TurnBudget({
    // 报告轮次需要多取几个口径，普通问答仍使用配置值
    maxSqlQueries: wantsReport ? Math.max(resolved.maxSqlQueries, 10) : resolved.maxSqlQueries,
    maxSchemaCalls: wantsReport ? Math.max(resolved.maxSchemaCalls, 8) : resolved.maxSchemaCalls,
    maxResultChars: resolved.maxResultChars,
    maxTotalToolChars: resolved.maxTotalToolChars,
  });
  let turnError = '';
  const turnStartedAt = Date.now();
  const bridge = createTurnBridge({ send, resolved, budget, turnStartedAt });
  const threadId = resolved.requireSqlApproval
    ? `${body.conversationId || 'anonymous'}:${Date.now().toString(36)}:${Math.random()
        .toString(36)
        .slice(2, 8)}`
    : undefined;

  logLine(`turn start model=${resolved.llm.model}`);

  const heartbeat = setInterval(() => {
    send({ type: 'heartbeat', ts: Date.now() });
  }, 15000);

  let agent: ReturnType<typeof getRuntime> | null = null;

  await runWithBudget(budget, async () => {
  try {
    agent = getRuntime(resolved);

    // 用 LangChain 自带的近似 token 统计判断本轮是否会触发摘要。
    // 只用于给前端一个轻量提示，不参与上下文裁剪。
    const approxTokens = countTokensApproximately([
      new SystemMessage(buildSystemPrompt(resolved)),
      ...messages,
    ]);
    if (approxTokens >= resolved.summaryTriggerTokens) {
      logLine(`context summary expected tokens~${approxTokens}`);
      send({ type: 'status', message: '上下文较长，正在压缩…' });
    }

    // LangChain 的 summarizationMiddleware 会给内部摘要调用打 nostream 标签；
    // 用 streamEvents 自带的 excludeTags 过滤，不把内部摘要转发给用户。
    const streamConfig: Record<string, unknown> = {
      version: 'v2',
      recursionLimit: resolved.recursionLimit,
      signal: controller.signal,
    };
    if (threadId) streamConfig.configurable = { thread_id: threadId };
    const stream = await agent.streamEvents(
      { messages },
      streamConfig,
      { excludeTags: ['nostream'] },
    );

    for await (const event of stream) {
      bridge.handle(event as StreamEventLike);
    }

    if (agent && threadId) {
      const interrupts = await collectInterrupts(agent, threadId);
      if (interrupts.length) {
        bridge.sendEnrichment();
        send({ type: 'interrupt', threadId, interrupts });
        return;
      }
    }

    bridge.sendEnrichment();
    send({ type: 'done' });
  } catch (error) {
    if (agent && threadId) {
      const interrupts = await collectInterrupts(agent, threadId);
      if (interrupts.length) {
        bridge.sendEnrichment();
        send({ type: 'interrupt', threadId, interrupts });
        return;
      }
    }
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = timedOut
      ? '处理超时，已中断'
      : /recursion limit/i.test(rawMessage)
        ? '本次分析步骤过多已中断。请缩小时间范围、减少指标，或把问题拆成几步再问。'
        : rawMessage;
    turnError = rawMessage;
    request.log.error({ err: error }, 'agent stream failed');
    logLine(`turn error ${rawMessage}`);
    bridge.sendEnrichment();
    send({ type: 'error', message });
  } finally {
    finished = true;
    clearTimeout(turnTimer);
    clearInterval(heartbeat);
    raw.off('close', onClientClose);
    activeStreams -= 1;
    logLine(
      `turn end ${budget.summary()}${turnError ? ' error=1' : ''}` +
        `${budget.usage.exceeded.length ? ' exceeded=1' : ''}`,
    );
    raw.end();
  }
  });
});

// SQL 审批恢复：配合 /chat/stream 的 interrupt 事件，用 LangChain Command 继续执行
app.post('/chat/resume', async (request, reply) => {
  const body = request.body as
    | {
        threadId?: string;
        decisions?: unknown[];
        config?: RequestConfigInput;
        configEnc?: ConfigEncPayload;
      }
    | undefined;

  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, SSE_HEADERS);

  const send = (payload: unknown) => {
    if (raw.writableEnded || raw.destroyed) return;
    raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  const fail = (message: string) => {
    send({ type: 'error', message });
    raw.end();
  };

  if (!body || typeof body.threadId !== 'string' || !body.threadId.trim()) {
    fail('缺少 threadId，无法恢复审批');
    return;
  }
  if (!Array.isArray(body.decisions) || !body.decisions.length) {
    fail('缺少审批结果 decisions');
    return;
  }

  let resolved: ResolvedConfig;
  try {
    resolved = resolveOrThrow(configFromBody(body));
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }
  if (!resolved.requireSqlApproval) {
    fail('当前未启用 SQL 审批');
    return;
  }
  if (activeStreams >= resolved.maxConcurrent) {
    fail('当前会话过多，请稍后再试');
    return;
  }

  const controller = new AbortController();
  let timedOut = false;
  let finished = false;
  const turnTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, resolved.turnTimeoutMs);
  const onClientClose = () => {
    if (!finished) controller.abort();
  };
  raw.on('close', onClientClose);
  activeStreams += 1;

  const budget = new TurnBudget({
    maxSqlQueries: resolved.maxSqlQueries,
    maxSchemaCalls: resolved.maxSchemaCalls,
    maxResultChars: resolved.maxResultChars,
    maxTotalToolChars: resolved.maxTotalToolChars,
  });
  const bridge = createTurnBridge({
    send,
    resolved,
    budget,
    turnStartedAt: Date.now(),
  });
  const heartbeat = setInterval(() => {
    send({ type: 'heartbeat', ts: Date.now() });
  }, 15000);
  let turnError = '';

  await runWithBudget(budget, async () => {
    try {
      const agent = getRuntime(resolved);
      const stream = await agent.streamEvents(
        new Command({ resume: { decisions: body.decisions } }),
        {
          version: 'v2',
          recursionLimit: resolved.recursionLimit,
          signal: controller.signal,
          configurable: { thread_id: body.threadId },
        },
        { excludeTags: ['nostream'] },
      );
      for await (const event of stream) {
        bridge.handle(event as StreamEventLike);
      }

      const interrupts = await collectInterrupts(agent, body.threadId as string);
      bridge.sendEnrichment();
      if (interrupts.length) {
        send({ type: 'interrupt', threadId: body.threadId, interrupts });
      } else {
        send({ type: 'done' });
      }
    } catch (error) {
      const interrupts = await collectInterrupts(
        getRuntime(resolved),
        body.threadId as string,
      ).catch(() => []);
      if (interrupts.length) {
        bridge.sendEnrichment();
        send({ type: 'interrupt', threadId: body.threadId, interrupts });
        return;
      }
      const rawMessage = error instanceof Error ? error.message : String(error);
      const message = timedOut
        ? '处理超时，已中断'
        : /recursion limit/i.test(rawMessage)
          ? '本次分析步骤过多已中断。请缩小时间范围、减少指标，或把问题拆成几步再问。'
          : rawMessage;
      turnError = rawMessage;
      request.log.error({ err: error }, 'agent resume failed');
      logLine(`resume error ${rawMessage}`);
      bridge.sendEnrichment();
      send({ type: 'error', message });
    } finally {
      finished = true;
      clearTimeout(turnTimer);
      clearInterval(heartbeat);
      raw.off('close', onClientClose);
      activeStreams = Math.max(0, activeStreams - 1);
      logLine(`resume end ${budget.summary()}${turnError ? ' error=1' : ''}`);
      raw.end();
    }
  });
});

// 连接自检：真实连一下数据库 + 轻量探一下大模型；用于前端打开组件时友好提示
app.post('/config/check', async (request, reply) => {
  const body = request.body as
    | { config?: RequestConfigInput; configEnc?: ConfigEncPayload }
    | undefined;

  let resolved: ResolvedConfig;
  try {
    resolved = resolveOrThrow(configFromBody(body ?? {}));
  } catch (e) {
    reply.send({ ok: false, error: e instanceof Error ? e.message : String(e) });
    return;
  }

  const result: {
    ok: boolean;
    db: Record<string, unknown>;
    llm: Record<string, unknown>;
  } = {
    ok: false,
    db: { ok: false, target: describeDb(resolved.db) },
    llm: { ok: false, model: resolved.llm.model },
  };

  try {
    const ping = await withTimeout(pingDatabase(resolved.db), 12000, '数据库连接超时');
    result.db = {
      ok: true,
      type: resolved.db.type,
      target: describeDb(resolved.db),
      database: ping.database,
      tableCount: ping.tableCount,
      ...(ping.version ? { version: ping.version } : {}),
      ...(ping.readOnly !== undefined ? { readOnly: ping.readOnly } : {}),
    };
  } catch (e) {
    result.db = {
      ok: false,
      target: describeDb(resolved.db),
      error: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    await withTimeout(pingModel(resolved.llm), 20000, '大模型响应超时');
    result.llm = { ok: true, model: resolved.llm.model };
  } catch (e) {
    result.llm = {
      ok: false,
      model: resolved.llm.model,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  result.ok = Boolean((result.db as { ok?: boolean }).ok) && Boolean((result.llm as { ok?: boolean }).ok);
  request.log.info(
    { db: result.db.ok, llm: result.llm.ok, target: describeDb(resolved.db) },
    'config/check',
  );
  reply.send(result);
});

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** 把工具返回的 JSON 字符串解析成对象；失败返回 null。 */
function safeParseObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const TOOL_LABELS: Record<string, string> = {
  list_tables: '浏览数据表',
  get_table_schema: '查看表结构',
  run_sql: '执行查询',
  render_report: '生成分析报表',
  render_html_report: '生成 HTML 报告',
  render_chart: '生成图表',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] || name;
}

/** 工具入参里可能带整份 HTML/CSS，SSE 只下发页面真正需要的轻量字段。 */
function compactToolInput(name: string, input: unknown): unknown {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  if (name === 'run_sql') return { sql: raw.sql };
  if (name === 'get_table_schema') return { table: raw.table };
  if (name === 'list_tables') return { keyword: raw.keyword || '' };
  return undefined;
}

interface ToolSummary {
  success: boolean;
  rowCount: number;
  truncated: boolean;
  columns: number;
  tableCount: number;
  table: string;
  component: string;
  title: string;
  template: string;
  layout: string;
  visualStyle: string;
  warnings: string[];
  error: string;
}

function summarizeToolOutput(name: string, output: string): ToolSummary {
  const parsed = safeParseObject(output) || {};
  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.map(item => String(item)).filter(Boolean)
    : [];
  const summary: ToolSummary = {
    success: parsed.success !== false,
    rowCount: 0,
    truncated: parsed.truncated === true,
    columns: 0,
    tableCount: 0,
    table: '',
    component: '',
    title: '',
    template: '',
    layout: '',
    visualStyle: '',
    warnings,
    error: typeof parsed.error === 'string' ? parsed.error : '',
  };

  if (name === 'run_sql') {
    summary.rowCount = Number(parsed.rowCount) || (Array.isArray(parsed.rows) ? parsed.rows.length : 0);
    summary.columns = Array.isArray(parsed.columns) ? parsed.columns.length : 0;
    summary.truncated = parsed.truncated === true;
  } else if (name === 'get_table_schema') {
    summary.table = typeof parsed.table === 'string' ? parsed.table : '';
    summary.columns = Array.isArray(parsed.columns) ? parsed.columns.length : 0;
  } else if (name === 'list_tables') {
    summary.tableCount = Number(parsed.tableCount) || 0;
  } else if (
    name === 'render_report' ||
    name === 'render_html_report' ||
    name === 'render_chart'
  ) {
    summary.component = typeof parsed.component === 'string' ? parsed.component : '';
    summary.title = typeof parsed.title === 'string' ? parsed.title : '';
    summary.template = typeof parsed.template === 'string' ? parsed.template : '';
    summary.layout = typeof parsed.layout === 'string' ? parsed.layout : '';
    summary.visualStyle = typeof parsed.visualStyle === 'string' ? parsed.visualStyle : '';
  }

  return summary;
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text: unknown }).text ?? '');
        }
        return '';
      })
      .join('');
  }
  if (content && typeof content === 'object' && 'content' in content) {
    return extractText((content as { content: unknown }).content);
  }
  return '';
}

interface StreamEventLike {
  event: string;
  name?: string;
  run_id?: string;
  data?: Record<string, unknown>;
}

interface TurnBridgeOptions {
  send: (payload: unknown) => void;
  resolved: ResolvedConfig;
  budget: TurnBudget;
  turnStartedAt: number;
}

/** 把 LangChain 的 streamEvents 统一映射成前端 SSE 事件（普通对话与 HITL 恢复共用）。 */
function createTurnBridge({ send, resolved, budget, turnStartedAt }: TurnBridgeOptions) {
  const toolStarts = new Map<string, { name: string; startedAt: number }>();
  const tablesUsed = new Set<string>();
  const dataWarnings = new Set<string>();
  let inputTokens = 0;
  let outputTokens = 0;
  let totalRowCount = 0;
  let anyTruncated = false;
  let lastReportSpec: Record<string, unknown> | null = null;

  const addUsage = (usage?: { input_tokens?: number; output_tokens?: number }) => {
    if (!usage) return;
    inputTokens += usage.input_tokens || 0;
    outputTokens += usage.output_tokens || 0;
  };

  const reportMeta = () => {
    if (!lastReportSpec) return null;
    return {
      component: lastReportSpec.component,
      title: lastReportSpec.title,
      template: lastReportSpec.template,
      layout: lastReportSpec.layout,
      visualStyle: lastReportSpec.visualStyle,
      period: lastReportSpec.period,
      scope: lastReportSpec.scope,
      sources: lastReportSpec.sources,
      warnings: lastReportSpec.warnings,
    };
  };

  const sendEnrichment = () => {
    const elapsedMs = Date.now() - turnStartedAt;
    send({ type: 'usage', model: resolved.llm.model, inputTokens, outputTokens, elapsedMs });
    send({
      type: 'meta',
      elapsedMs,
      queries: budget.usage.sqlQueries,
      schemaCalls: budget.usage.schemaCalls,
      rowCount: totalRowCount,
      truncated: anyTruncated,
      tables: Array.from(tablesUsed),
      warnings: Array.from(dataWarnings),
      report: reportMeta(),
    });
  };

  const handle = (event: StreamEventLike) => {
    if (event.event === 'on_chat_model_stream') {
      const chunk = event.data?.chunk as { content?: unknown } | undefined;
      const text = extractText(chunk?.content);
      if (text) send({ type: 'token', content: text });
      return;
    }
    if (event.event === 'on_tool_start') {
      const name = event.name || 'tool';
      const runId = event.run_id || `tool-${Date.now()}-${toolStarts.size}`;
      const input = event.data?.input;
      const startedAt = Date.now();
      toolStarts.set(runId, { name, startedAt });
      if (name === 'get_table_schema') {
        const table = (input as { table?: unknown } | undefined)?.table;
        if (typeof table === 'string' && table.trim()) tablesUsed.add(table.trim());
      }
      send({
        type: 'tool_start',
        id: runId,
        name,
        label: toolLabel(name),
        input: compactToolInput(name, input),
        startedAt,
      });
      return;
    }
    if (event.event === 'on_tool_end') {
      const name = event.name || 'tool';
      const runId = event.run_id || `tool-${Date.now()}-${toolStarts.size}`;
      const output = extractText(event.data?.output);
      const summary = summarizeToolOutput(name, output);
      const started = toolStarts.get(runId);
      if (summary.table) tablesUsed.add(summary.table);
      if (name === 'run_sql') {
        totalRowCount += summary.rowCount;
        if (summary.truncated) anyTruncated = true;
      }
      summary.warnings.forEach(item => dataWarnings.add(item));

      const isVisual = VISUAL_TOOL_NAMES.has(name);
      const spec = isVisual ? safeParseObject(output) : null;
      if (spec) {
        lastReportSpec = spec;
        const specWarnings = Array.isArray(spec.warnings) ? spec.warnings : [];
        specWarnings.forEach(item => dataWarnings.add(String(item)));
      }
      const visualError = isVisual && !spec ? '可视化结果解析失败' : '';
      send({
        type: 'tool_end',
        id: runId,
        name,
        label: toolLabel(name),
        ok: summary.success && !visualError,
        durationMs: started ? Date.now() - started.startedAt : undefined,
        summary: {
          rowCount: summary.rowCount,
          truncated: summary.truncated,
          columns: summary.columns,
          tableCount: summary.tableCount,
          table: summary.table,
          component: summary.component,
          title: summary.title,
          template: summary.template,
          layout: summary.layout,
          visualStyle: summary.visualStyle,
          warnings: summary.warnings,
          error: summary.error || visualError,
        },
      });
      if (spec) {
        send({ type: 'visual', ...spec, toolId: runId });
      } else if (isVisual) {
        send({
          type: 'tool_result',
          id: runId,
          name,
          output: JSON.stringify({ success: false, error: visualError }),
        });
      } else {
        send({ type: 'tool_result', id: runId, name, output });
      }
      return;
    }
    if (event.event === 'on_tool_error') {
      const name = event.name || 'tool';
      const runId = event.run_id || `tool-${Date.now()}-${toolStarts.size}`;
      const started = toolStarts.get(runId);
      const rawError = event.data?.error;
      const message =
        rawError instanceof Error
          ? rawError.message || '工具执行失败'
          : typeof rawError === 'string' && rawError
            ? rawError
            : '工具执行失败';
      send({
        type: 'tool_end',
        id: runId,
        name,
        label: toolLabel(name),
        ok: false,
        durationMs: started ? Date.now() - started.startedAt : undefined,
        summary: { error: message },
      });
      return;
    }
    if (event.event === 'on_chat_model_end') {
      addUsage(
        (event.data?.output as {
          usage_metadata?: { input_tokens?: number; output_tokens?: number };
        })?.usage_metadata,
      );
    }
  };

  return { handle, sendEnrichment };
}

async function collectInterrupts(
  agent: ReturnType<typeof getRuntime>,
  threadId: string,
): Promise<Array<{ id: string; value: unknown }>> {
  try {
    const graph = agent.graph as unknown as {
      getState: (config: unknown) => Promise<{
        tasks?: Array<{ interrupts?: Array<{ id: string; value: unknown }> }>;
      }>;
    };
    const state = await graph.getState({ configurable: { thread_id: threadId } });
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const interrupts = tasks.flatMap(task => (Array.isArray(task.interrupts) ? task.interrupts : []));
    return interrupts.map(item => ({ id: item.id, value: item.value }));
  } catch {
    return [];
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info(`收到 ${signal}，正在关闭 ...`);
  await app.close().catch(() => {});
  await closeAllPools();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

app
  .listen({ port: serverConfig.port, host: serverConfig.host })
  .then((address) => app.log.info(`agent-local 已启动: ${address}`))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
