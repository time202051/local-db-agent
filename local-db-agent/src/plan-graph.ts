import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ResolvedConfig } from './config.js';
import type { TurnBudget } from './budget.js';
import { BudgetExceededError } from './cost-guard.js';
import { getKnowledgePack } from './knowledge.js';
import { logLine } from './log.js';
import { createChatModel, getRuntime } from './runtime.js';
import { isTerminalVisualTool } from './tools.js';
import type { TableCandidate } from './schema-cache.js';
import type { PageContextResolution } from './page-context.js';
import {
  buildQuickPlan,
  evaluateStep,
  fallbackPlan,
  isLikelySimpleQuestion,
  isReportStep,
  normalizePlan,
  planEventPayload,
  summarizeObservation,
} from './plan.js';
import type {
  ExecutionMode,
  Plan,
  PlanStep,
  PlanStepStatus,
  StepObservation,
} from './plan.js';
import {
  buildResultSummary,
  checkBudget,
  executeStep,
  extractText,
  planWithModel,
  produceAnswer,
  recordUsage,
} from './plan-runner.js';
import type {
  PlanRunControl,
  RunPlanOptions,
  RunPlanResult,
  StepResult,
  TurnBridgeLike,
} from './plan-runner.js';

type PlanRoute = 'executor' | 'planner' | 'critic' | 'reporter' | 'wait' | 'finalize';

const PlanGraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  question: Annotation<string>({ reducer: (_, next) => next, default: () => '' }),
  candidates: Annotation<TableCandidate[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  pageContext: Annotation<PageContextResolution | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  reportMode: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
  executionMode: Annotation<ExecutionMode>({
    reducer: (_, next) => next,
    default: () => 'analyze',
  }),

  plan: Annotation<Plan | null>({ reducer: (_, next) => next, default: () => null }),
  stepResults: Annotation<StepResult[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  activeSteps: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  observations: Annotation<StepObservation[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  stepAttempts: Annotation<Record<string, number>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  stepFeedback: Annotation<Record<string, string>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  stepEmptyRetried: Annotation<Record<string, boolean>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  stepTruncatedRetried: Annotation<Record<string, boolean>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),

  route: Annotation<PlanRoute>({ reducer: (_, next) => next, default: () => 'executor' }),
  feedback: Annotation<string>({ reducer: (_, next) => next, default: () => '' }),

  replanCount: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  retryCount: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  checkedCount: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  criticRounds: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  criticVerdict: Annotation<string>({ reducer: (_, next) => next, default: () => '' }),
  criticIssues: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  lastFailure: Annotation<string>({ reducer: (_, next) => next, default: () => '' }),

  seenSql: Annotation<string[]>({
    reducer: (left, right) => Array.from(new Set([...left, ...right])),
    default: () => [],
  }),
  stopped: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
  clarified: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
  timedOutSteps: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
});

type GraphState = typeof PlanGraphState.State;
type GraphUpdate = Partial<GraphState>;

interface PlanNodeRuntime {
  cfg: ResolvedConfig;
  budget: TurnBudget;
  send: (payload: unknown) => void;
  bridge: TurnBridgeLike;
  controller: AbortController;
  agent: ReturnType<typeof getRuntime>;
  turnStartedAt: number;
  control: PlanRunControl;
}

interface CriticResult {
  verdict: 'pass' | 'revise' | 'replan';
  issues: string[];
  feedback: string;
  confidence: number;
}

const CRITIC_SYSTEM_PROMPT = `你是数据库分析结果的数据准确性评审员。你只评审，不回答用户。

检查重点：
1. 执行结果是否真正回答了用户问题，是否缺少关键维度或时间范围。
2. 关键数字是否能在 SQL 结果中找到，是否有编造、单位错误或口径不一致。
3. 过滤条件、时间范围、状态码、表关联是否符合知识库/表结构。
4. 空结果、截断、分页、重复行是否会导致结论错误。
5. 分项与合计、不同步骤之间是否矛盾。

输出 JSON，不要输出其他内容：
{
  "verdict": "pass" | "revise" | "replan",
  "issues": ["具体问题"],
  "feedback": "给执行者的具体补充/修正建议，必须指出补查什么、修正什么条件",
  "confidence": 0.0
}

规则：
- 只有明确的数据问题才输出 revise/replan；不确定时输出 pass。
- feedback 要具体到表、字段、时间范围或状态码，不要泛泛而谈。
- 不要因为数据少而要求无关的扩展分析。
- 只围绕用户问题本身检查，禁止扩大任务范围。
- 禁止要求“所有表/每张表/全库/逐表说明/补全全部文档/覆盖所有字段”这类大规模工作；遇到这类问题直接 pass，并在 issues 里提示回答中说明限制。
- revise 的 feedback 最多要求 1~3 个具体、可直接执行的补充查询；不要给出无法在单轮内完成的清单。`;

function runtimeOf(config: RunnableConfig): PlanNodeRuntime {
  return (config.configurable || {}) as unknown as PlanNodeRuntime;
}

function buildHistory(messages: BaseMessage[]): string {
  return messages
    .filter(item => {
      const type = item._getType();
      return type === 'human' || type === 'ai';
    })
    .slice(-6)
    .map(
      item =>
        `${item._getType() === 'human' ? '用户' : '助手'}：${extractText(item.content).slice(0, 300)}`,
    )
    .join('\n');
}

