import { z } from 'zod';

/**
 * 可视化协议（模型 → 前端）。
 *
 * 约定：模型通过可视化工具返回一个「报表 spec」，前端按 component 查表渲染。
 * 这里是前端组件契约的唯一来源：zod schema 既约束模型输出，也作为提示词的组件目录。
 *
 * 报表由一组 blocks 顺序组成，典型排版：
 *   section（分节标题） → summary/notice → kpi → hbar/progress/chips/dist → chart → table → risk → insights
 */

/** 前端渲染报表的容器组件名。 */
export const REPORT_COMPONENT = 'ol-report';

/** 单图组件名（旧协议，保留兼容）。 */
export const LEGACY_CHART_COMPONENT = 'ol-echarts';

/** 报表工具名（前端 index.ts 据此把工具结果转成 visual 事件）。 */
export const REPORT_TOOL_NAME = 'render_report';

/** 旧的单图工具名，保留兼容：只画一张图时使用。 */
export const LEGACY_CHART_TOOL_NAME = 'render_chart';

/** 完整 HTML 报告：前端用沙箱 iframe 渲染，可新窗口打开/下载。 */
export const HTML_REPORT_COMPONENT = 'ol-html-report';

/** 完整 HTML 报告工具名。 */
export const HTML_REPORT_TOOL_NAME = 'render_html_report';

/** 所有会触发前端 visual 渲染的工具名。 */
export const VISUAL_TOOL_NAMES = new Set<string>([
  REPORT_TOOL_NAME,
  LEGACY_CHART_TOOL_NAME,
  HTML_REPORT_TOOL_NAME,
]);

const tone = z
  .enum(['primary', 'success', 'danger', 'warning', 'neutral'])
  .describe('配色：primary 主色 / success 绿 / danger 红 / warning 橙 / neutral 灰');

const valueSchema = z.union([z.number(), z.string()]);

// ===== 分节标题（对应目录导航）=====
const sectionBlock = z.object({
  type: z.literal('section'),
  no: z.union([z.number(), z.string()]).optional().describe('分节序号，如 1、2、3'),
  title: z.string().describe('分节标题，中文'),
  subtitle: z.string().optional().describe('可选副标题（英文名或说明），如 Executive Summary'),
});

// ===== 核心结论 / 执行摘要 =====
const summaryBlock = z.object({
  type: z.literal('summary'),
  title: z.string().optional().describe('小标题，默认「核心结论」'),
  text: z.string().describe('结论正文，一段话概括'),
  items: z.array(z.string()).max(6).optional().describe('可选：要点条目'),
});

// ===== 提示 / 预警条 =====
const noticeBlock = z.object({
  type: z.literal('notice'),
  tone: tone.optional().describe('提示类型，由内容严重程度决定，默认 warning'),
  text: z.string().describe('提示内容，一句话'),
});

// ===== KPI 指标卡 =====
const kpiItem = z.object({
  label: z.string().describe('指标名称，中文，简短'),
  value: valueSchema.describe('指标值，数字优先'),
  unit: z.string().optional().describe('单位（万/元/%/台/单），可为空'),
  delta: z.number().optional().describe('同比/环比变化百分比，正数为增长、负数为下降'),
  trend: z.enum(['up', 'down', 'flat']).optional().describe('趋势方向，用于涨跌配色'),
  note: z.string().optional().describe('卡片底部补充说明，如 "vs plan 88.28% · 时间进度 27.36%"'),
  spark: z.array(z.number()).optional().describe('可选：迷你趋势线数值序列（6~24 个点）'),
});

const kpiBlock = z.object({
  type: z.literal('kpi'),
  title: z.string().optional(),
  items: z.array(kpiItem).min(1).max(8).describe('关键指标卡片，一排 2~4 个最佳，最多 8 个'),
});

// ===== 完成率横条（带对比）=====
const hbarItem = z.object({
  label: z.string().describe('条目名称，中文'),
  value: z.number().describe('数值'),
  unit: z.string().optional().describe('单位，如 %'),
  max: z.number().optional().describe('可选的标尺上限（默认按所有条目最大值）'),
  tone: tone.optional().describe('条形颜色'),
});

