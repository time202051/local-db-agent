import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { TokenPrices } from './usage.js';
import { extractUsage } from './usage.js';
import type { ResolvedConfig } from './config.js';
import type { TurnBudget } from './budget.js';
import { BudgetExceededError } from './cost-guard.js';
import { getKnowledgePack } from './knowledge.js';
import { getSkillPack } from './skills.js';
import { createChatModel, getRuntime } from './runtime.js';
import { formatTableCandidates } from './schema-cache.js';
import type { TableCandidate } from './schema-cache.js';
import type { PageContextResolution } from './page-context.js';
import {
  PLANNER_SYSTEM_PROMPT,
  fallbackPlan,
  hashSql,
  normalizePlan,
  parsePlanDraft,
} from './plan.js';
import type {
  ExecutionMode,
  Plan,
  PlanDraft,
  PlanStep,
  SqlObservation,
  StepObservation,
  ToolObservation,
} from './plan.js';

const REPORTER_SYSTEM_PROMPT = `你是数据库分析助手。只能基于提供的执行结果回答，不能调用工具，不能编造数据。

要求：
- 用中文回答，先说结论，再给关键数据和口径。
- 数据缺失、结果为空或口径待确认时明确说明，不要用推测填补。
- 不要输出执行计划、工具调用过程或 HTML 报告源码。
- 不要写“我已经查询/我调用工具”等旁白。
- 结论直接来自某次 SQL 结果时，可在句末用 [n] 标注来源（n 为执行结果中的查询序号）。`;

export interface StreamEventLike {
  event: string;
  name?: string;
  run_id?: string;
  data?: Record<string, unknown>;
}

export interface TurnBridgeLike {
  handle: (event: StreamEventLike, options?: { emitTokens?: boolean; stepId?: string }) => void;
  shouldStop: () => boolean;
  clarifyPending: () => boolean;
}

export interface PlanRunControl {
  runId: string;
  deadline: number;
  waitForContinue: () => Promise<boolean>;
  extendDeadline: () => void;
}

export interface RunPlanOptions {
  cfg: ResolvedConfig;
  agent: ReturnType<typeof getRuntime>;
  budget: TurnBudget;
  messages: BaseMessage[];
  question: string;
  candidates: TableCandidate[];
  pageContext?: PageContextResolution | null;
  executionMode?: ExecutionMode;
  reportMode: boolean;
  bridge: TurnBridgeLike;
  send: (payload: unknown) => void;
  controller: AbortController;
  control: PlanRunControl;
}

export interface RunPlanResult {
  plan: Plan | null;
  completed: number;
  total: number;
  clarified: boolean;
  stopped: boolean;
  error: string;
}

export interface StepResult {
  step: PlanStep;
  observation: StepObservation;
}

export interface PlanRequest {
  question: string;
  history?: string;
  pageContext?: PageContextResolution | null;
  feedback?: string;
  completed?: Array<{ title: string; summary: string }>;
}

function pageContextBlock(context: PageContextResolution | null | undefined): string {
  if (!context) return '';
  if (!context.tables.length) {
    return `【当前页面】接口：${context.method} ${context.apiUrl}；未识别到对应表（${context.reason || '未映射'}）。用户说“当前页面”时不要臆造表名。`;
  }
  return (
    `【当前页面】接口：${context.method} ${context.apiUrl}；` +
    `主表：${context.primaryTable || context.tables[0]}；` +
    (context.tables.length > 1 ? `候选表：${context.tables.join('、')}；` : '') +
    '用户说“当前页面/当前表格/当前数据”时默认指主表，除非用户明确点名其他表。'
  );
}

export function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text || '');
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

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function checkBudget(budget: TurnBudget): void {
  const deny = budget.checkModelBudget();
  if (deny) throw new BudgetExceededError(deny);
}

export function recordUsage(
  usageMetadata: unknown,
  responseMetadata: unknown,
  budget: TurnBudget,
  prices: TokenPrices,
): void {
  const usage = extractUsage(usageMetadata, responseMetadata);
  if (usage.inputTokens || usage.outputTokens) budget.recordModelUsage(usage, prices);
}

export type TraceSink = (event: Record<string, unknown>) => void;

function emitTrace(sink: TraceSink | undefined, event: Record<string, unknown>): void {
  if (!sink) return;
  sink({ type: 'trace', ...event });
}