function patchStep(plan: Plan, stepId: string, patch: Partial<PlanStep>): Plan {
  return {
    ...plan,
    steps: plan.steps.map(step => (step.id === stepId ? { ...step, ...patch } : step)),
  };
}

function dependencySettled(plan: Plan, stepId: string): boolean {
  const dependency = plan.steps.find(step => step.id === stepId);
  if (!dependency) return true;
  return dependency.status !== 'pending' && dependency.status !== 'running';
}

function readySteps(plan: Plan): PlanStep[] {
  return plan.steps.filter(
    step =>
      step.status === 'pending' &&
      step.dependsOn.every(dep => dependencySettled(plan, dep)),
  );
}

function afterWaveRoute(state: GraphState, plan: Plan, cfg: ResolvedConfig): GraphUpdate {
  if (readySteps(plan).length) {
    return { route: 'executor', activeSteps: [], observations: [], feedback: '' };
  }
  if (state.executionMode === 'quick') {
    return { route: 'reporter', activeSteps: [], observations: [] };
  }
  if (cfg.enableAccuracyCritic && state.criticRounds <= cfg.maxCriticRounds) {
    return { route: 'critic', activeSteps: [], observations: [] };
  }
  return { route: 'reporter', activeSteps: [], observations: [] };
}

function parseCriticResult(text: string): CriticResult | null {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  const candidates = [
    raw,
    fenced && fenced[1] ? fenced[1] : '',
    first >= 0 && last > first ? raw.slice(first, last + 1) : '',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const verdict =
        parsed.verdict === 'revise' || parsed.verdict === 'replan' ? parsed.verdict : 'pass';
      const issues = Array.isArray(parsed.issues)
        ? parsed.issues.map(item => String(item || '').trim()).filter(Boolean).slice(0, 8)
        : [];
      return {
        verdict,
        issues,
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback.trim().slice(0, 1200) : '',
        confidence: Number(parsed.confidence) || 0,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function invokeCritic(options: {
  cfg: ResolvedConfig;
  budget: TurnBudget;
  question: string;
  stepResults: StepResult[];
  plan: Plan;
  send: (payload: unknown) => void;
}): Promise<CriticResult> {
  const { cfg, budget, question, stepResults, plan, send } = options;
  const model = createChatModel(cfg, { maxTokens: 1200 });
  checkBudget(budget);
  const evidence = buildResultSummary(stepResults, plan);
  const refs = Array.from(
    new Set(plan.steps.flatMap(step => step.knowledgeRefs).filter(Boolean)),
  ).slice(0, 10);
  const pack = getKnowledgePack();
  const searchStartedAt = Date.now();
  const hits = pack ? pack.search(question, 5) : [];
  if (hits.length) {
    send({
      type: 'trace',
      id: `trace-critic-knowledge-${searchStartedAt}`,
      phase: 'critic',
      kind: 'knowledge_search',
      title: '校验检索知识库',
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
          snippet: hit.snippet.slice(0, 240),
        })),
      },
    });
  }
  const knowledgeText = hits
    .map(hit => {
      const location = hit.heading ? `${hit.path}#${hit.heading}` : hit.path;
      return `- ${hit.title}（${location}）：${hit.snippet}`;
    })
    .join('\n')
    .slice(0, 4000);
  try {
    const response = await model.invoke([
      new SystemMessage(CRITIC_SYSTEM_PROMPT),
      new SystemMessage(
        `【用户问题】\n${question}\n\n【执行结果】\n${evidence}` +
          (refs.length ? `\n\n【知识依据】\n${refs.join('\n')}` : '') +
          (knowledgeText ? `\n\n【知识库命中】\n${knowledgeText}` : ''),
      ),
      new HumanMessage('请评审上述执行结果是否足以准确回答用户问题，并输出 JSON。'),
    ]);
    recordUsage(response.usage_metadata, response.response_metadata, budget, cfg.tokenPrices);
    return (
      parseCriticResult(extractText(response.content)) || {
        verdict: 'pass',
        issues: [],
        feedback: '',
        confidence: 0,
      }
    );
  } catch (error) {
    if (error instanceof BudgetExceededError) throw error;
    logLine(`critic failed: ${error instanceof Error ? error.message : String(error)}`);
    return { verdict: 'pass', issues: [], feedback: '', confidence: 0 };
  }
}