const hbarBlock = z.object({
  type: z.literal('hbar'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(hbarItem).min(1).max(12).describe('横条列表，适合完成率/占比对比'),
});

// ===== 进度 / 达成情况卡 =====
const progressItem = z.object({
  label: z.string().describe('条目名称，中文'),
  value: z.number().describe('完成百分比（0~100+），可为达成率'),
  unit: z.string().optional().describe('单位，默认 %，可留空'),
  status: z.string().optional().describe('状态说明，如「达标」「预计达标」「落后」'),
  tone: tone.optional(),
});

const progressBlock = z.object({
  type: z.literal('progress'),
  title: z.string().optional(),
  items: z.array(progressItem).min(1).max(8),
});

// ===== 小指标条（一行多个）=====
const chipItem = z.object({
  label: z.string().describe('指标名称，中文'),
  value: valueSchema.describe('指标值'),
  unit: z.string().optional(),
  delta: z.number().optional(),
  trend: z.enum(['up', 'down', 'flat']).optional(),
});

const chipsBlock = z.object({
  type: z.literal('chips'),
  title: z.string().optional(),
  items: z.array(chipItem).min(1).max(8).describe('一排 3~5 个小指标'),
});

// ===== 分布（堆叠条 + 图例）=====
const distItem = z.object({
  label: z.string().describe('分类名称，中文'),
  value: z.number().describe('数量'),
  tone: tone.optional(),
});

const distBlock = z.object({
  type: z.literal('dist'),
  title: z.string().optional(),
  subtitle: z.string().optional().describe('如「10月11日 · 7/15 工厂欠产」'),
  items: z.array(distItem).min(1).max(8).describe('按严重程度从高到低排列'),
});

// ===== 图表 =====
const chartBlock = z.object({
  type: z.literal('chart'),
  title: z.string().describe('图表标题，中文'),
  subtitle: z.string().optional().describe('可选副标题，说明口径'),
  span: z
    .number()
    .min(1)
    .max(12)
    .optional()
    .describe('12 栅格占位宽度，主图 8、辅图 4、整行 12；默认 6'),
  option: z
    .record(z.string(), z.any())
    .describe('标准 ECharts option，数据必须内嵌其中，如 {xAxis, yAxis, series}'),
});

// ===== 表格 =====
const tableBlock = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  columns: z.array(z.string()).min(1).describe('列名（中文），与 rows 的 key 对应'),
  rows: z
    .array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])))
    .max(30)
    .describe('数据行，最多 30 行'),
});

// ===== 风险 / 总结色块 =====
const riskItem = z.object({
  tone: tone.optional().describe('风险等级配色：danger 高 / warning 中 / success 低 / primary 提示'),
  title: z.string().describe('该项标题，中文'),
  text: z.string().describe('说明文字'),
});

const riskBlock = z.object({
  type: z.literal('risk'),
  title: z.string().optional().describe('区块标题，如「风险总结」'),
  items: z.array(riskItem).min(1).max(8),
});

// ===== 文字结论要点 =====
const insightBlock = z.object({
  type: z.literal('insights'),
  title: z.string().optional(),
  items: z.array(z.string()).min(1).max(4).describe('结论要点，每条一句话'),
});

const reportBlock = z.discriminatedUnion('type', [
  sectionBlock,
  summaryBlock,
  noticeBlock,
  kpiBlock,
  hbarBlock,
  progressBlock,
  chipsBlock,
  distBlock,
  chartBlock,
  tableBlock,
  riskBlock,
  insightBlock,
]);

/** render_report 工具入参（报表 spec）。 */
export const reportSchema = z.object({
  component: z
    .string()
    .default(REPORT_COMPONENT)
    .describe(`渲染组件名，固定用 ${REPORT_COMPONENT}`),
  title: z.string().describe('报表标题，中文，概括本次分析主题'),
  subtitle: z.string().optional().describe('可选副标题，如数据范围/时间/口径'),
  meta: z
    .array(z.string())
    .max(5)
    .optional()
    .describe('可选：顶部信息胶囊，如 ["数据截至 10-11","第11天/30天","有效期 5~11"]'),
  theme: z.enum(['light', 'dark']).optional().describe('可选主题；一般不要填，跟随用户偏好'),
  blocks: z
    .array(reportBlock)
    .min(1)
    .max(40)
    .describe('报表区块，按展示顺序排列；分节用 section 开头'),
});

export type ReportSchema = z.infer<typeof reportSchema>;

