export const REPORT_TEMPLATES = {
    annual: {
        label: '年度报告',
        when: '用户说“年度 / 年报 / 年度报告 / 年度总结 / 年度经营分析 / 年度复盘”',
        layouts: ['timeline', 'executive', 'narrative'],
        styles: ['董事会简报', '杂志编辑风', '数据故事'],
        sections: [
            '0 封面：年度关键词 + 核心数字 + 数据范围（report-cover）',
            '1 年度总览：3~4 个核心数字 + 一句话结论（hero-kpi / finding-list）',
            '2 年度走势：12 个月或 4 个季度趋势 + 时间轴（timeline），标注峰值、拐点与异常',
            '3 结构变化：业务/品类/仓库/客户结构（treemap / 堆叠柱 / 分布）',
            '4 关键排名：Top/Bottom 与同比变化（top-bottom / slope / 表格）',
            '5 年度复盘：做对了什么 / 没做到什么 / 原因（finding-list + so-what + pull-quote）',
            '6 风险与行动：风险矩阵 + 下一年 2~4 条动作（risk-matrix + action-list）',
            '7 附录：口径、数据来源、术语表（report-appendix）',
        ],
        metrics: ['入库单量', '出库单量', '出库及时率', '拣货准确率', '库存周转率', '异常单量', '库存金额'],
        charts: ['line（12 个月）', 'stacked-bar（结构变化）', 'bar（排名）', 'funnel/radar（能力）'],
    },
    daily: {
        label: '作业日报',
        when: '用户说“日报 / 今天 / 昨日作业情况 / 今日出入库”',
        layouts: ['dashboard', 'executive'],
        styles: ['深色驾驶舱', '极简黑白'],
        sections: [
            '1 数据概览：4 个核心数字（.stat）+ 一句核心结论（.callout）',
            '2 出入库趋势：近 7~14 天折线，标注异常峰值',
            '3 时效与准确率：及时率/准确率趋势或对比',
            '4 异常与风险：异常分类 + Top 明细 + 建议',
        ],
        metrics: ['入库单量', '出库单量', '出库件数', '出库及时率', '拣货及时率', '拣货准确率', '异常单量'],
        charts: ['line（趋势）', 'bar（仓库/品类对比）', 'pie（结构占比）'],
    },
    weekly: {
        label: '运营周报',
        when: '用户说“周报 / 本周 / 上周 / 周度运营”',
        layouts: ['dashboard', 'comparison', 'narrative'],
        styles: ['深色驾驶舱', '数据故事', '杂志编辑风'],
        sections: [
            '1 核心结论：一段话 + 3~4 个关键数字',
            '2 关键指标与目标达成：.stat 数字卡 + .ring 达成率（有目标数据时才写目标）',
            '3 趋势分析：周内/近 8 周趋势，含同环比',
            '4 排名：仓库 / 货主 / 品类 TOP 10（.rank-list，带变化与累计占比）',
            '5 履约链路：下单→分配→拣货→复核→发运 漏斗',
            '6 风险与建议：分级异常 + 影响 + 建议动作',
        ],
        metrics: ['入库单量', '出库单量', '出库及时率', '发货准时率', '拣货准确率', '库存周转率', '异常单量'],
        charts: ['line（趋势）', 'funnel（履约）', 'bar（排名/对比）', 'pareto（ABC）'],
    },
    monthly: {
        label: '运营月报',
        when: '用户说“月报 / 本月 / 上月 / 月度运营 / 月度总结”',
        layouts: ['dashboard', 'executive', 'timeline'],
        styles: ['董事会简报', '深色驾驶舱', '数据故事'],
        sections: [
            '1 核心结论：一段话 + 3~4 个关键数字',
            '2 关键指标与目标达成：.stat 数字卡 + .ring 达成率（有目标数据时才写目标）',
            '3 月度趋势：近 12 个月折线 + 同环比',
            '4 排名：仓库 / 货主 / 品类 TOP 10（带变化与累计占比）',
            '5 履约与效率：漏斗 + 双轴（单量 vs 及时率）',
            '6 风险与下月建议：分级异常 + 影响 + 建议动作',
        ],
        metrics: ['入库单量', '出库单量', '库存周转率', '出库及时率', '拣货准确率', '呆滞库存', '异常单量'],
        charts: ['line（12 个月）', 'funnel（履约）', 'pareto（ABC）', 'dual-axis（单量+及时率）'],
    },
    inventory: {
        label: '库存快照',
        when: '用户说“库存 / 快照 / 库存结构 / 库龄 / 周转 / 呆滞 / 临期”',
        layouts: ['dashboard', 'comparison'],
        styles: ['深色驾驶舱', '极简黑白'],
        sections: [
            '1 库存总览：总量/金额/周转 + 核心结论',
            '2 周转与结构：周转趋势 + 货主/品类占比',
            '3 库龄分布：0-30/31-60/61-90/90+ 堆叠柱',
            '4 呆滞与临期：金额影响 + Top 明细（≤10 行）',
            '5 库容利用率：gauge / .ring（有库位数据时才写）',
        ],
        metrics: ['库存总量', '库存金额', '库存周转率', '库龄结构', '呆滞库存', '临期/过期库存', '库容利用率'],
        charts: ['line（周转）', 'stacked-bar（库龄/效期）', 'bar（呆滞 Top）', 'gauge（库容）'],
    },
    exception: {
        label: '异常专报',
        when: '用户说“异常 / 预警 / 超时 / 差异 / 缺货 / 呆滞 / 异常专报”',
        layouts: ['narrative', 'comparison'],
        styles: ['杂志编辑风', '极简黑白'],
        sections: [
            '1 异常总览：异常总量、影响单量/金额、按严重度分级',
            '2 分类分布：按仓库/类型/严重度分布',
            '3 明细：Top 10（超过用“其余 N 项合计”）',
            '4 原因分析与建议：每条高优异常给原因与动作',
        ],
        metrics: ['异常单量', '出库及时率', '库存准确率', '呆滞库存', '临期/过期库存'],
        charts: ['dist（分级分布）', 'bar（分类对比）', 'table（Top 10）'],
    },
    compare: {
        label: '多仓对比',
        when: '用户提到两个及以上仓库/货主的横向对比，或“各仓排名”',
        layouts: ['comparison', 'dashboard'],
        styles: ['董事会简报', '极简黑白'],
        sections: [
            '1 能力对比：雷达（单量/时效/准确率/周转/成本）',
            '2 指标排名：.rank-list（各仓单量、及时率、准确率）',
            '3 差异说明：领先/落后项 + 差距数值',
            '4 改进建议：针对落后仓给 2~4 条动作',
        ],
        metrics: ['入库单量', '出库单量', '出库及时率', '发货准时率', '拣货准确率', '库存周转率'],
        charts: ['radar（能力）', 'rank-list（排名）', 'bar（逐项对比）'],
    },
};
const templateLines = Object.keys(REPORT_TEMPLATES)
    .map(k => {
    const t = REPORT_TEMPLATES[k];
    return (`- ${k}（${t.label}）触发：${t.when}\n` +
        `  推荐 layout：${t.layouts.join(' / ')}；推荐 visualStyle：${t.styles.join(' / ')}\n` +
        `  section 参考（可删减/重排）：${t.sections.join(' → ')}\n` +
        `  指标：${t.metrics.join('、')}\n` +
        `  图表：${t.charts.join(' / ')}`);
})
    .join('\n');