async function plannerNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const { cfg, budget, send } = runtime;
  const history = buildHistory(state.messages);
  const planningStartedAt = Date.now();

  if (state.executionMode === 'quick' && state.plan) {
    send({ type: 'plan', ...planEventPayload(state.plan) });
    send({
      type: 'trace',
      id: `trace-mode-${planningStartedAt}`,
      phase: 'planning',
      kind: 'route',
      title: '快速问答模式',
      detail: '单步执行，保留 SQL/空结果/截断反思，不生成多步计划，不跑 critic',
      status: 'success',
    });
    return {
      plan: state.plan,
      activeSteps: [],
      observations: [],
      feedback: '',
      route: 'executor',
    };
  }

  if (state.plan) {
    const currentPlan = state.plan;
    const replanned = await planWithModel(
      cfg,
      budget,
      state.candidates,
      {
        question: state.question,
        history,
        pageContext: state.pageContext,
        feedback: state.feedback,
        completed: state.stepResults
          .filter(item => item.step.status === 'done')
          .map(item => ({ title: item.step.title, summary: item.step.summary || '' })),
      },
      send,
    );
    const idMap = new Map(
      replanned.steps.map((step, index) => [step.id, `${replanned.planId}-s${index + 1}`]),
    );
    const appended = replanned.steps.map((step, index) => ({
      ...step,
      id: `${replanned.planId}-s${index + 1}`,
      index: currentPlan.steps.length + index,
      dependsOn: step.dependsOn
        .map(dep => idMap.get(dep))
        .filter((dep): dep is string => Boolean(dep)),
      status: 'pending' as const,
    }));
    if (!appended.length) return { route: 'reporter' };
    const steps = [...currentPlan.steps, ...appended];
    if (
      state.reportMode &&
      !steps.some(step => step.status === 'pending' && isReportStep(step))
    ) {
      steps.push({
        id: `${replanned.planId}-report`,
        index: steps.length,
        title: '重新生成 HTML 报告',
        intent: '基于已完成和补充的数据重新生成完整 HTML 报告，逐项标注 coverage。',
        tables: [],
        knowledgeRefs: [],
        successCriteria: 'render_html_report 成功并返回 coverage',
        dependsOn: steps.map(step => step.id),
        status: 'pending',
      });
    }
    const plan: Plan = {
      ...currentPlan,
      revision: currentPlan.revision + 1,
      steps,
    };
    send({ type: 'replan', ...planEventPayload(plan), reason: state.lastFailure || state.feedback });
    send({
      type: 'trace',
      id: `trace-replan-${planningStartedAt}`,
      phase: 'planning',
      kind: 'planner',
      title: '重新规划',
      detail: `新增 ${appended.length} 个目标，共 ${plan.steps.length} 个`,
      status: 'success',
      durationMs: Date.now() - planningStartedAt,
      data: { goal: plan.goal, steps: plan.steps.map(step => step.title) },
    });
    logLine(
      `replan count=${state.replanCount} added=${appended.length} ` +
        `reason=${(state.lastFailure || state.feedback).slice(0, 120)}`,
    );
    return {
      plan,
      activeSteps: [],
      observations: [],
      feedback: '',
      route: 'executor',
    };
  }

  let plan: Plan;
  if (!state.reportMode && isLikelySimpleQuestion(state.question)) {
    plan = fallbackPlan(state.question, { maxSteps: cfg.maxPlanSteps });
  } else {
    plan = await planWithModel(
      cfg,
      budget,
      state.candidates,
      {
        question: state.question,
        history,
        pageContext: state.pageContext,
      },
      send,
    );
    if (state.reportMode) {
      plan = normalizePlan(
        {
          goal: plan.goal,
          simple: false,
          steps: plan.steps.map(step => ({
            title: step.title,
            intent: step.intent,
            tables: step.tables,
            knowledgeRefs: step.knowledgeRefs,
            successCriteria: step.successCriteria,
          })),
        },
        { reportMode: true, maxSteps: cfg.maxPlanSteps, fallbackQuestion: state.question },
      );
    }
  }
  send({ type: 'plan', ...planEventPayload(plan) });
  send({
    type: 'trace',
    id: `trace-plan-result-${planningStartedAt}`,
    phase: 'planning',
    kind: 'planner',
    title: '制定执行计划',
    detail: `拆成 ${plan.steps.length} 个目标：${plan.steps.map(step => step.title).join(' → ')}`,
    status: 'success',
    durationMs: Date.now() - planningStartedAt,
    data: { goal: plan.goal, steps: plan.steps.map(step => step.title) },
  });
  logLine(`plan steps=${plan.steps.length} goal=${plan.goal.slice(0, 60)}`);
  return {
    plan,
    activeSteps: [],
    observations: [],
    feedback: '',
    route: 'executor',
  };
}

async function executorNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const { cfg, bridge, controller, send, agent } = runtime;
  const plan = state.plan;
  if (!plan) return { route: 'finalize' };
  if (
    !state.activeSteps.length &&
    Date.now() >= runtime.control.deadline &&
    readySteps(plan).length > 0
  ) {
    return { route: 'wait' };
  }

  const retryIds = state.activeSteps.filter(
    id => plan.steps.find(step => step.id === id)?.status === 'running',
  );
  const activeIds = retryIds.length
    ? retryIds
    : readySteps(plan)
        .slice(0, cfg.maxParallelSteps)
        .map(step => step.id);
  if (!activeIds.length) return afterWaveRoute(state, plan, cfg);

  let runningPlan = plan;
  for (const id of activeIds) {
    const step = runningPlan.steps.find(item => item.id === id);
    if (!step || step.status === 'running') continue;
    const startedAt = Date.now();
    runningPlan = patchStep(runningPlan, id, {
      status: 'running',
      startedAt,
      endedAt: undefined,
      durationMs: 0,
    });
    send({
      type: 'step_start',
      stepId: step.id,
      index: step.index,
      title: step.title,
      intent: step.intent,
      startedAt,
    });
    logLine(
      `step start ${step.index + 1}/${runningPlan.steps.length} ` + step.title.slice(0, 40),
    );
  }

  const results = await Promise.all(
    activeIds.map(async id => {
      const step = runningPlan.steps.find(item => item.id === id);
      if (!step) return null;
      const stepAgent =
        state.reportMode && !isReportStep(step) ? getRuntime(cfg, false) : agent;
      const observation = await executeStep({
        cfg,
        agent: stepAgent,
        messages: state.messages,
        plan: runningPlan,
        step,
        pageContext: state.pageContext,
        feedback: state.stepFeedback[id] || '',
        completed: state.stepResults,
        bridge,
        controller,
        stepTimeoutMs: cfg.stepTimeoutMs,
        onTrace: send,
      });
      return { id, observation };
    }),
  );

  const valid = results.filter(
    (item): item is { id: string; observation: StepObservation } => Boolean(item),
  );
  if (controller.signal.aborted) {
    return {
      plan: runningPlan,
      activeSteps: valid.map(item => item.id),
      observations: valid.map(item => item.observation),
      stopped: true,
      route: 'finalize',
    };
  }
  return {
    plan: runningPlan,
    activeSteps: valid.map(item => item.id),
    observations: valid.map(item => item.observation),
  };
}