/** 报告结构蓝图：只约束“组织方式”，不约束具体样式。 */
export const REPORT_LAYOUT_KEYS = [
  'executive',
  'dashboard',
  'narrative',
  'comparison',
  'timeline',
] as const;

export type ReportLayoutKey = (typeof REPORT_LAYOUT_KEYS)[number];

export const REPORT_LAYOUTS: Record<
  ReportLayoutKey,
  {
    label: string;
    when: string;
    sections: string;
    elements: string[];
    density: 'low' | 'medium' | 'high';
    avoid: string;
  }
> = {
  executive: {
    label: '高层摘要',
    when: '给领导/老板看，年度总结、月度汇报、需要快速决策',
    sections: '核心结论 → 3~4 个关键数字 → 关键证据（1~2 图/表）→ 风险与建议',
    elements: ['report-cover', 'finding-list', 'hero-kpi', 'risk-matrix', 'action-list'],
    density: 'low',
    avoid: '不要堆明细表，不要把所有指标都放上来',
  },
  dashboard: {
    label: '运营看板',
    when: '日常运营监控、日报/周报、指标多且需要横向扫读',
    sections: '指标墙 → 图表矩阵 → 排行榜 → 异常/明细',
    elements: ['small-multiples', 'heat-table', 'top-bottom', 'comparison-matrix'],
    density: 'high',
    avoid: '不要写大段叙事，不要每个模块都做成大卡片',
  },
  narrative: {
    label: '叙事分析',
    when: '异常专报、专题分析、需要解释原因和推演',
    sections: '背景/问题 → 发现 1 → 发现 2 → 发现 3 → 结论与动作（图文交替）',
    elements: ['finding-list', 'so-what', 'small-multiples', 'heat-table', 'action-list'],
    density: 'medium',
    avoid: '不要做成纯指标墙，不要让表格占满正文',
  },
  comparison: {
    label: '横向对比',
    when: '多仓/多货主/同比环比/方案对比，重点是差距',
    sections: '对比矩阵 → 雷达或分组图 → Top/Bottom → 差距归因 → 建议',
    elements: ['comparison-matrix', 'top-bottom', 'risk-matrix', 'action-list'],
    density: 'medium',
    avoid: '不要只列单边数据，必须体现差距和结论',
  },
  timeline: {
    label: '时间轴复盘',
    when: '年度/季度/月度复盘、阶段演进、里程碑',
    sections: '年度概览 → 季度/月度时间轴 → 阶段结论 → 下一阶段重点',
    elements: [
      'report-cover',
      'hero-kpi',
      'timeline',
      'heat-table',
      'finding-list',
      'action-list',
      'report-appendix',
    ],
    density: 'high',
    avoid: '不要把所有内容压成一张大表，要体现时间推进关系',
  },
};

/** 已知报告元素 class（服务端据此从 HTML 中自动统计实际使用情况）。 */
export const REPORT_ELEMENT_KEYS = [
  'report-cover',
  'section-divider',
  'finding-list',
  'so-what',
  'pull-quote',
  'timeline',
  'action-list',
  'risk-matrix',
  'report-appendix',
  'hero-kpi',
  'bullet-row',
  'small-multiples',
  'heat-table',
  'top-bottom',
  'comparison-matrix',
  'annotation',
  'margin-note',
  'full-bleed',
  'drop-cap',
  'hero-number',
  'section-progress',
  'arrow-flow',
] as const;

/** 数据型元素：负责承载数字、图表、矩阵、排名，决定报告“像不像报表”。 */
export const REPORT_DATA_ELEMENT_KEYS = [
  'hero-kpi',
  'bullet-row',
  'small-multiples',
  'heat-table',
  'top-bottom',
  'comparison-matrix',
  'risk-matrix',
] as const;

/** 叙事型元素：负责结论、时间线、行动和说明。 */
export const REPORT_NARRATIVE_ELEMENT_KEYS = [
  'report-cover',
  'finding-list',
  'so-what',
  'pull-quote',
  'timeline',
  'action-list',
  'report-appendix',
  'margin-note',
] as const;

export type ReportElementCategory = 'data' | 'narrative' | 'layout';

const DATA_ELEMENT_SET = new Set<string>(REPORT_DATA_ELEMENT_KEYS);
const NARRATIVE_ELEMENT_SET = new Set<string>(REPORT_NARRATIVE_ELEMENT_KEYS);