function knowledgeBlock(question: string, onTrace?: TraceSink): string {
  const pack = getKnowledgePack();
  if (!pack) return '';
  const searchStartedAt = Date.now();
  const hits = pack.search(question, 5);
  const lines: string[] = [];
  if (hits.length) {
    emitTrace(onTrace, {
      id: `trace-plan-knowledge-${searchStartedAt}`,
      phase: 'planning',
      kind: 'knowledge_search',
      title: '规划检索知识库',
      detail: `命中 ${hits.length} 篇：${hits
        .slice(0, 3)
        .map(hit => hit.title)
        .join('、')}`,
      status: 'success',
      durationMs: Date.now() - searchStartedAt,
      data: {
        query: question,
        hits: hits.map(hit => ({
          path: hit.path,
          title: hit.title,
          heading: hit.heading || '',
          score: Math.round(hit.score * 100) / 100,
          snippet: hit.snippet.slice(0, 240),
        })),
      },
    });
    lines.push('【知识库命中】');
    for (const hit of hits) {
      const location = hit.heading ? `${hit.path}#${hit.heading}` : hit.path;
      lines.push(`- ${hit.title}（${location}）：${hit.snippet}`);
    }
  }
  const skills = getSkillPack();
  if (skills && skills.skills.length) {
    emitTrace(onTrace, {
      id: `trace-plan-skills-${Date.now()}`,
      phase: 'planning',
      kind: 'skill_catalog',
      title: '规划匹配技能',
      detail: `${skills.skills.length} 个可用技能`,
      status: 'success',
      data: {
        skills: skills.skills.slice(0, 8).map(skill => ({
          name: skill.name,
          description: skill.description,
        })),
      },
    });
    lines.push(skills.catalogText);
  }
  return lines.join('\n').slice(0, 5000);
}

function buildPlannerMessages(
  cfg: ResolvedConfig,
  candidates: TableCandidate[],
  request: PlanRequest,
  onTrace?: TraceSink,
): BaseMessage[] {
  const candidateBlock = formatTableCandidates(candidates);
  const knowledge = knowledgeBlock(request.question, onTrace);
  const completed = (request.completed || [])
    .map((item, index) => `- 第 ${index + 1} 步 ${item.title}：${item.summary}`)
    .join('\n');
  const parts = [
    `用户问题：${request.question}`,
    request.history ? `【最近对话】\n${request.history}` : '',
    pageContextBlock(request.pageContext),
    candidateBlock,
    knowledge,
    completed
      ? `【已完成步骤】\n${completed}\n只规划尚未完成的步骤，不要重复已完成的工作。`
      : '',
    request.feedback ? `【反思反馈】\n${request.feedback}` : '',
    `请输出 JSON，不要输出其他内容。最多 ${cfg.maxPlanSteps} 步。`,
  ].filter(Boolean);
  return [new SystemMessage(PLANNER_SYSTEM_PROMPT), new HumanMessage(parts.join('\n\n'))];
}

export async function planWithModel(
  cfg: ResolvedConfig,
  budget: TurnBudget,
  candidates: TableCandidate[],
  request: PlanRequest,
  onTrace?: TraceSink,
): Promise<Plan> {
  const model = createChatModel(cfg, { maxTokens: 2000 });
  checkBudget(budget);
  const response = await model.invoke(buildPlannerMessages(cfg, candidates, request, onTrace));
  recordUsage(response.usage_metadata, response.response_metadata, budget, cfg.tokenPrices);
  const draft: PlanDraft | null = parsePlanDraft(extractText(response.content));
  if (!draft) {
    return fallbackPlan(request.question, { maxSteps: cfg.maxPlanSteps });
  }
  return normalizePlan(draft, {
    maxSteps: cfg.maxPlanSteps,
    fallbackQuestion: request.question,
  });
}