export const TEMPLATE_PROMPT = `【WMS 报告模板】
调用 render_html_report 时，按用户意图选择 template 字段；判断不了就用 auto。
模板只是内容清单和推荐版式，不是固定骨架：按数据取舍、按 layout 重新组织。

${templateLines}

模板使用规则：
1. 用户明确说日报/周报/月报/年报/库存/异常/多仓对比时，选对应 template；不要把所有报告都写成月报。
2. section 是参考，不是必须逐条照抄；数据不支持某一节时删掉，不要编数据。
3. 年度报告必须体现“全年总览 → 阶段走势 → 结构变化 → 年度复盘 → 下一年重点”的时间推进，不要只把月报放大。
4. 第一屏要让领导一眼看到结论：核心数字 + 一句话结论；但不强制固定模块顺序。
5. 正文表格最多 10 行，超出用 Top 10 + “其余 N 项合计”。
6. “目标 / 达成率”只有库里确有目标数据时才输出，否则只做同环比，不要编目标。
7. 同一会话里连续生成报告时，主动更换 layout 和 visualStyle，避免每份看起来一样。
8. 数据密度优先：至少 2 个数据型元素（hero-kpi / bullet-row / small-multiples / heat-table /
   top-bottom / comparison-matrix / risk-matrix）+ 至少 2 个叙事型元素（封面 / 发现 / so-what /
   时间轴 / 行动清单 / 附录）；
9. 第一个 section 必须是数据屏（2~4 个 Hero KPI + 1 张主图/热力表）；每个分析 section 至少 1 个数据块；
   纯文字 section 最多 1 个。优先使用系统提示里【本轮报告元素】指定的元素，并换掉上一份用过的元素。`;
export function templateLabel(key) {
    if (!key || key === 'auto')
        return '';
    const t = REPORT_TEMPLATES[key];
    return t ? t.label : '';
}