export function reportElementCategory(key: string): ReportElementCategory {
  if (DATA_ELEMENT_SET.has(key)) return 'data';
  if (NARRATIVE_ELEMENT_SET.has(key)) return 'narrative';
  return 'layout';
}

/** 报告元素目录：给模型看的最小 HTML 骨架。 */
export const REPORT_ELEMENT_KIT: Array<{
  key: string;
  label: string;
  when: string;
  html: string;
}> = [
  {
    key: 'report-cover',
    label: '封面',
    when: '年度/季度报告第一屏；也可以用于章节扉页',
    html: '<div class="report-cover"><div class="cover-kicker">2025 年度经营报告</div><h1 class="cover-title">全年经营复盘</h1><div class="cover-sub">数据范围 / 口径</div><div class="cover-meta"><span class="meta-chip">…</span></div><div class="cover-metric">核心数字</div></div>',
  },
  {
    key: 'section-divider',
    label: '章节扉页',
    when: '大章节切换，制造视觉节奏',
    html: '<div class="section-divider"><span class="section-divider__no">02</span><div><div class="section-divider__title">结构变化</div><div class="section-divider__text">一句话导语</div></div></div>',
  },
  {
    key: 'finding-list',
    label: '三个发现',
    when: '执行摘要、年度复盘、异常归因',
    html: '<div class="finding-list"><div class="finding"><span class="finding-no">01</span><div class="finding-body"><div class="finding-title">发现标题</div><div class="finding-text">说明</div><div class="finding-impact">影响：…</div></div></div>…</div>',
  },
  {
    key: 'so-what',
    label: '所以呢',
    when: '每张主图/主表之后，用一句话给出结论',
    html: '<div class="so-what"><span class="so-what__label">所以呢</span><p>这张图说明…，下一步应该…</p></div>',
  },
  {
    key: 'pull-quote',
    label: '引言/主张',
    when: '年度关键词、老板原话、报告核心主张',
    html: '<div class="pull-quote"><p class="pull-quote__text">“……”</p><div class="pull-quote__by">— 署名/来源</div></div>',
  },
  {
    key: 'timeline',
    label: '时间轴',
    when: '年度大事记、季度/月度阶段演进',
    html: '<div class="timeline"><div class="timeline-item"><div class="timeline-date">Q1</div><div class="timeline-card"><b>阶段标题</b><p>关键动作与结果</p></div></div>…</div>',
  },
  {
    key: 'action-list',
    label: '行动清单',
    when: '下一年重点、风险整改、责任到人',
    html: '<div class="action-list"><div class="action-item"><span class="action-priority is-high">高</span><div class="action-title">动作</div><div class="action-meta"><span class="action-owner">负责人：…</span><span class="action-due">时间：…</span><span class="action-status">进行中</span></div></div>…</div>',
  },
  {
    key: 'risk-matrix',
    label: '风险矩阵',
    when: '多风险分级，按概率/影响定位',
    html: '<div class="risk-matrix"><div class="risk-matrix__axis risk-matrix__axis--y">影响</div><div class="risk-cell"><span class="risk-dot is-danger">风险 A</span></div>…（9 个 cell）<div class="risk-matrix__axis risk-matrix__axis--x">概率</div></div>',
  },
  {
    key: 'report-appendix',
    label: '附录',
    when: '口径、数据来源、术语表、脚注',
    html: '<div class="report-appendix"><div class="appendix-title">附录</div><div class="method-list"><div><b>口径</b> …</div><div><b>数据来源</b> …</div></div><div class="glossary"><div class="glossary-row"><b>术语</b><span>解释</span></div>…</div></div>',
  },
  {
    key: 'hero-kpi',
    label: 'Hero 数字',
    when: '年度/月度最重要的一个数字',
    html: '<div class="hero-kpi"><div class="hero-kpi__label">全年销售额</div><div class="hero-kpi__value" data-count="1284.5">1,284.5<span class="unit">万元</span></div><div class="hero-kpi__target">目标 1,500 万 · 达成 85.6%</div><div class="hero-kpi__spark"><i style="height:40%"></i><i style="height:68%"></i><i style="height:82%"></i></div></div>',
  },
  {
    key: 'bullet-row',
    label: 'Bullet 图',
    when: '目标 vs 实际 vs 区间',
    html: '<div class="bullet-row"><div class="bullet-label">出库及时率</div><div class="bullet-track"><div class="bullet-range"></div><div class="bullet-fill" style="width:72%"></div><div class="bullet-target" style="left:85%"></div></div><div class="bullet-value">72%</div></div>',
  },
  {
    key: 'small-multiples',
    label: '小倍数图',
    when: '多仓/多品类同指标横向对比',
    html: '<div class="small-multiples"><div class="mini-chart"><div class="mini-chart__title">仓库 A</div><div class="ol-chart" data-id="m1" style="height:160px"></div></div>…</div>',
  },
  {
    key: 'heat-table',
    label: '热力表',
    when: '多维表格快速扫读，数值条件着色',
    html: '<table class="heat-table"><thead><tr><th>月份</th><th>单量</th><th>及时率</th></tr></thead><tbody><tr><td>1 月</td><td class="heat-2">…</td><td class="heat-4">…</td></tr></tbody></table>',
  },
  {
    key: 'top-bottom',
    label: 'Top / Bottom',
    when: '增长最快 vs 下滑最快、优劣势对比',
    html: '<div class="top-bottom"><div class="top-bottom__col"><div class="top-bottom__title">增长 Top</div>…</div><div class="top-bottom__col"><div class="top-bottom__title">下滑 Top</div>…</div></div>',
  },
  {
    key: 'comparison-matrix',
    label: '对比矩阵',
    when: '多对象多指标对比，重点是差距',
    html: '<div class="comparison-matrix"><div class="matrix-head">指标 / 对象</div><div class="matrix-row"><span>及时率</span><span class="matrix-cell is-good">98%</span><span class="matrix-cell is-bad">91%</span></div>…</div>',
  },
  {
    key: 'visual-rhythm',
    label: '版式节奏',
    when: '章节切换、重点强调、补充说明',
    html: '<div class="full-bleed">全宽色带</div><p class="drop-cap">首字下沉段落…</p><aside class="margin-note">侧边注：口径/解释</aside><div class="annotation"><span class="annotation__dot"></span>图上的关键标注</div>',
  },
];

