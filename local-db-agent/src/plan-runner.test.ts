import { describe, expect, it, vi } from 'vitest';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { TurnBudget } from './budget.js';
import { DEFAULT_TOKEN_PRICES } from './usage.js';
import type { ResolvedConfig } from './config.js';
import type { RunPlanOptions, RunPlanResult, TurnBridgeLike } from './plan-runner.js';

const state = vi.hoisted(() => ({
  planJson: '',
  criticResponses: [] as string[],
  criticCalls: 0,
  answers: [] as string[],
  agentCalls: 0,
  delays: [] as number[],
  waitCalls: 0,
  scripts: [] as Array<Array<Record<string, unknown>>>,
}));

vi.mock('./runtime.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./runtime.js')>();
  return {
    ...actual,
    createChatModel: () => ({
      invoke: async (messages: unknown) => {
        const text = JSON.stringify(messages);
        if (text.includes('数据准确性评审员')) {
          const index = Math.min(
            state.criticCalls,
            Math.max(0, state.criticResponses.length - 1),
          );
          state.criticCalls += 1;
          return {
            content: state.criticResponses[index] || '{"verdict":"pass","issues":[]}',
            usage_metadata: { input_tokens: 10, output_tokens: 5 },
            response_metadata: {},
          };
        }
        return {
          content: state.planJson,
          usage_metadata: { input_tokens: 10, output_tokens: 5 },
          response_metadata: {},
        };
      },
      stream: async function* () {
        for (const part of state.answers) {
          yield {
            content: part,
            usage_metadata: { input_tokens: 20, output_tokens: 4 },
            response_metadata: {},
          };
        }
      },
    }),
  };
});

function config(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    db: { type: 'sqlserver', connectionString: 'Server=test', schemas: [] },
    llm: {
      apiKey: 'test',
      baseUrl: 'http://localhost',
      model: 'fake',
      timeoutMs: 1000,
      temperature: 0,
      topP: 1,
    },
    recursionLimit: 10,
    turnTimeoutMs: 10000,
    maxConcurrent: 3,
    summaryTriggerTokens: 40000,
    summaryKeepMessages: 12,
    maxSqlQueries: 6,
    maxSchemaCalls: 4,
    maxResultChars: 8000,
    maxTotalToolChars: 24000,
    maxOutputTokens: 2000,
    maxTurnTokens: 150000,
    maxReportTurnTokens: 200000,
    maxDailyTokens: 2000000,
    maxModelCalls: 20,
    maxReportModelCalls: 24,
    enableSuggestions: false,
    enableClarify: true,
    strictNumberCheck: false,
    tokenPrices: DEFAULT_TOKEN_PRICES,
    requireSqlApproval: false,
    enablePlanMode: true,
    maxPlanSteps: 4,
    maxRetriesPerStep: 2,
    maxReplans: 1,
    maxParallelSteps: 3,
    enableAccuracyCritic: false,
    maxCriticRounds: 0,
    planTurnTimeoutMs: 10000,
    stepTimeoutMs: 10000,
    key: 'test',
    ...overrides,
  } as unknown as ResolvedConfig;
}

function toolStart(runId: string, sql: string): Record<string, unknown> {
  return {
    event: 'on_tool_start',
    name: 'run_sql',
    run_id: runId,
    data: { input: { sql } },
  };
}

function toolEnd(runId: string, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    event: 'on_tool_end',
    name: 'run_sql',
    run_id: runId,
    data: { output: JSON.stringify(payload) },
  };
}

/** 模拟 executor 步骤里模型不改工具、直接输出完整文本（executeStep 只认 AIMessage 实例）。 */
function chatModelEnd(text: string): Record<string, unknown> {
  return {
    event: 'on_chat_model_end',
    data: { output: new AIMessage(text) },
  };
}

function fakeAgent(scripts: Array<Array<Record<string, unknown>>>) {
  return {
    streamEvents: async () => {
      const index = state.agentCalls;
      state.agentCalls += 1;
      const script = scripts[index] || scripts[scripts.length - 1] || [];
      const delayMs = state.delays[index] || 0;
      return (async function* () {
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        for (const event of script) yield event;
      })();
    },
  } as unknown as RunPlanOptions['agent'];
}

function bridge(): { value: TurnBridgeLike; events: Array<Record<string, unknown>> } {
  const events: Array<Record<string, unknown>> = [];
  return {
    value: {
      handle: (event: any, options?: any) => {
        events.push({ ...event, options });
      },
      shouldStop: () => false,
      clarifyPending: () => false,
    },
    events,
  };
}