function buildStepMessages(
  messages: BaseMessage[],
  plan: Plan,
  step: PlanStep,
  pageContext: PageContextResolution | null | undefined,
  feedback: string,
  completed: StepResult[],
): BaseMessage[] {
  const completedLines: string[] = [];
  let completedBudget = 8000;
  for (const item of completed) {
    const head = `- ${item.step.title}：${item.step.summary || '已完成'}`;
    completedLines.push(head);
    completedBudget -= head.length;
    for (const tool of item.observation.tools) {
      if (completedBudget <= 0) break;
      if (!tool.output) continue;
      const text = tool.output.slice(0, Math.min(2000, completedBudget));
      completedBudget -= text.length;
      completedLines.push(`  [${tool.name}] ${text}`);
    }
    if (completedBudget <= 0) {
      completedLines.push('  （更早结果已省略，需要时请重新查询）');
      break;
    }
  }
  const completedText = completedLines.length ? completedLines.join('\n') : '暂无';
  const tableText = step.tables.length ? step.tables.join(', ') : '见候选表';
  const knowledgeText = step.knowledgeRefs.length
    ? step.knowledgeRefs.join(', ')
    : '按需使用 search_knowledge / read_knowledge';
  const stepContext = `【本轮执行计划】目标：${plan.goal}
【当前步骤】第 ${step.index + 1}/${plan.steps.length} 步：${step.title}
意图：${step.intent}
涉及表：${tableText}
知识依据：${knowledgeText}
${pageContextBlock(pageContext)}
成功标准：${step.successCriteria || '拿到可回答的数据'}
【已完成步骤】
${completedText}
${feedback ? `【上一轮反思反馈】\n${feedback}\n` : ''}
【执行约束】
- 只执行当前步骤，不要输出计划、总结或“我来查询”等旁白。
- 需要数据时调用工具；不要臆造表名、列名或数值。
- 不要提前生成报告或可视化，除非当前步骤就是“生成报告”。
- 当前步骤完成后直接结束，不要继续做后续步骤。`;

  const recent = messages.slice(-12);
  return [new SystemMessage(stepContext), ...recent];
}

function parseSqlResults(
  name: string,
  input: Record<string, unknown> | undefined,
  output: string,
): { observations: SqlObservation[]; errors: string[]; budgetBlocked: boolean } {
  if (name !== 'run_sql' && name !== 'run_saved_query') {
    return { observations: [], errors: [], budgetBlocked: false };
  }
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(output) as Record<string, unknown>;
  } catch {
    return { observations: [], errors: [], budgetBlocked: false };
  }
  if (!parsed) return { observations: [], errors: [], budgetBlocked: false };

  const errors: string[] = [];
  const budgetBlocked =
    parsed.budget != null || /已达上限|成本上限|查询次数已达/.test(String(parsed.error || ''));
  const inputQueries = Array.isArray(input?.queries)
    ? input.queries.map(item => String(item || '')).filter(Boolean)
    : input?.sql
      ? [String(input.sql)]
      : [];
  const sqlAt = (index: number) =>
    inputQueries[index] || String(input?.key || `${name}-${index}`);

  if (Array.isArray(parsed.results)) {
    const observations = (parsed.results as Array<Record<string, unknown>>).map((item, index) => {
      const error = typeof item.error === 'string' ? item.error : undefined;
      if (error) errors.push(error);
      return {
        hash: hashSql(sqlAt(index)),
        sql: sqlAt(index),
        ok: item.success !== false && !error,
        rowCount: Number(item.rowCount) || 0,
        truncated: item.truncated === true,
        error,
      };
    });
    return { observations, errors, budgetBlocked };
  }

  const error = typeof parsed.error === 'string' ? parsed.error : undefined;
  if (error && !budgetBlocked) errors.push(error);
  return {
    observations: [
      {
        hash: hashSql(sqlAt(0)),
        sql: sqlAt(0),
        ok: parsed.success !== false && !error,
        rowCount: Number(parsed.rowCount) || 0,
        truncated: parsed.truncated === true,
        error,
      },
    ],
    errors,
    budgetBlocked,
  };
}

function isVisualTool(name: string): boolean {
  return name === 'render_report' || name === 'render_html_report' || name === 'render_chart';
}