export const REPORT_VISUAL_STYLES = [
  {
    key: 'editorial',
    label: '杂志编辑风',
    brief: '衬线标题、大留白、引言块、时间轴/分栏叙事，像一本年度特刊',
  },
  {
    key: 'cockpit',
    label: '深色驾驶舱',
    brief: '深色底、冷色/霓虹强调、密集网格、发光数字，适合运营监控',
  },
  {
    key: 'minimal',
    label: '极简黑白',
    brief: '单色、细线分隔、无阴影、强排版与数字对比，克制高级',
  },
  {
    key: 'boardroom',
    label: '董事会简报',
    brief: '超大数字、克制配色、一屏结论、少而精的图表',
  },
  {
    key: 'dataStory',
    label: '数据故事',
    brief: '渐变强调、非对称卡片、分节色带、图文节奏感强',
  },
] as const;

const layoutCatalog = REPORT_LAYOUT_KEYS.map(key => {
  const item = REPORT_LAYOUTS[key];
  return (
    `- ${key}（${item.label}）：适合 ${item.when}；参考结构：${item.sections}；` +
    `推荐元素：${item.elements.join(' / ')}；密度：${item.density}；注意：${item.avoid}`
  );
}).join('\n');

const styleCatalog = REPORT_VISUAL_STYLES.map(item => `- ${item.label}：${item.brief}`).join('\n');

const elementCatalog = REPORT_ELEMENT_KIT.map(
  item => `- ${item.label}（${item.key}）：${item.when}\n  ${item.html}`,
).join('\n');

