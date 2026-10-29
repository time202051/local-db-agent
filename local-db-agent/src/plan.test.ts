import { describe, expect, it } from 'vitest';
import {
  buildQuickPlan,
  evaluateStep,
  fallbackPlan,
  hashSql,
  isLikelySimpleQuestion,
  normalizePlan,
  parsePlanDraft,
} from './plan.js';
import type { StepObservation } from './plan.js';

function observation(overrides: Partial<StepObservation> = {}): StepObservation {
  return {
    tools: [],
    sql: [],
    aiText: '',
    visual: false,
    clarify: false,
    errorMessages: [],
    budgetBlocked: false,
    timedOut: false,
    ...overrides,
  };
}

describe('isLikelySimpleQuestion', () => {
  it('单指标短问题走快路径', () => {
    expect(isLikelySimpleQuestion('查询本月出库单量')).toBe(true);
    expect(isLikelySimpleQuestion('库存总数是多少')).toBe(true);
  });

  it('分析/报告类问题不跳规划', () => {
    expect(isLikelySimpleQuestion('分析最近三个月的库存趋势')).toBe(false);
    expect(isLikelySimpleQuestion('出一份周报')).toBe(false);
  });
});

describe('normalizePlan', () => {
  it('补齐 step id / index / status', () => {
    const plan = normalizePlan({
      goal: '看库存',
      steps: [
        { title: '查库存', intent: '查当前库存', tables: ['Stock'] },
        { title: '出报告', intent: '生成 HTML 报告' },
      ],
    });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].id).toContain('-s1');
    expect(plan.steps[0].index).toBe(0);
    expect(plan.steps[0].status).toBe('pending');
    expect(plan.steps[1].tables).toEqual([]);
  });

  it('报告轮自动补最后一步', () => {
    const plan = normalizePlan(
      { goal: '周报', steps: [{ title: '查数据', intent: '查周数据' }] },
      { reportMode: true },
    );
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[1].title).toContain('报告');
  });

  it('空计划回退为单步', () => {
    const plan = normalizePlan(
      { goal: '问数', steps: [] },
      { fallbackQuestion: '本月单量' },
    );
    expect(plan.steps).toHaveLength(1);
    expect(plan.simple).toBe(true);
  });
});

describe('parsePlanDraft', () => {
  it('支持纯 JSON 与 fenced JSON', () => {
    const raw = '{"goal":"看数","steps":[{"title":"查询","intent":"查单量"}]}';
    expect(parsePlanDraft(raw)?.steps[0].title).toBe('查询');
    expect(parsePlanDraft('```json\n' + raw + '\n```')?.goal).toBe('看数');
  });

  it('非法内容返回 null', () => {
    expect(parsePlanDraft('not json')).toBeNull();
    expect(parsePlanDraft('{"goal":"x","steps":[]}')).toBeNull();
  });
});

describe('evaluateStep', () => {
  const seen = new Set([hashSql('SELECT 1')]);

  it('SQL 错误优先重试', () => {
    const result = evaluateStep(
      observation({
        sql: [
          {
            hash: hashSql('SELECT bad'),
            sql: 'SELECT bad',
            ok: false,
            rowCount: 0,
            truncated: false,
            error: '列不存在',
          },
        ],
        errorMessages: ['列不存在'],
      }),
      { attempt: 0, maxRetries: 2, replanCount: 0, maxReplans: 1, seenSql: seen },
    );
    expect(result.verdict).toBe('retry');
    expect(result.feedback).toContain('列不存在');
  });

  it('空结果第一次重试，第二次放行', () => {
    const empty = observation({
      sql: [
        {
          hash: hashSql('SELECT missing'),
          sql: 'SELECT missing',
          ok: true,
          rowCount: 0,
          truncated: false,
        },
      ],
    });
    const first = evaluateStep(empty, {
      attempt: 0,
      maxRetries: 2,
      replanCount: 0,
      maxReplans: 1,
      seenSql: seen,
    });
    expect(first.verdict).toBe('retry');
    const second = evaluateStep(empty, {
      attempt: 1,
      maxRetries: 2,
      replanCount: 0,
      maxReplans: 1,
      emptyRetried: true,
      seenSql: seen,
    });
    expect(second.verdict).toBe('continue');
  });

  it('重复 SQL 会触发重试', () => {
    const result = evaluateStep(
      observation({
        sql: [
          {
            hash: hashSql('SELECT 1'),
            sql: 'SELECT 1',
            ok: true,
            rowCount: 1,
            truncated: false,
          },
        ],
      }),
      { attempt: 0, maxRetries: 2, replanCount: 0, maxReplans: 1, seenSql: seen },
    );
    expect(result.verdict).toBe('retry');
    expect(result.issues[0].type).toBe('duplicate_sql');
  });

  it('预算中断不重试', () => {
    const result = evaluateStep(observation({ budgetBlocked: true }), {
      attempt: 0,
      maxRetries: 2,
      replanCount: 0,
      maxReplans: 1,
    });
    expect(result.verdict).toBe('continue');
  });

  it('可视化成功直接结束', () => {
    const result = evaluateStep(observation({ visual: true }), {
      attempt: 0,
      maxRetries: 2,
      replanCount: 0,
      maxReplans: 1,
    });
    expect(result.verdict).toBe('finish');
  });
});

describe('fallbackPlan', () => {
  it('生成单步计划', () => {
    const plan = fallbackPlan('本月出库单量');
    expect(plan.simple).toBe(true);
    expect(plan.steps).toHaveLength(1);
  });
});

describe('report plan decomposition', () => {
  it('查询和报告混在一个标题时不吞掉数据目标', () => {
    const plan = normalizePlan(
      {
        goal: '物料报告',
        steps: [{ title: '查询并生成 HTML 报告', intent: '查询数据并输出报告' }],
      },
      { reportMode: true },
    );
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].title).toBe('查询并生成 HTML 报告');
    expect(plan.steps[1].title).toContain('报告');
  });

  it('只有报告步骤时自动补一个数据目标', () => {
    const plan = normalizePlan(
      {
        goal: '物料报告',
        steps: [
          {
            title: '生成 HTML 报告',
            intent: '输出报告',
            successCriteria: 'render_html_report 成功',
          },
        ],
      },
      { reportMode: true },
    );
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].title).toBe('查询并校验数据');
    expect(plan.steps[1].title).toContain('报告');
  });

  it('goal 原样复制用户问题时改写成任务目标', () => {
    const question = '我换了模型再帮我生成一次，我想要你用html格式的那个写';
    const plan = normalizePlan(
      {
        goal: question,
        steps: [
          { title: '查询物料数据', intent: '查询 V_Product 物料数据', tables: ['V_Product'] },
          {
            title: '生成 HTML 报告',
            intent: '输出物料分析报告',
            successCriteria: 'render_html_report 成功',
          },
        ],
      },
      { reportMode: true, fallbackQuestion: question },
    );
    expect(plan.goal).not.toBe(question);
    expect(plan.goal).toContain('V_Product');
  });
});

describe('buildQuickPlan', () => {
  it('生成单步快速计划，不进入 planner', () => {
    const plan = buildQuickPlan('当前页面有多少库存', ['WMS_Stocks']);
    expect(plan.mode).toBe('quick');
    expect(plan.simple).toBe(true);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].tables).toContain('WMS_Stocks');
  });
});