async function reflectorNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const { cfg, send, bridge, controller } = runtime;
  const plan = state.plan;
  if (!plan) return { route: 'finalize' };
  const activeIds = state.activeSteps;
  const observations = state.observations;
  if (!activeIds.length || activeIds.length !== observations.length) {
    return afterWaveRoute(state, plan, cfg);
  }

  let nextPlan = plan;
  let checkedCount = state.checkedCount;
  let retryCount = state.retryCount;
  const replanCount = state.replanCount;
  let lastFailure = state.lastFailure;
  let clarified = false;
  let stopped = false;
  let replanRequested = false;
  let replanFeedback = '';
  const completedResults: StepResult[] = [];
  const seen = new Set(state.seenSql);
  const retryIds: string[] = [];
  const timedOutIds: string[] = [];
  const stepAttempts = { ...state.stepAttempts };
  const stepFeedback = { ...state.stepFeedback };
  const stepEmptyRetried = { ...state.stepEmptyRetried };
  const stepTruncatedRetried = { ...state.stepTruncatedRetried };

  for (let i = 0; i < activeIds.length; i++) {
    const stepId = activeIds[i];
    const observation = observations[i];
    const step = nextPlan.steps.find(item => item.id === stepId);
    if (!step) continue;

    if (observation.clarify) {
      const endedAt = Date.now();
      nextPlan = patchStep(nextPlan, stepId, {
        status: 'waiting',
        endedAt,
        durationMs: endedAt - (step.startedAt || endedAt),
      });
      send({
        type: 'reflect',
        stepId,
        verdict: 'finish',
        reason: '等待用户补充信息',
        issues: [],
        round: (stepAttempts[stepId] || 0) + 1,
      });
      send({
        type: 'step_end',
        stepId,
        status: 'waiting',
        durationMs: nextPlan.steps.find(item => item.id === stepId)?.durationMs,
        summary: '等待用户补充信息',
      });
      logLine(`step end ${step.index + 1}/${plan.steps.length} status=waiting`);
      clarified = true;
      continue;
    }

    if (observation.visual) {
      const endedAt = Date.now();
      nextPlan = patchStep(nextPlan, stepId, {
        status: 'done',
        endedAt,
        durationMs: endedAt - (step.startedAt || endedAt),
        summary: summarizeObservation(observation),
      });
      const doneStep = nextPlan.steps.find(item => item.id === stepId);
      if (doneStep) completedResults.push({ step: doneStep, observation });
      observation.sql.forEach(item => seen.add(item.hash));
      send({
        type: 'reflect',
        stepId,
        verdict: 'finish',
        reason: '可视化结果已生成',
        issues: [],
        round: (stepAttempts[stepId] || 0) + 1,
      });
      send({
        type: 'step_end',
        stepId,
        status: 'done',
        durationMs: doneStep?.durationMs,
        summary: doneStep?.summary,
      });
      logLine(`step end ${step.index + 1}/${plan.steps.length} status=done visual`);

      // 模型可能在数据步骤里提前调用了 render_html_report。此时报告已经出图，
      // 渲染早停后剩余 pending 步骤不会再执行，必须全部标记完成，
      // 否则 completed<total，界面会一直显示 1/2、状态 partial。
      // 以“终版报告工具是否真的渲染成功”为准，不再依赖步骤标题是否像报告步骤；
      // render_chart / render_report 等非终版图表不算，后续步骤仍正常执行。
      const terminalRendered = observation.tools.some(item =>
        isTerminalVisualTool(item.name),
      );
      if (terminalRendered) {
        const reusedSteps = nextPlan.steps.filter(
          item => item.id !== stepId && item.status === 'pending',
        );
        for (const reused of reusedSteps) {
          const summary = '报告已在上一步生成，本步骤复用，不重复渲染';
          nextPlan = patchStep(nextPlan, reused.id, {
            status: 'done',
            endedAt,
            durationMs: 0,
            summary,
          });
          const reusedStep = nextPlan.steps.find(item => item.id === reused.id);
          if (reusedStep) {
            completedResults.push({
              step: reusedStep,
              observation: {
                ...observation,
                tools: [],
                sql: [],
                aiText: '',
                visual: true,
                clarify: false,
                errorMessages: [],
                budgetBlocked: false,
                timedOut: false,
              },
            });
          }
          send({
            type: 'trace',
            id: `trace-report-reuse-${reused.id}`,
            stepId: reused.id,
            phase: 'step',
            kind: 'report',
            title: '复用 HTML 报告',
            detail: '上一步已生成 HTML 报告，本步骤不重复渲染',
            status: 'success',
            durationMs: 0,
          });
          send({
            type: 'step_end',
            stepId: reused.id,
            status: 'done',
            durationMs: 0,
            summary,
          });
          logLine(`step end ${reused.index + 1}/${plan.steps.length} status=done reused-report`);
        }
      } else if (!isReportStep(step)) {
        // 非终版可视化（render_report / render_chart）：维持旧语义，
        // 只把“像报告步骤”的 pending 步骤标成复用完成。
        const reusedSteps = nextPlan.steps.filter(
          item => item.id !== stepId && item.status === 'pending' && isReportStep(item),
        );
        for (const reused of reusedSteps) {
          const summary = '报告已在上一步生成，本步骤复用，不重复渲染';
          nextPlan = patchStep(nextPlan, reused.id, {
            status: 'done',
            endedAt,
            durationMs: 0,
            summary,
          });
          const reusedStep = nextPlan.steps.find(item => item.id === reused.id);
          if (reusedStep) {
            completedResults.push({
              step: reusedStep,
              observation: {
                ...observation,
                tools: [],
                sql: [],
                aiText: '',
                visual: true,
                clarify: false,
                errorMessages: [],
                budgetBlocked: false,
                timedOut: false,
              },
            });
          }
          send({
            type: 'trace',
            id: `trace-report-reuse-${reused.id}`,
            stepId: reused.id,
            phase: 'step',
            kind: 'report',
            title: '复用 HTML 报告',
            detail: '上一步已生成 HTML 报告，本步骤不重复渲染',
            status: 'success',
            durationMs: 0,
          });
          send({
            type: 'step_end',
            stepId: reused.id,
            status: 'done',
            durationMs: 0,
            summary,
          });
          logLine(`step end ${reused.index + 1}/${plan.steps.length} status=done reused-report`);
        }
      }

      if (bridge.shouldStop()) stopped = true;
      continue;
    }

    if (controller.signal.aborted) {
      stopped = true;
      continue;
    }

    checkedCount += 1;
    const attempt = stepAttempts[stepId] || 0;
    const result = evaluateStep(observation, {
      attempt,
      maxRetries: cfg.maxRetriesPerStep,
      replanCount,
      maxReplans: state.executionMode === 'quick' ? 0 : cfg.maxReplans,
      seenSql: seen,
    });
    observation.sql.forEach(item => seen.add(item.hash));

    if (result.issues.length || result.verdict !== 'continue') {
      send({
        type: 'reflect',
        stepId,
        verdict: result.verdict,
        reason: result.reason,
        issues: result.issues,
        round: attempt + 1,
      });
      logLine(
        `reflect step=${step.index + 1} verdict=${result.verdict} ` +
          `reason=${result.reason.slice(0, 140)}`,
      );
    } else {
      send({
        type: 'reflect',
        stepId,
        verdict: 'continue',
        reason: '检查通过',
        issues: [],
        round: attempt + 1,
      });
      logLine(`reflect step=${step.index + 1} verdict=continue reason=检查通过`);
    }

    if (observation.timedOut || result.verdict === 'abort') {
      const endedAt = Date.now();
      nextPlan = patchStep(nextPlan, stepId, {
        status: 'error',
        endedAt,
        durationMs: endedAt - (step.startedAt || endedAt),
        summary: '步骤执行超时，等待用户决定是否继续',
      });
      const errorStep = nextPlan.steps.find(item => item.id === stepId);
      if (errorStep) completedResults.push({ step: errorStep, observation });
      send({
        type: 'step_end',
        stepId,
        status: 'error',
        durationMs: errorStep?.durationMs,
        summary: '步骤执行超时，等待用户决定是否继续',
      });
      logLine(`step end ${step.index + 1}/${plan.steps.length} status=timeout`);
      timedOutIds.push(stepId);
      continue;
    }

    if (result.verdict === 'retry' && attempt < cfg.maxRetriesPerStep) {
      retryIds.push(stepId);
      retryCount += 1;
      stepAttempts[stepId] = attempt + 1;
      stepFeedback[stepId] = result.feedback;
      stepEmptyRetried[stepId] =
        stepEmptyRetried[stepId] === true ||
        observation.sql.some(item => item.rowCount === 0);
      stepTruncatedRetried[stepId] =
        stepTruncatedRetried[stepId] === true ||
        observation.sql.some(item => item.truncated);
      continue;
    }

    if (result.verdict === 'replan' && replanCount < cfg.maxReplans) {
      const endedAt = Date.now();
      nextPlan = patchStep(nextPlan, stepId, {
        status: 'error',
        endedAt,
        durationMs: endedAt - (step.startedAt || endedAt),
        summary: result.reason,
      });
      const errorStep = nextPlan.steps.find(item => item.id === stepId);
      if (errorStep) completedResults.push({ step: errorStep, observation });
      send({
        type: 'step_end',
        stepId,
        status: 'error',
        durationMs: errorStep?.durationMs,
        summary: result.reason,
      });
      logLine(`step end ${step.index + 1}/${plan.steps.length} status=error`);
      replanRequested = true;
      replanFeedback = result.feedback || result.reason;
      lastFailure = result.reason;
      continue;
    }

    const status: PlanStepStatus = observation.errorMessages.length ? 'error' : 'done';
    const endedAt = Date.now();
    nextPlan = patchStep(nextPlan, stepId, {
      status,
      endedAt,
      durationMs: endedAt - (step.startedAt || endedAt),
      summary: summarizeObservation(observation),
    });
    const doneStep = nextPlan.steps.find(item => item.id === stepId);
    if (doneStep) completedResults.push({ step: doneStep, observation });
    send({
      type: 'step_end',
      stepId,
      status,
      durationMs: doneStep?.durationMs,
      summary: doneStep?.summary,
    });
    logLine(`step end ${step.index + 1}/${plan.steps.length} status=${status}`);
  }

  if (clarified || stopped || replanRequested) {
    for (const step of nextPlan.steps) {
      if (step.status !== 'running') continue;
      const endedAt = Date.now();
      const status = replanRequested ? 'error' : 'skipped';
      nextPlan = patchStep(nextPlan, step.id, {
        status,
        endedAt,
        durationMs: endedAt - (step.startedAt || endedAt),
        summary: replanRequested ? '已触发重新规划' : '本轮已暂停',
      });
      send({
        type: 'step_end',
        stepId: step.id,
        status,
        durationMs: nextPlan.steps.find(item => item.id === step.id)?.durationMs,
        summary: replanRequested ? '已触发重新规划' : '本轮已暂停',
      });
    }
  }

  if (timedOutIds.length) {
    for (const id of retryIds) {
      nextPlan = patchStep(nextPlan, id, {
        status: 'pending',
        startedAt: undefined,
        endedAt: undefined,
        durationMs: 0,
      });
    }
  }

  const update: GraphUpdate = {
    plan: nextPlan,
    stepResults: completedResults,
    checkedCount,
    retryCount,
    replanCount,
    lastFailure,
    stepAttempts,
    stepFeedback,
    stepEmptyRetried,
    stepTruncatedRetried,
    seenSql: Array.from(seen),
    activeSteps: [],
    observations: [],
    clarified,
    stopped,
    ...(timedOutIds.length
      ? { timedOutSteps: [...state.timedOutSteps, ...timedOutIds] }
      : {}),
  };

  if (clarified) return { ...update, route: 'finalize' };
  if (stopped) return { ...update, route: 'finalize' };
  if (timedOutIds.length) {
    return { ...update, activeSteps: [], route: 'wait' };
  }
  if (retryIds.length && !replanRequested) {
    return { ...update, activeSteps: retryIds, route: 'executor' };
  }
  if (replanRequested && replanCount < cfg.maxReplans) {
    return {
      ...update,
      replanCount: replanCount + 1,
      feedback: replanFeedback,
      route: 'planner',
    };
  }
  return { ...update, ...afterWaveRoute(state, nextPlan, cfg) };
}

