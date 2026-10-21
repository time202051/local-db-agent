import { REPORT_LAYOUTS, REPORT_VISUAL_STYLES, reportElementCategory, } from './visual-spec.js';
/**
 * 报告版式选择。
 *
 * 目的：即使 temperature 不高，也不要把每份报告都写成同一套结构。
 * 服务端按“模板 + 用户措辞 + 上一份版式 + 会话种子”稳定轮换 layout / visualStyle，
 * 再通过一条系统消息告诉模型本轮优先使用哪套；模型仍有最终决定权。
 */
const LAYOUT_CANDIDATES = {
    annual: ['timeline', 'executive', 'narrative'],
    monthly: ['dashboard', 'executive', 'timeline'],
    weekly: ['dashboard', 'comparison', 'narrative'],
    daily: ['dashboard', 'executive'],
    inventory: ['dashboard', 'comparison'],
    exception: ['narrative', 'comparison'],
    compare: ['comparison', 'dashboard'],
    auto: ['executive', 'dashboard', 'narrative', 'comparison', 'timeline'],
};
const STYLE_CANDIDATES = {
    annual: ['董事会简报', '杂志编辑风', '数据故事'],
    monthly: ['董事会简报', '深色驾驶舱', '数据故事'],
    weekly: ['深色驾驶舱', '数据故事', '杂志编辑风'],
    daily: ['深色驾驶舱', '极简黑白'],
    inventory: ['深色驾驶舱', '极简黑白'],
    exception: ['杂志编辑风', '极简黑白'],
    compare: ['董事会简报', '极简黑白'],
    auto: REPORT_VISUAL_STYLES.map(item => item.label),
};
/** 每份报告优先使用的“特色元素”组合，用来保证元素丰富度并避免连续重复。 */
const FEATURE_ELEMENT_SETS = {
    annual: [
        ['report-cover', 'hero-kpi', 'heat-table', 'timeline', 'action-list'],
        ['hero-kpi', 'small-multiples', 'comparison-matrix', 'finding-list', 'report-appendix'],
        ['bullet-row', 'top-bottom', 'risk-matrix', 'so-what', 'pull-quote'],
    ],
    monthly: [
        ['report-cover', 'hero-kpi', 'comparison-matrix', 'action-list'],
        ['hero-kpi', 'small-multiples', 'heat-table', 'finding-list', 'report-appendix'],
        ['bullet-row', 'top-bottom', 'risk-matrix', 'so-what', 'action-list'],
    ],
    weekly: [
        ['hero-kpi', 'small-multiples', 'heat-table', 'finding-list', 'so-what'],
        ['report-cover', 'bullet-row', 'top-bottom', 'finding-list', 'action-list'],
        ['hero-kpi', 'comparison-matrix', 'risk-matrix', 'so-what', 'report-appendix'],
    ],
    daily: [
        ['hero-kpi', 'bullet-row', 'top-bottom', 'so-what', 'action-list'],
        ['hero-kpi', 'small-multiples', 'heat-table', 'finding-list', 'so-what'],
    ],
    inventory: [
        ['hero-kpi', 'comparison-matrix', 'heat-table', 'top-bottom', 'so-what', 'action-list'],
        ['hero-kpi', 'bullet-row', 'risk-matrix', 'finding-list', 'action-list'],
    ],
    exception: [
        ['risk-matrix', 'top-bottom', 'finding-list', 'so-what', 'action-list'],
        ['comparison-matrix', 'heat-table', 'timeline', 'finding-list', 'report-appendix'],
    ],
    compare: [
        ['comparison-matrix', 'top-bottom', 'risk-matrix', 'so-what', 'action-list'],
        ['hero-kpi', 'bullet-row', 'small-multiples', 'finding-list', 'report-appendix'],
    ],
    auto: [
        ['report-cover', 'hero-kpi', 'heat-table', 'finding-list', 'action-list'],
        ['hero-kpi', 'small-multiples', 'comparison-matrix', 'so-what', 'report-appendix'],
        ['bullet-row', 'top-bottom', 'risk-matrix', 'timeline', 'action-list'],
    ],
};
/** 用户措辞 → 优先版式。命中后把该版式提到候选第一位，但仍参与轮换。 */
const KEYWORD_LAYOUTS = [
    { re: /给领导|老板|汇报|决策|摘要|一页|executive/i, layout: 'executive' },
    { re: /年度|年报|同比|全年|季度|复盘|时间轴|里程碑|timeline/i, layout: 'timeline' },
    { re: /对比|多仓|环比|差距|排名|benchmark|comparison/i, layout: 'comparison' },
    { re: /异常|原因|专题|分析报告|深度|发现|narrative/i, layout: 'narrative' },
    { re: /看板|监控|日报|周报|dashboard/i, layout: 'dashboard' },
];
/** 在模型选模板之前，先从用户原话里粗略判断报告类型。 */
export function guessTemplateFromText(text) {
    const raw = text || '';
    if (/年度|年报|全年|年度报告|年度总结/.test(raw))
        return 'annual';
    if (/月报|月度|本月|上月/.test(raw))
        return 'monthly';
    if (/周报|周度|本周|上周/.test(raw))
        return 'weekly';
    if (/日报|今日|昨日|当天/.test(raw))
        return 'daily';
    if (/库存|库龄|呆滞|临期|周转/.test(raw))
        return 'inventory';
    if (/异常|预警|超时|差异|缺货/.test(raw))
        return 'exception';
    if (/对比|多仓|环比|同比|排名/.test(raw))
        return 'compare';
    return 'auto';
}
function fnv1a(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
function rotate(list, seed, previous) {
    if (!list.length)
        return undefined;
    let index = fnv1a(seed) % list.length;
    if (previous && list.length > 1 && list[index] === previous) {
        index = (index + 1) % list.length;
    }
    return list[index];
}
function overlapRatio(left, right) {
    if (!left.length || !right.length)
        return 0;
    const rightSet = new Set(right);
    const hit = left.filter(item => rightSet.has(item)).length;
    return hit / Math.min(left.length, right.length);
}
function categoryCounts(elements) {
    let data = 0;
    let narrative = 0;
    elements.forEach(key => {
        const category = reportElementCategory(key);
        if (category === 'data')
            data += 1;
        if (category === 'narrative')
            narrative += 1;
    });
    return { data, narrative };
}
/** 每组特色元素必须同时有数据型与叙事型，避免退化成“长文章”。 */
function isBalanced(elements) {
    const counts = categoryCounts(elements);
    return counts.data >= 2 && counts.narrative >= 2;
}
function pickFeatureElements(template, seed, lastElements) {
    const rawSets = FEATURE_ELEMENT_SETS[template] || FEATURE_ELEMENT_SETS.auto;
    const sets = rawSets.filter(isBalanced);
    const pool = sets.length ? sets : rawSets;
    const start = fnv1a(seed + '|elements') % pool.length;
    if (lastElements && lastElements.length) {
        for (let offset = 0; offset < pool.length; offset++) {
            const candidate = pool[(start + offset) % pool.length];
            if (overlapRatio(candidate, lastElements) <= 0.5)
                return candidate;
        }
    }
    return pool[start];
}
function candidatesFor(template, userText) {
    const key = template && LAYOUT_CANDIDATES[template] ? template : 'auto';
    const layouts = [...(LAYOUT_CANDIDATES[key] || LAYOUT_CANDIDATES.auto)];
    const styles = [...(STYLE_CANDIDATES[key] || STYLE_CANDIDATES.auto)];
    const text = userText || '';
    const hit = KEYWORD_LAYOUTS.find(item => item.re.test(text));
    if (hit) {
        const index = layouts.indexOf(hit.layout);
        if (index > 0) {
            layouts.splice(index, 1);
            layouts.unshift(hit.layout);
        }
    }
    return { layouts, styles };
}
export function pickReportVariant(input = {}) {
    const template = input.template || 'auto';
    const seed = String(input.seed || '') + '|' + template;
    const { layouts, styles } = candidatesFor(template, input.userText || '');
    const layout = rotate(layouts, seed + '|layout', input.lastLayout) || 'dashboard';
    const visualStyle = rotate(styles, seed + '|style', input.lastVisualStyle) ||
        REPORT_VISUAL_STYLES[0].label;
    const featureElements = pickFeatureElements(template, seed + '|' + layout, input.lastElements);
    const layoutLabel = REPORT_LAYOUTS[layout]?.label || layout;
    return {
        layout,
        visualStyle,
        featureElements,
        reason: `template=${template}; candidates=${layouts.join('/')}; picked=${layout}(${layoutLabel}); ` +
            `elements=${featureElements.join(',')}`,
    };
}
/** 生成注入给模型的版式提示（不会进入用户可见正文）。 */
export function buildVariantHint(variant, previous) {
    const layoutLabel = REPORT_LAYOUTS[variant.layout]?.label || variant.layout;
    const lines = [
        '【本轮报告版式要求】',
        `layout=${variant.layout}（${layoutLabel}）`,
        `visualStyle=${variant.visualStyle}`,
        `【本轮报告元素】优先使用：${variant.featureElements.join(' / ')}`,
        '其中数据型元素至少 2 个、叙事型元素至少 2 个；第一个 section 必须是数据屏（Hero KPI + 主图/热力表）。',
        '请优先按该版式组织内容，并用 CSS 做出与该风格一致的视觉效果；结构要服务于数据，不要为了填满模块而编内容。',
    ];
    if (previous && (previous.layout || previous.visualStyle || previous.elements?.length)) {
        lines.push(`上一份报告使用了 layout=${previous.layout || '未知'} / visualStyle=${previous.visualStyle || '未知'} / 元素=${previous.elements?.length ? previous.elements.join('、') : '未知'}，` +
            '本次请明显不同，至少换掉一半元素。');
    }
    return lines.join('\n');
}