async function run(
  scripts: Array<Array<Record<string, unknown>>>,
  question: string,
  overrides: Partial<ResolvedConfig> = {},
  executionMode?: 'quick' | 'analyze' | 'report',
): Promise<{
  result: RunPlanResult;
  sent: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
}> {
  const sent: Array<Record<string, unknown>> = [];
  const b = bridge();
  state.criticCalls = 0;
  state.waitCalls = 0;
  const { runPlanTurn } = await import('./plan-graph.js');
  const result = await runPlanTurn({
    cfg: config(overrides),
    agent: fakeAgent(scripts),
    budget: new TurnBudget({
      maxSqlQueries: 6,
      maxSchemaCalls: 4,
      maxResultChars: 8000,
      maxTotalToolChars: 24000,
      maxModelCalls: 20,
      maxTurnTokens: 150000,
    }),
    messages: [new HumanMessage(question)],
    question,
    candidates: [],
    executionMode,
    reportMode: false,
    bridge: b.value,
    send: payload => sent.push(payload as Record<string, unknown>),
    controller: new AbortController(),
    control: {
      runId: 'test',
      deadline: Date.now() + 10000,
      waitForContinue: async () => {
        state.waitCalls += 1;
        return true;
      },
      extendDeadline: () => {},
    },
  });
  return { result, sent, events: b.events };
}