async function waitNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const { cfg, send, controller, control } = runtime;
  const plan = state.plan;
  if (!plan) return { route: 'finalize' };
  if (controller.signal.aborted) return { route: 'finalize', stopped: true };
  if (!readySteps(plan).length && !state.timedOutSteps.length) {
    return afterWaveRoute(state, plan, cfg);
  }

  send({
    type: 'ask_continue',
    runId: control.runId,
    elapsedMs: Date.now() - runtime.turnStartedAt,
    tokens: runtime.budget.usage,
    deadlineMs: control.deadline,
    canContinue: true,
  });
  const ok = await control.waitForContinue();
  if (!ok || controller.signal.aborted) {
    let nextPlan = plan;
    for (const step of nextPlan.steps) {
      if (step.status !== 'running') continue;
      const endedAt = Date.now();
      nextPlan = patchStep(nextPlan, step.id, {
        status: 'skipped',
        endedAt,
        durationMs: endedAt - (step.startedAt || endedAt),
        summary: '用户停止或等待超时',
      });
      send({
        type: 'step_end',
        stepId: step.id,
        status: 'skipped',
        durationMs: nextPlan.steps.find(item => item.id === step.id)?.durationMs,
        summary: '用户停止或等待超时',
      });
    }
    return { plan: nextPlan, route: 'finalize', stopped: true, timedOutSteps: [] };
  }

  control.extendDeadline();
  send({ type: 'status', message: '继续分析…' });
  let nextPlan = plan;
  for (const id of state.timedOutSteps) {
    nextPlan = patchStep(nextPlan, id, {
      status: 'pending',
      startedAt: undefined,
      endedAt: undefined,
      durationMs: 0,
      summary: '等待继续后重试',
    });
  }
  return {
    plan: nextPlan,
    timedOutSteps: [],
    activeSteps: [],
    observations: [],
    stepFeedback: Object.fromEntries(
      state.timedOutSteps.map(id => [
        id,
        '上一次执行超时，请缩小查询范围、减少返回行数、优先用聚合查询后再继续',
      ]),
    ),
    route: 'executor',
  };
}