export async function executeStep(options: {
  cfg: ResolvedConfig;
  agent: ReturnType<typeof getRuntime>;
  messages: BaseMessage[];
  plan: Plan;
  step: PlanStep;
  pageContext?: PageContextResolution | null;
  feedback: string;
  completed: StepResult[];
  bridge: TurnBridgeLike;
  controller: AbortController;
  stepTimeoutMs?: number;
  onTrace?: TraceSink;
}): Promise<StepObservation> {
  const { cfg, agent, messages, plan, step, feedback, completed, bridge, controller } = options;
  const observation: StepObservation = {
    tools: [],
    sql: [],
    aiText: '',
    visual: false,
    clarify: false,
    errorMessages: [],
    budgetBlocked: false,
    timedOut: false,
  };
  emitTrace(options.onTrace, {
    id: `trace-step-context-${step.id}-${Date.now()}`,
    stepId: step.id,
    phase: 'step',
    kind: 'step_context',
    title: '步骤准备',
    detail: [
      step.tables.length ? `表：${step.tables.join('、')}` : '表：按需检索',
      step.knowledgeRefs.length
        ? `知识：${step.knowledgeRefs.map(ref => ref.split('/').pop() || ref).join('、')}`
        : '知识：按需检索',
    ].join('；'),
    status: 'success',
    data: {
      tables: step.tables,
      knowledgeRefs: step.knowledgeRefs,
      successCriteria: step.successCriteria,
      pageTable: options.pageContext?.primaryTable || '',
    },
  });
  const toolStarts = new Map<string, { name: string; input?: Record<string, unknown> }>();
  let lastSql: SqlObservation[] = [];
  let lastSqlErrors: string[] = [];
  let lastSqlBudget = false;
  const nonSqlErrors: string[] = [];
  const stepMessages = buildStepMessages(
    messages,
    plan,
    step,
    options.pageContext,
    feedback,
    completed,
  );
  let stepTimedOut = false;
  const stepController = new AbortController();
  const onTurnAbort = () => stepController.abort();
  controller.signal.addEventListener('abort', onTurnAbort, { once: true });
  const stepTimer =
    options.stepTimeoutMs && options.stepTimeoutMs > 0
      ? setTimeout(() => {
          stepTimedOut = true;
          stepController.abort();
        }, options.stepTimeoutMs)
      : null;
  const streamConfig: Record<string, unknown> = {
    version: 'v2',
    recursionLimit: cfg.recursionLimit,
    signal: stepController.signal,
  };

  try {
    const stream = await agent.streamEvents({ messages: stepMessages }, streamConfig, {
      excludeTags: ['nostream'],
    });

    for await (const event of stream) {
      const item = event as StreamEventLike;
      bridge.handle(item, { emitTokens: false, stepId: step.id });

      if (item.event === 'on_tool_start') {
        const name = item.name || 'tool';
        const runId = item.run_id || `tool-${Date.now()}-${toolStarts.size}`;
        const input = toRecord(item.data?.input);
        toolStarts.set(runId, { name, input: input || undefined });
      } else if (item.event === 'on_tool_end') {
        const name = item.name || 'tool';
        const runId = item.run_id || `tool-${Date.now()}-${toolStarts.size}`;
        const output = extractText(item.data?.output);
        const started = toolStarts.get(runId);
        const tool: ToolObservation = {
          name,
          input: started?.input,
          output,
          ok: true,
        };
        observation.tools.push(tool);
        if (isVisualTool(name)) {
          const parsed = (() => {
            try {
              return JSON.parse(output) as Record<string, unknown>;
            } catch {
              return null;
            }
          })();
          if (parsed && parsed.success === false) {
            nonSqlErrors.push(
              typeof parsed.error === 'string' ? parsed.error : '可视化生成失败',
            );
          } else {
            observation.visual = true;
          }
        }
        if (name === 'run_sql' || name === 'run_saved_query') {
          const sql = parseSqlResults(name, started?.input, output);
          lastSql = sql.observations;
          lastSqlErrors = sql.errors;
          lastSqlBudget = sql.budgetBlocked;
        }
      } else if (item.event === 'on_tool_error') {
        const name = item.name || 'tool';
        const raw = item.data?.error;
        const message =
          raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '工具执行失败';
        observation.tools.push({ name, ok: false });
        if (name === 'run_sql' || name === 'run_saved_query') lastSqlErrors = [message];
        else nonSqlErrors.push(message);
      } else if (item.event === 'on_chat_model_end') {
        const output = item.data?.output;
        if (AIMessage.isInstance(output)) {
          const text = extractText(output.content).trim();
          const toolCalls = Array.isArray(output.tool_calls) ? output.tool_calls : [];
          if (text && !toolCalls.length) observation.aiText = text;
        }
      }

      if (bridge.shouldStop()) {
        break;
      }
    }
  } catch (error) {
    if (!stepTimedOut) throw error;
  } finally {
    if (stepTimer) clearTimeout(stepTimer);
    controller.signal.removeEventListener('abort', onTurnAbort);
  }

  observation.sql = lastSql;
  observation.errorMessages = [...nonSqlErrors, ...lastSqlErrors];
  observation.budgetBlocked = lastSqlBudget;
  observation.timedOut = stepTimedOut;
  observation.clarify = bridge.clarifyPending();
  return observation;
}

