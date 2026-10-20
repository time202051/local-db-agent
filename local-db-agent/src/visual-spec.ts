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
      '报告模板：daily=作业日报 / weekly=运营周报 / monthly=运营月报 / ' +
        'inventory=库存快照 / exception=异常专报 / compare=多仓对比；' +
        '写中文（周报/库存快照/异常专报…）也可以，判断不了用 auto',
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
      '报告正文 HTML 片段（不要 <html>/<head>/<body>，可含 <style>）。' +
        '图表容器用 <div class="ol-chart" data-id="xxx" style="height:320px"></div>，' +
        '对应的 ECharts option 放到 charts.xxx 字段。禁止引用任何外部 CDN/脚本/图片链接。',
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
 * 注入本地 ECharts，禁止外部资源；用固定的设计规范保证多份报告风格一致。
 */
export const HTML_REPORT_TOOL_DESCRIPTION =
  '当用户要"一份完整报告 / 日报 / 周报 / 月报 / 汇报大屏"，需要分节、大量卡片与明细时，调用本工具直接产出 HTML 报告。' +
  '\n【硬性要求】' +
  '\n1) html 只写正文片段（不要 <html>/<head>/<body>）；禁止任何外部 CDN、<script>、<img src="http...">。' +
  '\n2) 必须使用下面这套固定类名（样式已内置，多写内联 style 只会破坏统一）：' +
  '\n- 外层：<div class="report"> → 顶部区 <div class="report-header"><h1 class="report-title">标题</h1>' +
  '<div class="report-sub">时间/口径</div><div class="report-meta"><span class="meta-chip">…</span></div></div>' +
  '\n- 分节：<section class="section"><div class="section-head"><span class="section-no">1</span><div>' +
  '<div class="section-title">报告概要</div><div class="section-sub">Executive Summary</div></div></div> …</section>' +
  '\n- 卡片：<div class="card"><div class="card-title">标题</div> …</div>（并排用 <div class="grid grid-2">…</div> 或 grid-3）' +
  '\n- 核心结论：<div class="callout"><div class="callout-title">核心结论</div><p>…</p></div>' +
  '\n- 提示：<div class="notice is-warning|is-danger|is-success|is-info">…</div>' +
  '\n- 完成率横条：<div class="bar-row"><div class="bar-label">焊装</div>' +
  '<div class="bar-track"><div class="bar-fill" style="width:83%;background:#ef4444"></div></div>' +
  '<div class="bar-value">83.21%</div></div>' +
  '\n- 进度条：<div class="progress-row"><div class="progress-top"><span>月度目标</span><b>91.02%</b></div>' +
  '<div class="progress-track"><div class="progress-fill" style="width:91%"></div></div>' +
  '<div class="progress-status">预计达标</div></div>' +
  '\n- 小指标：<div class="chips"><div class="chip"><div class="chip-value">1,280<small>万</small></div>' +
  '<div class="chip-label">销售额</div></div>…</div>' +
  '\n- 分布：<div class="dist-bar"><div class="dist-seg" style="flex:5;background:#ef4444">5</div>…</div>' +
  '<div class="dist-legend"><span><i style="background:#ef4444"></i>高风险<b>5</b></span>…</div>' +
  '\n- 表格（正文最多 10 行，超出只放 Top 10 并用一行「其余 N 项合计」收尾，不要把完整明细塞进正文、也不要用折叠；' +
  '每一行的 <td> 数量必须与表头 <th> 完全一致，空值也要输出 <td>—</td>，缺单元格会导致整行错位；' +
  '除第一列外所有列默认右对齐，表头与数值自动对齐；数字列加 class="num"，文本列如状态/备注/负责人加 class="txt" 让它左对齐）：' +
  '<table><thead><tr><th>名称</th><th class="num">数量</th><th class="txt">备注</th></tr></thead>' +
  '<tbody><tr><td>A</td><td class="num">123</td><td class="txt">正常</td></tr></tbody></table>' +
  '\n- 风险/总结：<div class="risk-list"><div class="risk-item is-danger"><div class="risk-title">标题</div>' +
  '<div class="risk-text">说明</div></div>…</div>' +
  '\n- 图表：<div class="ol-chart" data-id="c1" style="height:320px"></div>，option 放进 charts.c1' +
  '（标准 ECharts option，数据内嵌，中文标题/坐标/图例）。' +
  '\n- 【数字展示】报告是给领导看的，数字要大、要突出，优先用下面这几种，不要通篇都是表格：' +
  '\n  · 英雄数字卡（一屏最上面放 2~4 个）：<div class="stat-grid"><div class="stat">' +
  '<div class="stat-label">本月销售额<span class="badge is-success">达标</span></div>' +
  '<div class="stat-value">1,284.5<span class="unit">万元</span></div>' +
  '<div class="stat-foot"><span class="delta up">↑ 12.3%</span><span class="muted">环比</span></div>' +
  '<div class="stat-note">口径：含税 · 数据截至 10-18</div></div>…</div>' +
  '（可选 tone：class="stat is-success" / is-warning / is-danger；迷你趋势写 <div class="spark">' +
  '<i style="height:40%"></i><i style="height:62%"></i>…</div>，每根柱一个 i，最后一根加 class="is-last"）' +
  '\n  · 同比/环比对比：<div class="compare-grid"><div class="compare">' +
  '<div class="compare-title">销售额<span class="badge is-warning">预警</span></div>' +
  '<div class="compare-now">1,284.5<span class="unit">万元</span></div>' +
  '<div class="compare-foot"><span class="delta up">↑ 140.6</span><span>较上期</span>' +
  '<span class="compare-prev">1,143.9 万</span></div></div>…</div>' +
  '\n  · 达成率环：<div class="ring-grid"><div class="ring is-success" style="--v:83">' +
  '<div class="ring-dial"><div class="ring-center"><span class="ring-value">83<span class="ring-unit">%</span></span>' +
  '</div></div><div class="ring-label">月度目标完成率</div></div>…</div>' +
  '（--v 填 0~100 的纯数字，不带 %；class 可加 is-success / is-warning / is-danger）' +
  '\n  · 排行榜 TOP N：<div class="rank-list"><div class="rank-row"><span class="rank-no">1</span>' +
  '<span class="rank-name">产品A</span><span class="rank-bar"><i style="width:82%"></i></span>' +
  '<span class="rank-value">1,280<small>万</small></span><span class="rank-share">28.4%</span></div>…</div>' +
  '（rank-bar 的 width 按本组最大值折算成 100%；前 3 名序号自动显示金/银/铜）' +
  '\n- 【数字格式】必须统一：千分位分隔；金额/数量 ≥1 亿写「亿」、≥1 万写「万」，保留 1~2 位小数，单位放 <span class="unit">；' +
  '百分比保留 1 位小数；增长用 <span class="delta up">↑ x.x%</span>、下降用 <span class="delta down">↓ x.x%</span>、' +
  '持平用 <span class="delta flat">→ 0.0%</span>；状态用 <span class="badge is-success|is-warning|is-danger|is-info">达标/预警/落后</span>；' +
  '每个关键数字都要能看出时间范围与口径（写在 report-sub 或 stat-note 里）；表格里数字列加 class="num"、文本列加 class="txt"（默认除第一列外都是右对齐，表头与数值才会对齐）。' +
  '\n- 【增强展示，有真实数据才用，没有就省略】' +
  '\n  · 目标/缺口（仅当库里确有目标/计划数据）：<div class="stat-target"><span>目标 1,200 万</span><span>缺口 116 万</span><span class="delta down">差 9.7%</span></div>' +
  '\n  · 同环比三段式：<span class="delta up">↑ 140.6 万 (+12.3%)</span>' +
  '\n  · 排名变化 / 累计占比：<span class="rank-delta up">↑2</span>、<span class="rank-cum">累计 62.4%</span>' +
  '\n  · 风险项带分级与建议：<div class="risk-item is-danger"><div class="risk-title">超时未发<span class="badge is-danger">高</span></div><div class="risk-text">说明</div><div class="risk-impact">影响：1,240 单 / 86 万元</div><div class="risk-action">建议：...</div></div>' +
  '\n3) 除 横条宽度/颜色、分布 flex、图表高度、.spark i 的高度、.rank-bar i 的宽度、.ring 的 --v 外，不要写其它内联 style；' +
  '颜色只用：主 #4f7cff、成功 #16a34a、危险 #ef4444、警告 #f59e0b。' +
  '\n4) 结构参考：report-header → notice → section(1 报告概要：callout + stat-grid/ring-grid) → ' +
  'section(2 分析：card + 图表 + compare-grid/rank-list/dist + 表格) → section(3 风险总结：risk-list)。' +
  '\n5) 图表要多样、好看：每份报告至少 2~4 张图，类型尽量不同（line 折线 / bar 柱状 / 堆叠柱 / 水平条 / pie 饼 / 环形 / radar 雷达 / funnel 漏斗 / gauge 仪表盘 / scatter 散点 / heatmap 热力），不要重复同一类型。' +
  '图表容器必须写死高度，如 <div class="ol-chart" data-id="c1" style="height:340px"></div>，option 放进 charts.c1（数据内嵌；配色/tooltip 前端会自动补全）；' +
  '并排图用 <div class="grid grid-2"> 各包一个 card。' +
  '\n6) 布局要因内容而异，不要每份都同一套结构：按数据特点组合 分节 / 卡片 / 图表 / 数字卡 / 环 / 排行榜 / 对比 / 表格 / 进度 / 分布 / 风险 等。' +
  '\n7) 所有数值必须来自真实查询，不得编造；查询为空时不要调用本工具；调用后正文只写一句"报告已生成"。' +
  '\n8) 左侧章节导航、生成时间页脚、水印、数字千分位由页面自动处理，你不要自己写目录/页脚；报告会自动剥离 <script> 与所有外部资源（CDN/图片链接），写了也不会生效。' +
  '\n9) 除 html/charts 外，还要填 template（模板）、period（统计期间）、scope（统计口径）、sources（数据表与口径说明）、warnings（数据质量问题：空值/截断/负库存等）；这些会渲染到报告页脚和数据质量提示里。' +
  '\n10) 本工具不会因为格式问题失败：表格列数不一致、图表缺 option 会由前端兜底并在报告顶部显示为“数据质量提示”，你不需要反复重试或重新生成整份报告。' +
  '\n11) 数据库可能很大：优先用聚合 SQL（GROUP BY / SUM / COUNT / TOP），不要拉全量明细；整份报告的 SQL 查询尽量控制在 3~5 次以内，一次 SQL 尽量同时取回多个指标。' +
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