async function criticNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const { cfg, budget, send } = runtime;
  const plan = state.plan;
  if (
    !plan ||
    state.executionMode === 'quick' ||
    !cfg.enableAccuracyCritic ||
    !state.stepResults.length
  ) {
    return { route: 'reporter' };
  }
  // 整轮没有任何 SQL 结果时没有数据可校验（闲聊、纯澄清、无数据的兜底轮），
  // 跑 critic 只会空转一次模型调用。
  if (!state.stepResults.some(item => item.observation.sql.length > 0)) {
    logLine('critic skipped: no sql observations this turn');
    return { route: 'reporter' };
  }

  send({ type: 'status', message: '正在进行最终数据校验…' });
  logLine(`critic start steps=${plan.steps.length}`);
  const criticStartedAt = Date.now();
  const critic = await invokeCritic({
    cfg,
    budget,
    question: state.question,
    stepResults: state.stepResults,
    plan,
    send,
  });
  send({
    type: 'trace',
    id: `trace-critic-result-${criticStartedAt}`,
    phase: 'critic',
    kind: 'critic',
    title: '数据校验',
    detail: critic.verdict === 'pass'
      ? '校验通过'
      : `发现 ${critic.issues.length} 个问题：${critic.issues.slice(0, 3).join('；')}`,
    status: critic.verdict === 'pass' ? 'success' : 'error',
    durationMs: Date.now() - criticStartedAt,
    data: {
      verdict: critic.verdict,
      issues: critic.issues,
      confidence: critic.confidence,
    },
  });

  if (!critic.issues.length || critic.verdict === 'pass') {
    logLine(`critic pass confidence=${critic.confidence}`);
    send({
      type: 'status',
      message:
        state.criticRounds > 0
          ? '数据校验通过，已修正相关问题'
          : '数据校验通过',
    });
    return { criticVerdict: 'pass', criticIssues: critic.issues, route: 'reporter' };
  }

  if (state.criticRounds < cfg.maxCriticRounds) {
    const criticText = `${critic.feedback} ${critic.issues.join(' ')}`;
    if (/所有表|每张表|全部表|全库|逐表|几百张|全部字段|所有字段/.test(criticText)) {
      logLine('critic revise downgraded: request too broad');
      return { criticVerdict: 'pass', criticIssues: critic.issues, route: 'reporter' };
    }
    if (critic.verdict === 'replan') {
      send({
        type: 'status',
        message: `校验发现 ${critic.issues.length} 个数据问题，正在重新规划…`,
      });
      logLine(`critic replan issues=${critic.issues.length}`);
      return {
        feedback: critic.feedback || critic.issues.join('；'),
        lastFailure: critic.issues.join('；'),
        criticRounds: state.criticRounds + 1,
        criticVerdict: 'replan',
        criticIssues: critic.issues,
        route: 'planner',
      };
    }

    const repairFeedback = (critic.feedback || critic.issues.join('；')).slice(0, 260);
    const repair: PlanStep = {
      id: `${plan.planId}-critic-${state.criticRounds + 1}`,
      index: plan.steps.length,
      title: '补充数据校验',
      intent: `针对最终校验发现的关键问题做 1~3 个补充查询并修正口径：${repairFeedback}`,
      tables: [],
      knowledgeRefs: [],
      successCriteria: '补充关键数据或修正口径后能回答用户问题，不做全库/逐表扩展',
      dependsOn: plan.steps.map(step => step.id),
      status: 'pending',
    };
    const repairPlan: Plan = {
      ...plan,
      revision: plan.revision + 1,
      steps: [...plan.steps, repair],
    };
    send({
      type: 'replan',
      ...planEventPayload(repairPlan),
      reason: critic.issues.join('；'),
    });
    send({
      type: 'status',
      message: `校验发现 ${critic.issues.length} 个数据问题，正在补充查询…`,
    });
    logLine(`critic revise issues=${critic.issues.length}`);
    return {
      plan: repairPlan,
      stepFeedback: {
        [repair.id]: critic.feedback || critic.issues.join('; '),
      },
      feedback: critic.feedback || critic.issues.join('；'),
      criticRounds: state.criticRounds + 1,
      criticVerdict: 'revise',
      criticIssues: critic.issues,
      route: 'executor',
    };
  }

  logLine(`critic issues remain (max rounds) issues=${critic.issues.length}`);
  return {
    criticVerdict: critic.verdict,
    criticIssues: critic.issues,
    route: 'reporter',
  };
}

