import Fastify from 'fastify';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { serverConfig, describeDb, resolveRequestConfig } from './config.js';
import type { RequestConfigInput, ResolvedConfig } from './config.js';
import { getRuntime, pingModel } from './runtime.js';
import { VISUAL_TOOL_NAMES } from './tools.js';
import { closeAllPools, pingDatabase } from './db.js';
import { decryptConfigPayload, handshake } from './crypto.js';
import type { ConfigEncPayload } from './crypto.js';
import { TurnBudget, runWithBudget } from './budget.js';
import { logLine } from './log.js';

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
    maxSqlQueries: resolved.maxSqlQueries,
    maxSchemaCalls: resolved.maxSchemaCalls,
    maxResultChars: resolved.maxResultChars,
    maxTotalToolChars: resolved.maxTotalToolChars,
  });
  let inputTokens = 0;
  let outputTokens = 0;
  let turnError = '';
  logLine(`turn start model=${resolved.llm.model}`);

  await runWithBudget(budget, async () => {
  try {
    const agent = getRuntime(resolved);
    const stream = await agent.streamEvents(
      { messages },
      { version: 'v2', recursionLimit: resolved.recursionLimit, signal: controller.signal },
    );

    for await (const event of stream) {
      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk as { content?: unknown } | undefined;
        const text = extractText(chunk?.content);
        if (text) send({ type: 'token', content: text });
      } else if (event.event === 'on_tool_start') {
        send({
          type: 'tool_start',
          name: event.name,
          input: (event.data as { input?: unknown })?.input,
        });
      } else if (event.event === 'on_tool_end') {
        const output = extractText((event.data as { output?: unknown })?.output);
        const spec = VISUAL_TOOL_NAMES.has(event.name) ? safeParseObject(output) : null;
        if (spec) {
          // 可视化工具有效 → 作为独立的 visual 事件下发，前端直接渲染组件
          send({ type: 'visual', ...spec });
        } else {
          send({ type: 'tool_result', name: event.name, output });
        }
      } else if (event.event === 'on_chat_model_end') {
        const usage = (event.data?.output as {
          usage_metadata?: { input_tokens?: number; output_tokens?: number };
        })?.usage_metadata;
        if (usage) {
          inputTokens += usage.input_tokens || 0;
          outputTokens += usage.output_tokens || 0;
        }
      }
    }

    send({ type: 'done' });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = timedOut
      ? '处理超时，已中断'
      : /recursion limit/i.test(rawMessage)
        ? '本次分析步骤过多已中断。请缩小时间范围、减少指标，或把问题拆成几步再问。'
        : rawMessage;
    turnError = rawMessage;
    request.log.error({ err: error }, 'agent stream failed');
    logLine(`turn error ${rawMessage}`);
    send({ type: 'error', message });
  } finally {
    finished = true;
    clearTimeout(turnTimer);
    raw.off('close', onClientClose);
    activeStreams -= 1;
    logLine(
      `turn end ${budget.summary()} tokens_in=${inputTokens} tokens_out=${outputTokens}` +
        `${turnError ? ' error=1' : ''}${budget.usage.exceeded.length ? ' exceeded=1' : ''}`,
    );
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
      target: describeDb(resolved.db),
      database: ping.database,
      tableCount: ping.tableCount,
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