/** 图表配方：解决模型默认只用 line/bar/pie 的问题。 */
export const CHART_RECIPE_PROMPT = `【图表配方（按数据形态选，不要默认只用折线/柱状/饼图）】
- 时间趋势：line/area，smooth + 渐变 areaStyle + symbol:'none'；关键点用 markPoint。
- 结构占比：treemap / sunburst / 堆叠柱，比饼图更适合多层结构；环形图中心放总数。
- 两期对比：dumbbell（两个 scatter + 连接线）或 slope（xAxis:['期初','期末']，每个对象一条 line）。
- 目标达成：bullet（bar + markLine 目标线）或 gauge；达成率环只用于单一指标。
- 变化归因：waterfall（两个 stacked bar series，底层透明，顶层显示增减）。
- 排名变化：slope 或 rank-list + delta，必须体现名次变化。
- 分布：boxplot / 直方图，标中位数和离群值。
- 流转：sankey（nodes + links）或 funnel，适合履约链路/库存流转。
- 多维能力：radar，指标 4~7 个，多个对象叠加。
- 日期密度：calendar + heatmap（coordinateSystem:'calendar'）。
- 多对象同指标：small multiples，多个 .ol-chart 用同一刻度，禁止拼成一张花图。
- 相关性：scatter / bubble，气泡大小表示第三维。
- 双轴：yAxis 数组 + bar/line 组合，只在量纲确实不同时使用。
图表统一要求：数据内嵌、中文标题/坐标/图例、颜色从 --rp-primary/--rp-success/--rp-danger 派生；图表数量由数据维度决定，不要为凑类型拆数据。`;

/** render_html_report 工具入参（完整 HTML 报告）。 */
export const htmlReportSchema = z.object({
  component: z
    .string()
    .default(HTML_REPORT_COMPONENT)
    .describe(`渲染组件名，固定用 ${HTML_REPORT_COMPONENT}`),
  title: z.string().describe('报告标题，中文'),
  subtitle: z.string().optional().describe('可选副标题/时间范围'),
  height: z
    .union([z.number(), z.string()])
    .optional()
    .describe('预览高度（px），传 320 或 "320px" 都可以'),
  template: z
    .string()
    .optional()
    .describe(
      '报告模板：daily=作业日报 / weekly=运营周报 / monthly=运营月报 / annual=年度报告 / ' +
        'inventory=库存快照 / exception=异常专报 / compare=多仓对比；' +
        '写中文（周报/年报/年度报告/库存快照/异常专报…）也可以，判断不了用 auto',
    ),
  layout: z
    .enum(['auto', ...REPORT_LAYOUT_KEYS])
    .optional()
    .describe(
      '结构蓝图：executive=高层摘要 / dashboard=运营看板 / narrative=叙事分析 / ' +
        'comparison=横向对比 / timeline=时间轴复盘；不确定用 auto',
    ),
  visualStyle: z
    .string()
    .optional()
    .describe(
      '视觉风格 brief（自由描述，如「杂志编辑风」「深色驾驶舱」「极简黑白」）。' +
        '不同报告请主动使用不同风格，不要每份都长一样。',
    ),
  period: z.string().optional().describe('统计期间，如 2025-08-01 ~ 2025-08-31'),
  scope: z.string().optional().describe('统计口径，如 全仓合计 / 华东仓 / 某货主 / 含冻结库存'),
  sources: z
    .union([z.array(z.string()).max(8), z.string()])
    .optional()
    .describe('数据来源与口径说明，数组或“顿号/逗号分隔的字符串”都可以'),
  warnings: z
    .union([z.array(z.string()).max(8), z.string()])
    .optional()
    .describe('数据质量问题（空值/截断/负库存等），数组或分隔字符串都可以'),
  html: z
    .string()
    .describe(
      '报告正文 HTML 片段（不要 <html>/<head>/<body>）。' +
        '图表容器用 <div class="ol-chart" data-id="xxx" style="height:320px"></div>，' +
        '对应的 ECharts option 放到 charts.xxx 字段。禁止引用任何外部 CDN/脚本/图片链接。',
    ),
  css: z
    .string()
    .optional()
    .describe(
      '可选：报告 CSS 片段（会注入到基础样式之后）。可以自由定义 class、覆盖 CSS 变量、' +
        '调整字体/留白/色彩/网格；禁止 @import、外链字体/图片、expression/behavior。建议 8~30KB。',
    ),
  elements: z
    .array(z.string())
    .max(20)
    .optional()
    .describe(
      '可选：本轮实际使用的元素 class（如 timeline / risk-matrix / action-list / report-appendix）。' +
        '前端会自动从 HTML 中提取，这里只用于补全。',
    ),
  charts: z
    .union([z.record(z.string(), z.record(z.string(), z.any())), z.string()])
    .optional()
    .describe(
      '图表：key 对应 .ol-chart 的 data-id，value 为标准 ECharts option（数据内嵌）；也接受 JSON 字符串',
    ),
});

export type HtmlReportSchema = z.infer<typeof htmlReportSchema>;