async function reporterNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const { cfg, budget, send, controller } = runtime;
  const plan = state.plan;
  if (!plan || state.stopped || state.clarified) return { route: 'finalize' };
  const fallbackText = state.stepResults.length
    ? state.stepResults[state.stepResults.length - 1].observation.aiText
    : '';
  if (state.executionMode === 'quick' && fallbackText.trim()) {
    // 快速模式下单步模型已经给出答案，不再额外调用一次 reporter。
    send({ type: 'token', content: fallbackText.trim() });
    return { route: 'finalize' };
  }
  const lastResult =
    state.stepResults.length > 0 ? state.stepResults[state.stepResults.length - 1] : null;
  const plainSingleAnswer = Boolean(
    // analyze 模式的"单步、无可视化、校验无异议"轮：executor 已经给出完整答案，
    // 再调一次 reporter 只会把答案重写（同一内容重复出现），直接复用。
    fallbackText.trim() &&
      !state.reportMode &&
      plan.steps.length <= 1 &&
      !lastResult?.observation.visual &&
      !lastResult?.observation.clarify &&
      (!state.criticVerdict || state.criticVerdict === 'pass') &&
      state.criticIssues.length === 0,
  );
  if (plainSingleAnswer) {
    logLine(`reporter reuse executor answer chars=${fallbackText.trim().length}`);
    send({ type: 'token', content: fallbackText.trim() });
    return { route: 'finalize' };
  }
  await produceAnswer({
    cfg,
    budget,
    question: state.question,
    stepResults: state.stepResults,
    plan,
    send,
    controller,
    fallbackText,
    warnings: state.criticIssues,
  });
  return { route: 'finalize' };
}

