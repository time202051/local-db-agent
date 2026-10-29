import type { ExecutionMode } from './plan.js';
import type { PageContextResolution } from './page-context.js';

/**
 * 执行模式路由。
 *
 * 先做高置信度规则判断，无法判断时走 analyze（完整 Plan + 反思 + critic），
 * 宁可多花一点，也不要为了省 token 把复杂问题降级成单步查询。
 */
export interface RouteDecision {
  mode: ExecutionMode;
  needsSql: boolean;
  needsPlan: boolean;
  needsReflection: boolean;
  needsCritic: boolean;
  needsReport: boolean;
  maxSteps: number;
  reason: string;
  confidence: number;
}

const REPORT_RE = /报告|日报|周报|月报|年报|年度|汇报|大屏|看板|面板|可视化页面|可视化报告|网页报告|html/i;
const ANALYSIS_RE =
  /分析|趋势|同比|环比|对比|分布|排名|异常|原因|诊断|拆解|建议|预测|画像|漏斗|结构|占比|贡献|归因|波动/i;
const MULTI_DIM_RE =
  /按.*(?:分组|维度|仓库|物料|分类|状态|月份|日期)|各.*(?:仓库|物料|分类|状态)|分别|多个|逐|分项|拆开|维度/i;
const SIMPLE_RE =
  /多少|总数|合计|总计|统计|查询|查一下|查下|列出|显示|平均|最大|最小|最近|top\s*\d+|前\s*\d+|明细|列表/i;
const CHAT_RE =
  /^(你好|您好|hi|hello|嗨|在吗|谢谢|感谢|辛苦了|你是谁|你能做什么|你可以做什么)[\s!！。,.?？]*$/i;

export function isChatQuestion(text: string): boolean {
  return CHAT_RE.test(String(text || '').trim());
}

export function chatReply(question: string): string {
  if (/谢谢|感谢|辛苦/.test(question)) {
    return '不客气。需要查数据、做分析或生成报告时，直接告诉我就行。';
  }
  if (/你是谁|你能做什么|你可以做什么/.test(question)) {
    return (
      '我是数据库分析助手。你可以直接问数据、分析趋势、查看当前页面表格，' +
      '或者让我生成 HTML 报告。'
    );
  }
  return '你好，我是数据库分析助手。需要查数据、做分析或生成报告时，直接告诉我就行。';
}

function decision(
  mode: ExecutionMode,
  reason: string,
  confidence: number,
  overrides: Partial<RouteDecision> = {},
): RouteDecision {
  return {
    mode,
    needsSql: mode !== 'quick',
    needsPlan: mode !== 'quick',
    needsReflection: true,
    needsCritic: mode !== 'quick',
    needsReport: mode === 'report',
    maxSteps: mode === 'quick' ? 1 : mode === 'report' ? 6 : 5,
    reason,
    confidence,
    ...overrides,
  };
}

export function routeExecutionMode(
  question: string,
  options: { wantsReport?: boolean; pageContext?: PageContextResolution | null } = {},
): RouteDecision {
  const text = String(question || '').trim();
  const wantsReport = options.wantsReport === true || REPORT_RE.test(text);
  if (wantsReport) {
    return decision('report', '用户要求报告/HTML/看板，需要完整 Plan 和报告生成', 0.98, {
      needsSql: true,
      needsReport: true,
      needsCritic: true,
    });
  }

  if (ANALYSIS_RE.test(text) || MULTI_DIM_RE.test(text)) {
    return decision('analyze', '问题包含分析、趋势、对比或多维拆解，需要多步计划', 0.9, {
      needsSql: true,
      needsCritic: true,
    });
  }

  // 短问题、单指标、单表查询，不需要 Planner，但仍然保留步骤反思和重试。
  if (text.length <= 60 && (SIMPLE_RE.test(text) || options.pageContext)) {
    return decision('quick', '问题较简单，走单步查询并保留轻量反思，不生成完整计划', 0.82, {
      needsSql: SIMPLE_RE.test(text),
      needsPlan: false,
      needsCritic: false,
      maxSteps: 1,
    });
  }

  // 无法可靠判断时，不用快速模式冒险。
  return decision('analyze', '问题不够明确或可能涉及多步，保守使用完整 Plan', 0.55, {
    needsSql: true,
    needsCritic: true,
  });
}

export function modeLabel(mode: ExecutionMode): string {
  if (mode === 'quick') return '快速问答';
  if (mode === 'report') return '报告生成';
  return '分析模式';
}