describe('runPlanTurn', () => {
  it('按计划逐步执行并输出进度事件', async () => {
    state.planJson = JSON.stringify({
      goal: '分析库存',
      steps: [
        { title: '查库存', intent: '查当前库存', successCriteria: '拿到行数' },
        { title: '查库龄', intent: '查库龄分布' },
      ],
    });
    state.answers = ['库存', '正常'];
    state.agentCalls = 0;
    state.scripts = [
      [toolStart('r1', 'SELECT COUNT(*) AS n FROM Stock'), toolEnd('r1', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] })],
      [toolStart('r2', 'SELECT age, COUNT(*) AS n FROM Stock GROUP BY age'), toolEnd('r2', { success: true, rowCount: 2, columns: ['age', 'n'], rows: [[1, 5], [2, 5]] })],
    ];

    const { result, sent } = await run(state.scripts, '分析最近三个月的库存趋势和库龄分布');
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    expect(sent.some(item => item.type === 'plan')).toBe(true);
    expect(sent.filter(item => item.type === 'step_start')).toHaveLength(2);
    expect(sent.filter(item => item.type === 'step_end')).toHaveLength(2);
    expect(sent.filter(item => item.type === 'plan_done')).toHaveLength(1);
    expect(sent.some(item => item.type === 'token')).toBe(true);
    expect(sent.some(item => item.type === 'trace' && item.kind === 'planner')).toBe(true);
    expect(sent.some(item => item.type === 'trace' && item.kind === 'step_context')).toBe(true);
  });

  it('SQL 报错会反思并重试同一步', async () => {
    state.planJson = JSON.stringify({
      goal: '查库存',
      steps: [{ title: '查库存', intent: '查当前库存' }],
    });
    state.answers = ['完成'];
    state.agentCalls = 0;
    state.scripts = [
      [toolStart('e1', 'SELECT bad FROM Stock'), toolEnd('e1', { success: false, error: '列不存在' })],
      [toolStart('e2', 'SELECT COUNT(*) AS n FROM Stock'), toolEnd('e2', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] })],
    ];

    const { result, sent } = await run(state.scripts, '分析最近三个月的库存趋势');
    expect(result.completed).toBe(1);
    expect(sent.some(item => item.type === 'reflect' && item.verdict === 'retry')).toBe(true);
    expect(sent.filter(item => item.type === 'step_start')).toHaveLength(1);
    expect(sent.filter(item => item.type === 'step_end')).toHaveLength(1);
  });

  it('最终数据校验不通过会追加补充查询步骤', async () => {
    state.planJson = JSON.stringify({
      goal: '查库存',
      steps: [{ title: '查库存', intent: '查当前库存' }],
    });
    state.answers = ['完成'];
    state.agentCalls = 0;
    state.criticResponses = [
      JSON.stringify({
        verdict: 'revise',
        issues: ['缺少时间范围'],
        feedback: '补充本月时间范围后重新查询',
        confidence: 0.8,
      }),
      JSON.stringify({ verdict: 'pass', issues: [], feedback: '', confidence: 0.9 }),
    ];
    state.scripts = [
      [
        toolStart('c1', 'SELECT COUNT(*) AS n FROM Stock'),
        toolEnd('c1', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] }),
      ],
      [
        toolStart('c2', "SELECT COUNT(*) AS n FROM Stock WHERE dt >= '2026-10-01'"),
        toolEnd('c2', { success: true, rowCount: 1, columns: ['n'], rows: [[8]] }),
      ],
    ];

    const { result, sent } = await run(state.scripts, '分析最近三个月的库存趋势', {
      enableAccuracyCritic: true,
      maxCriticRounds: 1,
    });
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    expect(sent.some(item => item.type === 'replan')).toBe(true);
    expect(sent.filter(item => item.type === 'step_start')).toHaveLength(2);
    const done = sent.find(item => item.type === 'plan_done');
    expect(done?.criticVerdict).toBe('pass');
  });

  it('步骤超时会暂停并等待继续', async () => {
    state.planJson = JSON.stringify({
      goal: '查库存',
      steps: [{ title: '查库存', intent: '查当前库存' }],
    });
    state.answers = ['完成'];
    state.agentCalls = 0;
    state.delays = [120];
    state.scripts = [
      [
        toolStart('t1', 'SELECT COUNT(*) AS n FROM Stock'),
        toolEnd('t1', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] }),
      ],
      [
        toolStart('t2', 'SELECT COUNT(*) AS n FROM Stock'),
        toolEnd('t2', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] }),
      ],
    ];

    const { result, sent } = await run(state.scripts, '分析最近三个月的库存趋势', {
      stepTimeoutMs: 50,
    });
    expect(sent.some(item => item.type === 'ask_continue')).toBe(true);
    expect(state.waitCalls).toBe(1);
    expect(result.completed).toBe(1);
  });

  it('数据步骤提前生成报告时，报告目标标记完成而不是 pending', async () => {
    state.planJson = JSON.stringify({
      goal: '生成报告',
      steps: [
        { title: '查询数据', intent: '查询物料数据' },
        {
          title: '生成 HTML 报告',
          intent: '输出报告',
          successCriteria: 'render_html_report 成功',
          dependsOn: [1],
        },
      ],
    });
    state.answers = ['完成'];
    state.agentCalls = 0;
    state.delays = [];
    state.scripts = [
      [
        {
          event: 'on_tool_end',
          name: 'render_html_report',
          run_id: 'r-report',
          data: {
            output: JSON.stringify({
              success: true,
              component: 'ol-html-report',
              title: '测试报告',
            }),
          },
        },
      ],
    ];

    const { result, sent } = await run(state.scripts, '生成物料报告');
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    expect(state.agentCalls).toBe(1);
    const reportEnd = sent.find(
      item => item.type === 'step_end' && item.summary === '报告已在上一步生成，本步骤复用，不重复渲染',
    );
    expect(reportEnd).toBeTruthy();
    expect(sent.some(item => item.type === 'trace' && item.kind === 'report')).toBe(true);
  });

  it('终版报告提前渲染后，标题不像报告步骤的 pending 步骤也标记完成（修复 1/2）', async () => {
    state.planJson = JSON.stringify({
      goal: '生成库存主表健康度简报',
      steps: [
        { title: '提取 WMS_Stocks 库存主表核心指标', intent: '查询并核对核心指标' },
        // 标题含“校验/汇总”，isReportStep 会判定失败；渲染早停后不能再依赖标题猜谜
        { title: '校验口径并汇总图表数据', intent: '核对 coverage 与口径', dependsOn: [1] },
      ],
    });
    state.answers = ['完成'];
    state.agentCalls = 0;
    state.delays = [];
    state.scripts = [
      [
        {
          event: 'on_tool_end',
          name: 'render_html_report',
          run_id: 'r-report-early',
          data: {
            output: JSON.stringify({ success: true, component: 'ol-html-report', title: '简报' }),
          },
        },
      ],
    ];

    const { result, sent } = await run(state.scripts, '生成库存主表报告');
    expect(state.agentCalls).toBe(1);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    const done = sent.find(item => item.type === 'plan_done');
    expect(done?.status).toBe('done');
    expect(done?.completed).toBe(2);
    const reusedEnd = sent.find(
      item => item.type === 'step_end' && item.summary === '报告已在上一步生成，本步骤复用，不重复渲染',
    );
    expect(reusedEnd).toBeTruthy();
  });

  it('快速模式单步执行并反思，不调用 planner/critic', async () => {
    state.planJson = '';
    state.answers = ['库存 10'];
    state.agentCalls = 0;
    state.criticCalls = 0;
    state.delays = [];
    state.scripts = [
      [
        toolStart('q1', 'SELECT COUNT(*) AS n FROM Stock'),
        toolEnd('q1', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] }),
      ],
    ];

    const { result, sent } = await run(
      state.scripts,
      '当前页面有多少库存',
      { enableAccuracyCritic: true },
      'quick',
    );
    expect(result.completed).toBe(1);
    expect(result.total).toBe(1);
    expect(state.agentCalls).toBe(1);
    expect(state.criticCalls).toBe(0);
    expect(sent.filter(item => item.type === 'step_start')).toHaveLength(1);
    const plan = sent.find(item => item.type === 'plan');
    expect(plan?.mode).toBe('quick');
    expect(plan?.steps).toHaveLength(1);
  });

  it('快速模式 SQL 出错时仍会反思并重试', async () => {
    state.planJson = '';
    state.answers = ['修正后得到库存 10'];
    state.agentCalls = 0;
    state.criticCalls = 0;
    state.delays = [];
    state.scripts = [
      [
        toolStart('q1', 'SELECT bad FROM Stock'),
        toolEnd('q1', { success: false, error: '列不存在' }),
      ],
      [
        toolStart('q2', 'SELECT COUNT(*) AS n FROM Stock'),
        toolEnd('q2', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] }),
      ],
    ];

    const { result, sent } = await run(
      state.scripts,
      '当前页面有多少库存',
      { enableAccuracyCritic: true },
      'quick',
    );
    expect(state.agentCalls).toBe(2);
    expect(result.completed).toBe(1);
    expect(sent.some(item => item.type === 'reflect' && item.verdict === 'retry')).toBe(true);
    expect(state.criticCalls).toBe(0);
  });

  it('analyze 闲聊单步：无 SQL 时跳过 critic，executor 答案直接复用（不再调 reporter）', async () => {
    state.planJson = JSON.stringify({
      goal: '向用户介绍自己的能力',
      simple: true,
      steps: [{ title: '自我介绍', intent: '介绍助手能力与当前接入环境' }],
    });
    state.answers = ['REPORTER-SHOULD-NOT-RUN'];
    state.agentCalls = 0;
    state.criticCalls = 0;
    state.criticResponses = [];
    state.delays = [];
    state.scripts = [[chatModelEnd('我是数据库分析助手，可以帮你查数据、做分析和生成报告。')]];

    const { result, sent } = await run(
      state.scripts,
      '你好，请自我介绍下',
      { enableAccuracyCritic: true, maxCriticRounds: 1 },
      'analyze',
    );
    expect(state.agentCalls).toBe(1);
    expect(state.criticCalls).toBe(0);
    expect(result.completed).toBe(1);
    expect(result.total).toBe(1);
    const tokens = sent
      .filter(item => item.type === 'token')
      .map(item => String(item.content || ''));
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toContain('数据库分析助手');
    expect(tokens.join('')).not.toContain('REPORTER-SHOULD-NOT-RUN');
  });

  it('analyze 单步有 SQL 且校验通过：critic 照跑，reporter 复用答案', async () => {
    state.planJson = JSON.stringify({
      goal: '查库存',
      steps: [{ title: '查库存', intent: '查当前库存' }],
    });
    state.answers = ['REPORTER-SHOULD-NOT-RUN'];
    state.agentCalls = 0;
    state.criticCalls = 0;
    state.criticResponses = [JSON.stringify({ verdict: 'pass', issues: [], confidence: 0.9 })];
    state.delays = [];
    state.scripts = [
      [
        toolStart('s1', 'SELECT COUNT(*) AS n FROM Stock'),
        toolEnd('s1', { success: true, rowCount: 1, columns: ['n'], rows: [[10]] }),
        chatModelEnd('库存 10'),
      ],
    ];

    const { result, sent } = await run(
      state.scripts,
      '当前库存有多少',
      { enableAccuracyCritic: true, maxCriticRounds: 1 },
      'analyze',
    );
    expect(state.agentCalls).toBe(1);
    expect(state.criticCalls).toBe(1);
    expect(result.completed).toBe(1);
    const tokens = sent
      .filter(item => item.type === 'token')
      .map(item => String(item.content || ''));
    expect(tokens).toEqual(['库存 10']);
    const done = sent.find(item => item.type === 'plan_done');
    expect(done?.criticVerdict).toBe('pass');
  });
}, 30_000);