/**
 * HTML 报告工具描述。
 * 目标：给模型足够的结构与视觉自由度，同时保留组件套件、数据规则和安全边界。
 */
export const HTML_REPORT_TOOL_DESCRIPTION =
  '当用户要"一份完整报告 / 日报 / 周报 / 月报 / 年报 / 年度报告 / 汇报大屏"，需要分节、卡片与明细时，调用本工具直接产出 HTML 报告。' +
  '\n【第一原则】结构服务于内容，不要每份都套同一套模板。' +
  '\n1) 先选 layout（本轮优先参考系统提示里的版式要求；没有就用 auto）：' +
  `\n${layoutCatalog}` +
  '\n2) 再选 visualStyle（尽量和上一份不同）：' +
  `\n${styleCatalog}` +
  '\n3) 写样式：css 字段是完整 CSS 片段，会注入到基础样式之后；也可以在 html 里写 <style> 或用内联 style。' +
  '基础 CSS 已经提供排版、表格、卡片、图表容器和暗色主题，你只需要写“差异化”的部分。' +
  '\n【自由 CSS 规范】' +
  '\n- 优先覆盖 CSS 变量：--rp-primary / --rp-primary-2 / --rp-bg / --rp-surface / --rp-surface-2 / --rp-border / --rp-t1 / --rp-t2 / --rp-t3 / --rp-radius / --rp-gap；' +
  '\n- 不要给 body/.report 写死浅色背景，用 var(--rp-bg)/var(--rp-surface)，否则暗色主题会失效；' +
  '\n- 字体只用系统字体栈（如 Georgia, "Songti SC", "Noto Serif SC", serif 或 -apple-system, "PingFang SC", sans-serif），禁止 @font-face 外链；' +
  '\n- 禁止 @import、url(http...)、url(//...)、expression()、behavior、-moz-binding；图片只能用纯 CSS 绘制，或 data:image/png|jpeg|gif|webp；' +
  '\n- 至少处理 @media(max-width:820px)，保证窄屏不横向溢出；' +
  '\n- 打印/导出：不要用 @media print 隐藏核心内容，不要依赖 position:fixed；' +
  '\n- CSS 建议 8~30KB，超过 60KB 会被截断；!important 只在覆盖基础样式时少量使用。' +
  '\n【可选基础组件（可自由组合、改样式，也可以完全不用）】' +
  '\n- 外层：<div class="report"> → 顶部 <div class="report-header"><h1 class="report-title">标题</h1>' +
  '<div class="report-sub">时间/口径</div><div class="report-meta"><span class="meta-chip">…</span></div></div>' +
  '\n- 分节：<section class="section"><div class="section-head"><span class="section-no">1</span><div>' +
  '<div class="section-title">标题</div><div class="section-sub">副标题</div></div></div> …</section>' +
  '\n- 卡片/网格：<div class="card"><div class="card-title">标题</div> …</div>，并排用 <div class="grid grid-2"> 或 grid-3' +
  '\n- 结论/提示：<div class="callout">…</div>、<div class="notice is-warning|is-danger|is-success|is-info">…</div>' +
  '\n- 数字：.stat-grid > .stat（.stat-label/.stat-value/.stat-foot/.stat-note）、.compare-grid > .compare、' +
  '.ring-grid > .ring（style="--v:83"）、.rank-list > .rank-row、.chips > .chip；也可以自己写 .hero-number 等自定义 class' +
  '\n- 条形/进度/分布：.bar-row（.bar-fill 的 width 控制比例）、.progress-row、.dist-bar + .dist-legend' +
  '\n- 风险：.risk-list > .risk-item.is-danger|is-warning|is-success；表格：<table> + thead/tbody' +
  '\n- 图表：<div class="ol-chart" data-id="c1" style="height:320px"></div>，option 放进 charts.c1' +
  '\n4) 表格规则：正文最多 10 行，超出只放 Top 10 并用一行「其余 N 项合计」收尾；' +
  '每一行的 <td> 数量必须与表头 <th> 完全一致，空值也要输出 <td>—</td>，缺单元格会导致整行错位；' +
  '数字列加 class="num"，文本列加 class="txt"（基础样式会自动对齐）。' +
  '\n【报告元素库】' +
  '\n- 数据型元素（至少 2 个）：hero-kpi / bullet-row / small-multiples / heat-table / top-bottom / comparison-matrix / risk-matrix；' +
  '\n- 叙事型元素（至少 2 个）：report-cover / finding-list / so-what / pull-quote / timeline / action-list / report-appendix；' +
  '\n- 第一个 section 必须是数据屏：2~4 个 Hero KPI + 1 张主图/热力表；' +
  '\n- 每个分析 section 至少包含 1 个数据块（图/表/矩阵/排行榜），纯文字 section 最多 1 个；' +
  '\n- 不要整份报告只有时间轴、发现列表、行动清单和附录；' +
  `\n${elementCatalog}` +
  '\n5) 图表规则：数量由数据维度决定，只有一个维度时 1 张图 + 数字卡即可；类型按数据选' +
  '（line / bar / 堆叠柱 / 水平条 / pie / 环形 / radar / funnel / gauge / scatter / heatmap / ' +
  'treemap / sunburst / sankey / boxplot / calendar heatmap / waterfall / dumbbell / slope / small multiples），' +
  '不要为了凑类型而拆数据；图表容器必须写死高度，option 数据内嵌，标题/坐标/图例用中文。' +
  '\n- 高级图的具体 option 要点见系统提示里的【图表配方】。' +
  '\n6) 数字格式：千分位分隔；金额/数量 ≥1 亿写「亿」、≥1 万写「万」，保留 1~2 位小数；' +
  '百分比保留 1 位小数；增长用 <span class="delta up">↑ x.x%</span>、下降用 ' +
  '<span class="delta down">↓ x.x%</span>、持平用 <span class="delta flat">→ 0.0%</span>；' +
  '关键数字要能看出时间范围与口径。' +
  '\n7) 左侧章节导航、生成时间页脚、水印、数字千分位由页面自动处理，你不要自己写目录/页脚；' +
  '报告会自动剥离 <script> 与所有外部资源（CDN/图片链接），写了也不会生效。' +
  '\n8) 所有数值必须来自真实查询，不得编造；查询为空时不要调用本工具；调用后正文只写一句"报告已生成"。' +
  '\n9) 除 html/charts/css 外，还要填 template（模板）、layout（结构）、visualStyle（视觉风格）、' +
  'period（统计期间）、scope（统计口径）、sources（数据表与口径说明）、warnings（数据质量问题）；' +
  '这些会渲染到报告页脚和数据质量提示里。' +
  '\n10) 本工具不会因为格式问题失败：表格列数不一致、图表缺 option 会由前端兜底并显示为“数据质量提示”，' +
  '你不需要反复重试或重新生成整份报告。' +
  '\n11) 数据库可能很大：优先用聚合 SQL（GROUP BY / SUM / COUNT / TOP），不要拉全量明细；' +
  '整份报告的 SQL 查询尽量控制在 3~5 次以内，一次 SQL 尽量同时取回多个指标。' +
  "\ncomponent 固定为 ${HTML_REPORT_COMPONENT}。";