export function buildResultSummary(stepResults: StepResult[], plan: Plan): string {
  const lines = [`【执行计划】${plan.goal}`];
  let budget = 18000;
  for (const item of stepResults) {
    const { step, observation } = item;
    lines.push(`\n### ${step.index + 1}. ${step.title}（${step.status}）`);
    if (step.summary) lines.push(step.summary);
    if (observation.aiText) {
      const text = observation.aiText.slice(0, 1500);
      lines.push(text);
      budget -= text.length;
    }
    for (const tool of observation.tools) {
      if (budget <= 0) break;
      if (tool.name === 'run_sql' || tool.name === 'run_saved_query') {
        const input = tool.input || {};
        const sql =
          typeof input.sql === 'string'
            ? input.sql
            : Array.isArray(input.queries)
              ? input.queries.map(item => String(item || '')).join(';\n')
              : typeof input.key === 'string'
                ? `saved_query:${input.key}`
                : '';
        if (sql) {
          const text = `[SQL] ${sql}`.slice(0, Math.min(1600, budget));
          budget -= text.length;
          lines.push(text);
        }
      }
      if (!tool.output) continue;
      const output = tool.output.slice(0, Math.min(4000, budget));
      budget -= output.length;
      lines.push(`[${tool.name}] ${output}`);
    }
    if (budget <= 0) {
      lines.push('（后续结果已省略）');
      break;
    }
  }
  lines.push(
    '\n请基于以上真实执行结果回答用户问题。不要编造数据；数据缺失或口径待确认时明确说明。',
  );
  return lines.join('\n');
}

export async function produceAnswer(options: {
  cfg: ResolvedConfig;
  budget: TurnBudget;
  question: string;
  stepResults: StepResult[];
  plan: Plan;
  send: (payload: unknown) => void;
  controller: AbortController;
  fallbackText: string;
  warnings?: string[];
}): Promise<string> {
  const { cfg, budget, question, stepResults, plan, send, controller, fallbackText } = options;
  const model = createChatModel(cfg);
  checkBudget(budget);
  const messages = [
    new SystemMessage(REPORTER_SYSTEM_PROMPT),
    new SystemMessage(buildResultSummary(stepResults, plan)),
    ...(options.warnings && options.warnings.length
      ? [
          new SystemMessage(
            `【最终数据校验提示】\n${options.warnings
              .slice(0, 8)
              .map(item => `- ${item}`)
              .join('\n')}\n回答时必须如实说明这些缺口或不确定性，不要用推测填补。`,
          ),
        ]
      : []),
    new HumanMessage(question),
  ];

  const answerTraceId = `trace-answer-${Date.now()}`;
  const answerStartedAt = Date.now();
  send({
    type: 'trace',
    id: answerTraceId,
    phase: 'answer',
    kind: 'answer',
    title: '汇总回答',
    detail: '基于执行结果生成最终回答',
    status: 'running',
  });
  const finishAnswerTrace = (status: 'success' | 'error', detail: string) => {
    send({
      type: 'trace',
      id: answerTraceId,
      phase: 'answer',
      kind: 'answer',
      title: '汇总回答',
      detail,
      status,
      durationMs: Date.now() - answerStartedAt,
    });
  };

  let text = '';
  let usageMetadata: unknown;
  let responseMetadata: unknown;
  try {
    const stream = await model.stream(messages, { signal: controller.signal });
    for await (const chunk of stream) {
      const delta = extractText(chunk.content);
      if (delta) {
        text += delta;
        send({ type: 'token', content: delta });
      }
      if (chunk.usage_metadata) usageMetadata = chunk.usage_metadata;
      if (chunk.response_metadata) responseMetadata = chunk.response_metadata;
    }
  } catch (error) {
    if (error instanceof BudgetExceededError) throw error;
  }

  if (text.trim()) {
    const usage = extractUsage(usageMetadata, responseMetadata);
    if (usage.inputTokens || usage.outputTokens) {
      budget.recordModelUsage(usage, cfg.tokenPrices);
    } else {
      const estimated = {
        inputTokens: Math.ceil(
          messages.reduce((sum, item) => sum + extractText(item.content).length, 0) / 4,
        ),
        outputTokens: Math.ceil(text.length / 4),
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      };
      budget.recordModelUsage(estimated, cfg.tokenPrices);
    }
    finishAnswerTrace('success', `回答 ${text.length} 字`);
    return text;
  }

  const fallback = fallbackText.trim();
  if (fallback) {
    send({ type: 'token', content: fallback });
    finishAnswerTrace('success', `使用回退回答 ${fallback.length} 字`);
    return fallback;
  }
  const message = '本轮没有取到可回答的数据，请缩小范围后重试。';
  send({ type: 'token', content: message });
  finishAnswerTrace('error', '没有取到可回答的数据');
  return message;
}