async function finalizeNode(state: GraphState, config: RunnableConfig): Promise<GraphUpdate> {
  const runtime = runtimeOf(config);
  const completed = state.stepResults.filter(item => item.step.status === 'done').length;
  const total = state.plan ? state.plan.steps.length : 0;
  runtime.send({
    type: 'plan_done',
    status: state.clarified ? 'waiting' : state.stopped ? 'done' : completed >= total ? 'done' : 'partial',
    completed,
    total,
    elapsedMs: Date.now() - runtime.turnStartedAt,
    checked: state.checkedCount,
    retries: state.retryCount,
    replans: state.replanCount,
    criticRounds: state.criticRounds,
    criticVerdict: state.criticVerdict,
    criticIssues: state.criticIssues.length,
  });
  logLine(
    `plan done completed=${completed}/${total} checked=${state.checkedCount} ` +
      `retries=${state.retryCount} replans=${state.replanCount} ` +
      `critic=${state.criticVerdict || 'skip'}`,
  );
  return {};
}

function buildPlanGraph() {
  return new StateGraph(PlanGraphState)
    .addNode('planner', plannerNode)
    .addNode('executor', executorNode)
    .addNode('reflector', reflectorNode)
    .addNode('wait', waitNode)
    .addNode('critic', criticNode)
    .addNode('reporter', reporterNode)
    .addNode('finalize', finalizeNode)
    .addEdge(START, 'planner')
    .addEdge('planner', 'executor')
    .addEdge('executor', 'reflector')
    .addConditionalEdges('reflector', state => state.route, {
      executor: 'executor',
      planner: 'planner',
      critic: 'critic',
      reporter: 'reporter',
      wait: 'wait',
      finalize: 'finalize',
    })
    .addConditionalEdges('wait', state => state.route, {
      executor: 'executor',
      critic: 'critic',
      reporter: 'reporter',
      finalize: 'finalize',
    })
    .addConditionalEdges('critic', state => state.route, {
      executor: 'executor',
      planner: 'planner',
      reporter: 'reporter',
      finalize: 'finalize',
    })
    .addEdge('reporter', 'finalize')
    .addEdge('finalize', END)
    .compile();
}

type PlanGraph = ReturnType<typeof buildPlanGraph>;

interface GraphEntry {
  graph: PlanGraph;
  lastUsed: number;
}

const graphs = new Map<string, GraphEntry>();
const GRAPH_TTL_MS = 30 * 60 * 1000;
const MAX_GRAPHS = 8;

function getPlanGraph(cfg: ResolvedConfig, reportMode: boolean): PlanGraph {
  const now = Date.now();
  for (const [key, entry] of graphs) {
    if (now - entry.lastUsed > GRAPH_TTL_MS) graphs.delete(key);
  }
  const key = `${cfg.key}|report=${reportMode ? 1 : 0}`;
  let entry = graphs.get(key);
  if (!entry) {
    entry = { graph: buildPlanGraph(), lastUsed: now };
    graphs.set(key, entry);
    if (graphs.size > MAX_GRAPHS) {
      let oldestKey: string | null = null;
      let oldest = Infinity;
      for (const [itemKey, value] of graphs) {
        if (value.lastUsed < oldest) {
          oldest = value.lastUsed;
          oldestKey = itemKey;
        }
      }
      if (oldestKey) graphs.delete(oldestKey);
    }
  }
  entry.lastUsed = now;
  return entry.graph;
}

export async function runPlanTurn(options: RunPlanOptions): Promise<RunPlanResult> {
  const {
    cfg,
    agent,
    budget,
    messages,
    question,
    candidates,
    pageContext,
    executionMode: requestedMode,
    reportMode,
    bridge,
    send,
    controller,
    control,
  } = options;
  const startedAt = Date.now();
  const graph = getPlanGraph(cfg, reportMode);
  const executionMode: ExecutionMode =
    requestedMode || (reportMode ? 'report' : 'analyze');
  const quickPlan =
    executionMode === 'quick'
      ? buildQuickPlan(question, [
          ...(pageContext?.tables || []),
          ...candidates.map(item => item.table),
        ])
      : null;
  const finalState = (await graph.invoke(
    {
      messages,
      question,
      candidates,
      pageContext: pageContext || null,
      reportMode,
      executionMode,
      plan: quickPlan,
      stepResults: [],
      activeSteps: [],
      observations: [],
      stepAttempts: {},
      stepFeedback: {},
      stepEmptyRetried: {},
      stepTruncatedRetried: {},
      route: 'executor',
      feedback: '',
      replanCount: 0,
      retryCount: 0,
      checkedCount: 0,
      criticRounds: 0,
      criticVerdict: '',
      criticIssues: [],
      lastFailure: '',
      seenSql: [],
      stopped: false,
      clarified: false,
      timedOutSteps: [],
    },
    {
      recursionLimit: Math.max(
        cfg.recursionLimit,
        cfg.maxPlanSteps * 4 + cfg.maxReplans * 4 + cfg.maxCriticRounds * 4 + 12,
      ),
      signal: controller.signal,
      configurable: {
        cfg,
        budget,
        send,
        bridge,
        controller,
        agent,
        turnStartedAt: startedAt,
        control,
      },
    },
  )) as GraphState;

  const plan = finalState.plan || null;
  const total = plan ? plan.steps.length : 0;
  const completed = finalState.stepResults.filter(item => item.step.status === 'done').length;
  return {
    plan,
    completed,
    total,
    clarified: Boolean(finalState.clarified),
    stopped: Boolean(finalState.stopped),
    error: String(finalState.lastFailure || ''),
  };
}