/**
 * 工具描述（模型看到的说明）。
 * 组件目录与 schema 保持一致，避免多处硬编码。
 */
export const REPORT_TOOL_DESCRIPTION =
  '当用户的问题属于数据分析（趋势、分布、对比、占比、排行、汇总、结构变化等）或要求看报表/日报/图表时调用本工具，' +
  '前端会渲染成一份可视化报表（类似仪表盘 / 汇报大屏）。' +
  '\n排版建议（blocks 顺序）：' +
  '\n- 用 section 分节：每个主题用 section 开头（给 no 编号 + title，可带英文 subtitle），前端会据此生成目录导航；' +
  '\n- section 后接 summary（核心结论）或 notice（预警/提示）；' +
  '\n- 关键指标用 kpi（2~4 个一排，补 note 说明口径）；' +
  '\n- 完成率/占比对比用 hbar；达成情况用 progress；一排小指标用 chips；构成分布用 dist；' +
  '\n- 趋势/对比图用 chart（标准 ECharts option，数据内嵌，中文标题/坐标/图例）；' +
  '\n- 明细用 table；风险与总结用 risk（danger/warning/success 配色）；最后可用 insights 收尾。' +
  '\n规则：数值必须来自真实查询，不得编造；同一维度只放一张最合适的图；查询为空时不要调用本工具；' +
  '调用后正文只写 1~2 句话，不重复报表里的数字。' +
  `\ncomponent 固定填 ${REPORT_COMPONENT}。`;
