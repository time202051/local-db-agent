export const WMS_METRICS = [
    {
        key: '入库单量',
        aliases: ['收货单量', '入库量', '入库单数'],
        unit: '单',
        formula: '按入库单头计数，排除已作废/已取消单据',
        dimensions: ['仓库', '货主', '单据类型', '日期'],
        chart: 'bar / line',
    },
    {
        key: '出库单量',
        aliases: ['发货单量', '出库量', '出库单数'],
        unit: '单',
        formula: '按出库单头计数，排除已作废/已取消单据',
        dimensions: ['仓库', '货主', '客户', '日期'],
        chart: 'bar / line',
    },
    {
        key: '出库件数',
        aliases: ['发货件数', '出库数量'],
        unit: '件',
        formula: '按出库明细数量汇总（注意区分行数与件数）',
        dimensions: ['仓库', '货主', '品类', '日期'],
        chart: 'bar / line',
    },
    {
        key: '库存总量',
        aliases: ['库存数量', '在库量'],
        unit: '件 / 托',
        formula: '当前可用库存 + 占用库存（按查询口径说明是否含冻结、在途）',
        dimensions: ['仓库', '库区', '货主', '品类'],
        chart: 'bar / line',
    },
    {
        key: '库存金额',
        aliases: ['库存价值', '库存成本'],
        unit: '元',
        formula: '库存数量 × 成本单价；无成本字段时明确说明无法计算',
        dimensions: ['仓库', '货主', '品类'],
        chart: 'bar / pie',
    },
    {
        key: '库存周转率',
        aliases: ['周转次数', '周转天数'],
        unit: '次 / 天',
        formula: '期间出库成本 ÷ 期间平均库存成本；或 期间出库件数 ÷ 平均库存件数',
        dimensions: ['仓库', '货主', '品类', '月'],
        chart: 'line',
    },
    {
        key: '库龄结构',
        aliases: ['库龄分布', '库龄'],
        unit: '件 / 占比',
        formula: '按批次入库日期至今的天数分档：0-30 / 31-60 / 61-90 / 90+ 天',
        dimensions: ['仓库', '货主', '品类', '库龄段'],
        chart: 'stacked-bar',
    },
    {
        key: '入库及时率',
        aliases: ['收货及时率', '上架及时率'],
        unit: '%',
        formula: '在允许时效内完成的入库单量 ÷ 应完成入库单量；时效阈值要写清楚',
        dimensions: ['仓库', '货主', '日期'],
        chart: 'line / dual-axis',
        note: '阈值（如 4 小时/24 小时）必须来自真实配置或明确说明假设',
    },
    {
        key: '出库及时率',
        aliases: ['发货及时率', '出库准时率'],
        unit: '%',
        formula: '在承诺时效内完成的出库单量 ÷ 应完成出库单量',
        dimensions: ['仓库', '货主', '日期'],
        chart: 'line / dual-axis',
    },
    {
        key: '拣货及时率',
        aliases: ['拣货准时率'],
        unit: '%',
        formula: '在波次要求时间内完成的拣货任务数 ÷ 拣货任务总数',
        dimensions: ['仓库', '库区', '日期'],
        chart: 'line',
    },
    {
        key: '发货准时率',
        aliases: ['准时发货率', 'OTD'],
        unit: '%',
        formula: '按计划发运时间准时发运的单量 ÷ 应发运单量',
        dimensions: ['仓库', '承运商', '日期'],
        chart: 'line',
    },
    {
        key: '拣货准确率',
        aliases: ['拣选准确率', '差错率'],
        unit: '%',
        formula: '1 - 差错行数 ÷ 拣货总行数；差错定义要与业务确认（复核差异/客诉）',
        dimensions: ['仓库', '人员', '日期'],
        chart: 'line / dual-axis',
    },
    {
        key: '库存准确率',
        aliases: ['账实相符率', '盘点准确率'],
        unit: '%',
        formula: '1 - 盘点差异 SKU 数 ÷ 盘点 SKU 总数',
        dimensions: ['仓库', '库区', '期间'],
        chart: 'line',
    },
    {
        key: '库容利用率',
        aliases: ['库位利用率', '仓容利用率'],
        unit: '%',
        formula: '已占用库位数 ÷ 可用库位总数；或已用体积 ÷ 总库容',
        dimensions: ['仓库', '库区'],
        chart: 'gauge / ring',
    },
    {
        key: '呆滞库存',
        aliases: ['滞销库存', '长库龄库存'],
        unit: '件 / 金额',
        formula: '库龄超过 N 天且期间无出库的库存；N 需明确（常见 90/180 天）',
        dimensions: ['仓库', '货主', '品类'],
        chart: 'bar',
    },
    {
        key: '临期/过期库存',
        aliases: ['效期预警', '近效期'],
        unit: '件 / 金额',
        formula: '按效期剩余天数分档：<0 已过期、0-30 临期、31-90 关注',
        dimensions: ['仓库', '货主', '品类', '效期段'],
        chart: 'stacked-bar',
    },
    {
        key: '异常单量',
        aliases: ['异常任务', '作业异常'],
        unit: '单 / 行',
        formula: '超时未发、库存差异、负库存、缺货、破损等异常按类型计数',
        dimensions: ['仓库', '异常类型', '日期'],
        chart: 'bar / dist',
    },
    {
        key: '人效',
        aliases: ['人均效率', '人均单量'],
        unit: '单/人/天',
        formula: '期间完成单量 ÷ 期间出勤人天；无人力数据时明确说明无法计算',
        dimensions: ['仓库', '班组', '日期'],
        chart: 'bar / line',
    },
];
const metricLines = WMS_METRICS.map(m => `- ${m.key}（别名：${m.aliases.join('/')}；单位：${m.unit}；口径：${m.formula}；` +
    `维度：${m.dimensions.join('/')}；推荐图：${m.chart}${m.note ? `；注意：${m.note}` : ''}）`).join('\n');
export const WMS_METRIC_PROMPT = `【WMS 指标口径（重要）】
用户是做仓储管理系统的，报告里的指标必须按下面这套业务口径计算，保证同一个指标每次算法一致。
${metricLines}

指标使用规则：
1. 先 list_tables / get_table_schema 确认真实表名和字段，再把口径映射到真实字段；字段对不上就说明“当前数据库无法计算该指标”，不要臆造字段或表名。
2. 同一个指标在同一份报告里只能有一种口径，不允许前后不一致。
3. 单量类必须区分「单」「行」「件」「托」，不要混用；单位要写在数字旁边。
4. 目标值 / 计划值只有在数据库里确实存在计划表、目标字段或考核配置时才输出；查不到就不写目标，严禁编造目标、达标率或缺口。
5. 时间范围（期间）、统计口径（全仓/单仓、含税/不含税、是否含冻结/在途）必须能在标题、副标题或脚注里看到。
6. 及时率、准确率、周转率这类比率指标，要写清楚分子分母和阈值假设；数据缺失时直接说明缺什么。`;
/** 供报告正文脚注使用：把用到的指标口径压缩成一句话 */
export function metricFormula(key) {
    const hit = WMS_METRICS.find(m => m.key === key || m.aliases.includes(key));
    return hit ? hit.formula : null;
}
