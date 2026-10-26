import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { budgetMessage, currentBudget } from './budget.js';
import { runQuery } from './db.js';
import { formatNumberCheck, validateCoverageNumbers } from './report-check.js';
import { getKnowledgePack } from './knowledge.js';
import { getSkillPack } from './skills.js';
import { logLine } from './log.js';
import { dbCacheKey, getSchemaCached, getTableSchemaCached, isDateColumnType, retrieveTables, } from './schema-cache.js';
import { HTML_REPORT_COMPONENT, HTML_REPORT_TOOL_DESCRIPTION, HTML_REPORT_TOOL_NAME, LEGACY_CHART_COMPONENT, LEGACY_CHART_TOOL_NAME, REPORT_COMPONENT, REPORT_ELEMENT_KEYS, REPORT_LAYOUT_KEYS, REPORT_TOOL_DESCRIPTION, reportElementCategory, REPORT_TOOL_NAME, htmlReportSchema, } from './visual-spec.js';
/** 所有会触发前端 visual 渲染的工具名（index.ts 据此把工具结果转成 visual 事件）。 */
export { VISUAL_TOOL_NAMES } from './visual-spec.js';
/** 前端默认的可视化组件名（ECharts 图表，旧协议）。 */
export const DEFAULT_VISUAL_COMPONENT = LEGACY_CHART_COMPONENT;
/** 表数量超过该阈值时，list_tables 改用紧凑格式（只给表名 + 截断注释）。 */
const COMPACT_TABLE_THRESHOLD = 40;
const TABLE_COMMENT_MAX = 80;
/** 报告生成后可以直接结束本轮，不再让模型补最后一句。 */
export function isTerminalVisualTool(name) {
    return name === HTML_REPORT_TOOL_NAME;
}
/**
 * 大库表清单的紧凑格式：`dbo.CORE_Stock — 库存主表`。
 * 比完整 JSON（每张表都带 schema/columnCount/comment 字段）省 3~5 倍字符。
 */
export function compactTableEntries(tables) {
    return tables.map((table) => {
        const name = table.schema && !table.name.includes('.') ? `${table.schema}.${table.name}` : table.name;
        const comment = (table.comment || '').replace(/\s+/g, ' ').trim().slice(0, TABLE_COMMENT_MAX);
        return comment ? `${name} — ${comment}` : name;
    });
}
/** 超大库只返回表名，注释/字段用 search_tables/get_table_schema 按需查。 */
export function tableNamesOnly(tables) {
    return tables.map((table) => table.schema && !table.name.includes('.') ? `${table.schema}.${table.name}` : table.name);
}
/** 默认紧凑格式：`列名:类型 NULL/NOT NULL`，不带注释。 */
export function compactColumns(columns) {
    return columns.map((column) => {
        const nullable = column.nullable === true ? ' NULL' : column.nullable === false ? ' NOT NULL' : '';
        return `${column.name}:${column.type}${nullable}`;
    });
}
/** 完整格式：紧凑格式 + 列注释；只在 detail=full 时返回。 */
export function fullColumns(columns) {
    return compactColumns(columns).map((base, index) => {
        const comment = (columns[index]?.comment || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        return comment ? `${base} — ${comment}` : base;
    });
}
/** 重复工具调用的短确认：避免把同一份大结果在上下文里再放一遍。 */
function cachedAck(message) {
    const budget = currentBudget();
    return JSON.stringify({
        success: true,
        cached: true,
        hint: message,
        ...(budget ? budget.remaining() : {}),
    });
}
/** SQL 归一化：用于同一批内去重，不改变实际执行的 SQL。 */
function normalizeSqlKey(sql) {
    return String(sql || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}
function sqlLiteral(value, db) {
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value);
    if (typeof value === 'boolean')
        return value ? '1' : '0';
    if (typeof value === 'string') {
        const escaped = value.replace(/'/g, "''");
        return db.type === 'sqlserver' ? `N'${escaped}'` : `'${escaped}'`;
    }
    return null;
}
function bindSavedSql(template, params, db) {
    const missing = [];
    const sql = template.replace(/([@:])([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, _prefix, key) => {
        if (!(key in params)) {
            missing.push(key);
            return match;
        }
        const literal = sqlLiteral(params[key], db);
        if (literal == null) {
            missing.push(key);
            return match;
        }
        return literal;
    });
    return { sql, missing: Array.from(new Set(missing)) };
}
function parseJsonObject(text) {
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
/** 统计一行里的单元格数（td/th，含 colspan）。 */
function cellSpan(rowHtml) {
    const re = /<(td|th)\b([^>]*)>/gi;
    let n = 0;
    let m;
    while ((m = re.exec(rowHtml))) {
        const attrs = m[2] || '';
        const cs = attrs.match(/colspan\s*=\s*["']?(\d+)/i);
        n += cs ? Math.max(1, parseInt(cs[1], 10) || 1) : 1;
    }
    return n;
}
/** 从 HTML 里取出所有 .ol-chart 容器的 data-id。 */
export function extractChartIds(html) {
    const ids = [];
    const tagRe = /<[a-z][^>]*>/gi;
    let m;
    while ((m = tagRe.exec(html))) {
        const tag = m[0];
        if (!/class\s*=\s*["'][^"']*\bol-chart\b/i.test(tag))
            continue;
        const idm = tag.match(/data-id\s*=\s*["']([^"']+)["']/i);
        if (idm)
            ids.push(idm[1]);
    }
    return ids;
}
/** 校验单个 ECharts option 是否能画出东西。 */
export function validateChartOption(opt) {
    if (!opt || typeof opt !== 'object')
        return 'option 为空';
    const o = opt;
    const raw = o.series;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (!arr.length)
        return '缺少 series';
    const hasData = arr.some((s) => {
        if (!s || typeof s !== 'object')
            return false;
        const series = s;
        if (Array.isArray(series.data))
            return series.data.length > 0;
        if (series.data && typeof series.data === 'object')
            return true;
        return Boolean(o.dataset);
    });
    if (!hasData)
        return '没有数据（series[].data 为空）';
    const needsAxis = arr.some((s) => {
        if (!s || typeof s !== 'object')
            return false;
        const t = s.type;
        return t === 'line' || t === 'bar' || t === 'scatter' || t === 'heatmap' || t === 'candlestick';
    });
    if (needsAxis && !o.xAxis)
        return '直角坐标图缺少 xAxis';
    if (needsAxis && !o.yAxis)
        return '直角坐标图缺少 yAxis';
    return null;
}
/**
 * 校验报告图表：HTML 里每个 .ol-chart 都要在 charts 里有可用 option。
 * 只返回提示文本，不抛错（避免触发模型重试）。
 */
export function validateReportCharts(html, charts) {
    const ids = extractChartIds(html);
    const map = charts || {};
    for (const id of ids) {
        const opt = map[id];
        if (opt === undefined || opt === null) {
            return `图表容器 data-id="${id}" 在 charts 里没有对应的 option`;
        }
        const problem = validateChartOption(opt);
        if (problem)
            return `图表 ${id}：${problem}`;
    }
    return null;
}
/**
 * 校验 HTML 报告里的表格结构：每行单元格数必须与表头列数一致。
 * 列数不足会导致整行左移（状态徽章跑到别的列）。
 */
export function validateHtmlTables(html) {
    const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
    for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        const headBlock = t.match(/<thead\b[\s\S]*?<\/thead>/i);
        const headRow = headBlock ? (headBlock[0].match(/<tr\b[\s\S]*?<\/tr>/i) || [''])[0] : '';
        let cols = headRow ? cellSpan(headRow) : 0;
        const bodyBlock = (t.match(/<tbody\b[\s\S]*?<\/tbody>/i) || [t])[0];
        const rows = bodyBlock.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
        if (!cols) {
            const withTh = rows.find((r) => /<th\b/i.test(r));
            cols = withTh ? cellSpan(withTh) : rows[0] ? cellSpan(rows[0]) : 0;
        }
        if (!cols)
            continue;
        let index = 0;
        for (const row of rows) {
            if (/<th\b/i.test(row) && !/<td\b/i.test(row))
                continue;
            index++;
            const n = cellSpan(row);
            if (n !== cols) {
                return `第 ${i + 1} 张表格第 ${index} 个数据行只有 ${n} 个单元格，但表头有 ${cols} 列`;
            }
        }
    }
    return null;
}
/**
 * 章节编号兜底：模型经常把 “01 / OVERVIEW” 写进 .section-no，
 * 而前端 .section-no 是固定 28px 的编号块，文字会溢出盖住标题、目录也会变成碎片。
 * 这里只保留数字，纯装饰的英文/说明不影响报告内容。
 */
export function normalizeSectionNo(html) {
    let changed = 0;
    const re = /(<([a-z][a-z0-9]*)\b[^>]*class\s*=\s*["'][^"']*\b(section-no|section-divider__no)\b[^"']*["'][^>]*>)([\s\S]*?)(<\/\2\s*>)/gi;
    const out = html.replace(re, (match, open, _tag, _cls, inner, close) => {
        const text = String(inner)
            .replace(/<[^>]+>/g, ' ')
            .trim();
        const digits = (text.match(/\d+/) || [])[0] || '';
        if (!digits || digits === text)
            return match;
        changed += 1;
        return `${open}${digits}${close}`;
    });
    return { html: out, changed };
}
/** 布局软校验：只提示最危险的覆盖式布局，不抛错。 */
export function validateHtmlLayout(html, css) {
    const sourceCss = css || '';
    const inlineBad = /<(?:div|span|p|h[1-6])\b[^>]*class\s*=\s*["'][^"']*\b(section-no|section-title|section-head|section-sub|hero-kpi)\b[^"']*["'][^>]*style\s*=\s*["'][^"']*position\s*:\s*(absolute|fixed)/i.test(html);
    if (inlineBad)
        return '章节编号/标题使用了内联 position:absolute/fixed，可能覆盖正文';
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = ruleRe.exec(sourceCss))) {
        const selector = match[1];
        const body = match[2];
        if (/\.(section-no|section-title|section-head|section-sub|hero-kpi)\b/i.test(selector) &&
            /position\s*:\s*(absolute|fixed)/i.test(body)) {
            return '章节编号/标题的 CSS 用了 position:absolute/fixed，可能覆盖正文';
        }
    }
    if (/margin(?:-left|-right)?\s*:\s*-\d/i.test(sourceCss)) {
        return 'CSS 使用了负 margin，窄屏容易叠字';
    }
    return null;
}
// ============================================================
// 入参归一化：模型经常把数组写成字符串、把模板写成中文，这里全部兼容
// ============================================================
export function toStringArray(value, max = 8) {
    if (Array.isArray(value)) {
        return value
            .map((v) => String(v == null ? '' : v).trim())
            .filter(Boolean)
            .slice(0, max);
    }
    if (typeof value === 'string') {
        return value
            .split(/[、,，;；\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, max);
    }
    return [];
}
const TEMPLATE_ALIASES = {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    annual: 'annual',
    inventory: 'inventory',
    exception: 'exception',
    compare: 'compare',
    日报: 'daily',
    作业日报: 'daily',
    日报告: 'daily',
    周报: 'weekly',
    运营周报: 'weekly',
    周报告: 'weekly',
    月报: 'monthly',
    运营月报: 'monthly',
    月报告: 'monthly',
    年度: 'annual',
    年报: 'annual',
    年度报告: 'annual',
    年度总结: 'annual',
    年度经营分析: 'annual',
    年度复盘: 'annual',
    库存: 'inventory',
    库存快照: 'inventory',
    库存报表: 'inventory',
    异常: 'exception',
    异常专报: 'exception',
    异常报告: 'exception',
    对比: 'compare',
    多仓对比: 'compare',
    仓库对比: 'compare',
};
const LAYOUT_ALIASES = {
    executive: 'executive',
    高层: 'executive',
    高层摘要: 'executive',
    摘要: 'executive',
    汇报: 'executive',
    领导: 'executive',
    老板: 'executive',
    dashboard: 'dashboard',
    看板: 'dashboard',
    仪表盘: 'dashboard',
    监控: 'dashboard',
    运营看板: 'dashboard',
    narrative: 'narrative',
    叙事: 'narrative',
    叙事分析: 'narrative',
    专题: 'narrative',
    分析报告: 'narrative',
    comparison: 'comparison',
    对比: 'comparison',
    横向对比: 'comparison',
    比较: 'comparison',
    多仓: 'comparison',
    timeline: 'timeline',
    时间轴: 'timeline',
    年度: 'timeline',
    季度: 'timeline',
    复盘: 'timeline',
    里程碑: 'timeline',
    auto: 'auto',
    自动: 'auto',
};
const MAX_CSS_CHARS = 40 * 1000;
export function normalizeTemplate(value) {
    if (typeof value !== 'string')
        return 'auto';
    const key = value.trim().toLowerCase();
    if (!key || key === 'auto')
        return 'auto';
    return TEMPLATE_ALIASES[key] || TEMPLATE_ALIASES[value.trim()] || 'auto';
}
/** 结构蓝图归一化：支持英文 key、中文别名，未知值回落到 auto。 */
export function normalizeLayout(value) {
    if (typeof value !== 'string')
        return 'auto';
    const raw = value.trim();
    if (!raw)
        return 'auto';
    const key = raw.toLowerCase();
    const hit = LAYOUT_ALIASES[key] || LAYOUT_ALIASES[raw];
    if (hit)
        return hit;
    const lowered = raw.toLowerCase();
    const alias = Object.keys(LAYOUT_ALIASES).find((name) => name !== 'auto' && lowered.includes(name.toLowerCase()));
    if (alias)
        return LAYOUT_ALIASES[alias];
    const matched = REPORT_LAYOUT_KEYS.find((k) => lowered.includes(k));
    return matched || 'auto';
}
/** 视觉风格是自由文本，只做去空格和长度保护。 */
export function normalizeVisualStyle(value) {
    if (typeof value !== 'string')
        return '';
    return value.trim().slice(0, 120);
}
/** CSS 只做字符串归一化；真正的安全过滤在前端注入时完成。 */
export function normalizeCss(value) {
    if (typeof value !== 'string')
        return '';
    return value.trim();
}
const ELEMENT_KEY_SET = new Set(REPORT_ELEMENT_KEYS);
function normalizeElementName(value) {
    if (typeof value !== 'string')
        return '';
    const name = value.trim().replace(/^\./, '').toLowerCase();
    return ELEMENT_KEY_SET.has(name) ? name : '';
}
/** 统计图表类型，用于日志观察模型是否只用 line/bar/pie。 */
export function extractChartTypes(charts) {
    const types = new Set();
    Object.values(charts || {}).forEach((option) => {
        if (!option || typeof option !== 'object')
            return;
        const raw = option.series;
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        list.forEach((item) => {
            if (!item || typeof item !== 'object')
                return;
            const type = item.type;
            if (typeof type === 'string' && type.trim())
                types.add(type.trim());
        });
    });
    return Array.from(types);
}
/** 从 HTML 里自动提取实际使用的报告元素 class。 */
export function extractReportElements(html) {
    const found = new Set();
    const classRe = /class\s*=\s*["']([^"']*)["']/gi;
    let match;
    while ((match = classRe.exec(html || ''))) {
        const tokens = match[1].split(/\s+/);
        for (const token of tokens) {
            const name = normalizeElementName(token);
            if (name)
                found.add(name);
        }
    }
    return Array.from(found);
}
/** 统计报告的数据密度，用于日志判断是否退化成“长文章”。 */
export function analyzeReportRichness(html, charts) {
    const elements = extractReportElements(html);
    return {
        elements,
        dataElements: elements.filter((key) => reportElementCategory(key) === 'data'),
        narrativeElements: elements.filter((key) => reportElementCategory(key) === 'narrative'),
        chartTypes: extractChartTypes(charts),
        sections: (html.match(/<section\b/gi) || []).length,
        tables: (html.match(/<table\b/gi) || []).length,
    };
}
export function normalizeHeight(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
    }
    if (typeof value === 'string') {
        const m = value.match(/(\d+(?:\.\d+)?)/);
        if (m) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n > 0)
                return Math.round(n);
        }
    }
    return undefined;
}
export function normalizeCharts(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        }
        catch {
            return undefined;
        }
    }
    return undefined;
}
/**
 * 报告工具入参归一化 + 软校验。
 * 关键：**永不抛错**，格式问题降级为 warnings，交给前端兜底显示，
 * 从而避免 LangChain 把工具错误转成 ToolMessage 后触发无限重试。
 */
function normalizeCoverage(value) {
    if (!Array.isArray(value))
        return undefined;
    const out = [];
    for (const raw of value) {
        if (!raw || typeof raw !== 'object')
            continue;
        const item = raw;
        const name = typeof item.item === 'string' ? item.item.trim() : '';
        if (!name)
            continue;
        const status = item.status === 'ok' ||
            item.status === 'missing' ||
            item.status === 'needs_review' ||
            item.status === 'pending'
            ? item.status
            : 'pending';
        const sourceValue = item.source;
        const source = Array.isArray(sourceValue)
            ? sourceValue.map((value) => String(value)).filter(Boolean)
            : typeof sourceValue === 'string' && sourceValue.trim()
                ? sourceValue.trim()
                : undefined;
        out.push({
            item: name,
            status,
            source,
            note: typeof item.note === 'string' ? item.note : undefined,
            value: typeof item.value === 'string' || typeof item.value === 'number' ? item.value : undefined,
            unit: typeof item.unit === 'string' ? item.unit : undefined,
        });
    }
    return out.length ? out : undefined;
}
export function normalizeHtmlReportInput(input) {
    const rawHtml = typeof input.html === 'string' ? input.html : '';
    const sectionNo = normalizeSectionNo(rawHtml);
    if (sectionNo.changed) {
        logLine(`html section-no normalized changed=${sectionNo.changed}`);
    }
    const html = sectionNo.html;
    const css = normalizeCss(input.css);
    const charts = normalizeCharts(input.charts);
    const coverage = normalizeCoverage(input.coverage);
    const warnings = toStringArray(input.warnings);
    if (coverage) {
        for (const entry of coverage) {
            if (entry.status === 'missing' || entry.status === 'needs_review') {
                warnings.push(`${entry.item}：${entry.status === 'missing' ? '无法计算' : '口径待确认'}` +
                    `${entry.note ? `（${entry.note}）` : ''}`);
            }
        }
    }
    const declaredElements = toStringArray(input.elements, 20)
        .map(normalizeElementName)
        .filter(Boolean);
    const elements = Array.from(new Set([...declaredElements, ...extractReportElements(html)]));
    if (!html.trim()) {
        warnings.push('报告正文为空（html 为空）');
    }
    if (css.length > MAX_CSS_CHARS) {
        warnings.push(`CSS 过大（${Math.round(css.length / 1024)}KB），前端会截断到 ${MAX_CSS_CHARS / 1024}KB`);
    }
    const tableProblem = validateHtmlTables(html);
    if (tableProblem) {
        warnings.push(`表格结构提示：${tableProblem}（前端会隐藏列数不一致的行）`);
    }
    const chartProblem = validateReportCharts(html, charts);
    if (chartProblem) {
        warnings.push(`图表结构提示：${chartProblem}（前端会显示“图表未生成”）`);
    }
    const layoutProblem = validateHtmlLayout(html, css);
    if (layoutProblem) {
        warnings.push(`布局提示：${layoutProblem}`);
    }
    return {
        component: HTML_REPORT_COMPONENT,
        title: typeof input.title === 'string' ? input.title : '',
        subtitle: typeof input.subtitle === 'string' ? input.subtitle : '',
        height: normalizeHeight(input.height),
        template: normalizeTemplate(input.template),
        layout: normalizeLayout(input.layout),
        visualStyle: normalizeVisualStyle(input.visualStyle),
        period: typeof input.period === 'string' ? input.period : '',
        scope: typeof input.scope === 'string' ? input.scope : '',
        sources: toStringArray(input.sources),
        warnings: Array.from(new Set(warnings)),
        html,
        css: css || undefined,
        elements,
        charts,
        coverage,
    };
}
// ============================================================
// 结果截断：防止一次查询把上下文撑爆
// ============================================================
function fitJson(build, total, maxChars) {
    let lo = 0;
    let hi = total;
    let best = JSON.stringify(build(0));
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const text = JSON.stringify(build(mid));
        if (text.length <= maxChars) {
            best = text;
            lo = mid + 1;
        }
        else {
            hi = mid - 1;
        }
    }
    return best;
}
/**
 * 结果紧凑化：rows 改成与 columns 顺序对齐的二维数组。
 * 每行不再重复列名，宽表结果可省 40%+ token。
 */
function compactQueryResult(result) {
    const columns = Array.isArray(result.columns) && result.columns.length
        ? result.columns
        : result.rows.length
            ? Object.keys(result.rows[0])
            : [];
    return {
        ...result,
        columns,
        rows: result.rows.map((row) => columns.map((name) => row[name])),
    };
}
function trimQueryResult(result, maxChars, limitWord = 'TOP') {
    const compact = compactQueryResult(result);
    const json = JSON.stringify(compact);
    if (json.length <= maxChars)
        return { json, trimmed: false };
    const hint = `结果太大已截断，请改用聚合 SQL（GROUP BY / SUM / COUNT）或 ${limitWord} 减少查询`;
    const text = fitJson((keep) => ({
        ...compact,
        rows: compact.rows.slice(0, keep),
        rowCount: keep,
        truncated: true,
        hint,
    }), compact.rows.length, maxChars);
    return { json: text, trimmed: true };
}
// ============================================================
// 表 profile：一次只读聚合拿到行数/空值率/枚举/日期范围，
// 替代模型多次“先查字段，再 SELECT DISTINCT，再查日期范围”的探索往返
// ============================================================
const NUMERIC_TYPE_RE = /int|decimal|numeric|float|real|double|money|number/i;
const PROFILE_TOP_COLUMNS = 3;
const PROFILE_TOP_VALUES = 5;
const PROFILE_TTL_MS = 30 * 60 * 1000;
const PROFILE_MAX_CACHE = 200;
const profileMemory = new Map();
/** 去掉已有的引号/方括号，得到裸标识符。 */
function bareIdentifier(name) {
    return String(name || '').replace(/^["'`[\]]+|["'`\]]+$/g, '');
}
function quoteColumn(db, name) {
    const bare = bareIdentifier(name);
    return db.type === 'kingbase'
        ? `"${bare.replace(/"/g, '""')}"`
        : `[${bare.replace(/\]/g, ']]')}]`;
}
function quoteTableSql(db, table) {
    return String(table || '')
        .split('.')
        .map((part) => {
        const bare = bareIdentifier(part);
        return db.type === 'kingbase'
            ? `"${bare.replace(/"/g, '""')}"`
            : `[${bare.replace(/\]/g, ']]')}]`;
    })
        .join('.');
}
function isNumericColumnType(type) {
    return NUMERIC_TYPE_RE.test(String(type || ''));
}
/** 选 profile 的列：显式指定优先；缺省自动选 PK + 日期列 + 前 3 个其他列。 */
function selectProfileColumns(schema, requested) {
    const all = schema.columns;
    if (requested?.length) {
        const wanted = new Set(requested.map((name) => bareIdentifier(name).toLowerCase()));
        return all
            .filter((column) => wanted.has(bareIdentifier(column.name).toLowerCase()))
            .slice(0, 12)
            .map((column) => column.name);
    }
    const pk = all
        .filter((column) => column.primaryKey)
        .slice(0, 2)
        .map((column) => column.name);
    const dates = all
        .filter((column) => isDateColumnType(column.type))
        .slice(0, 2)
        .map((column) => column.name);
    const others = all
        .filter((column) => !column.primaryKey && !isDateColumnType(column.type))
        .slice(0, 3)
        .map((column) => column.name);
    return Array.from(new Set([...pk, ...dates, ...others])).slice(0, 8);
}
function buildProfileAggregateSql(db, tableSql, picked) {
    const parts = ['COUNT(*) AS __rows'];
    picked.forEach((column, index) => {
        const quoted = quoteColumn(db, column.name);
        parts.push(`COUNT(${quoted}) AS __nn${index}`);
        parts.push(`COUNT(DISTINCT ${quoted}) AS __nd${index}`);
        if (isNumericColumnType(column.type) || isDateColumnType(column.type)) {
            parts.push(`MIN(${quoted}) AS __min${index}`);
            parts.push(`MAX(${quoted}) AS __max${index}`);
        }
    });
    return `SELECT ${parts.join(', ')} FROM ${tableSql}`;
}
function buildTopValuesSql(db, tableSql, columnName) {
    const quoted = quoteColumn(db, columnName);
    const topClause = db.type === 'kingbase' ? '' : `TOP ${PROFILE_TOP_VALUES} `;
    const limit = db.type === 'kingbase' ? ` LIMIT ${PROFILE_TOP_VALUES}` : '';
    return (`SELECT ${topClause}${quoted} AS value, COUNT(*) AS count FROM ${tableSql} ` +
        `WHERE ${quoted} IS NOT NULL GROUP BY ${quoted} ORDER BY COUNT(*) DESC${limit}`);
}
/** 执行表 profile：1 条聚合 SQL + 最多 3 条 Top 值 SQL；失败列标 error 不整体抛。 */
async function runTableProfile(db, tableName, requested) {
    const started = Date.now();
    const cacheKey = `${dbCacheKey(db)}|${String(tableName).toLowerCase()}|` +
        `${(requested || [])
            .map((name) => bareIdentifier(name).toLowerCase())
            .sort()
            .join(',')}`;
    const memory = profileMemory.get(cacheKey);
    if (memory && Date.now() - memory.fetchedAt < PROFILE_TTL_MS) {
        return { ...memory.profile, cached: true };
    }
    const schema = await getTableSchemaCached(db, tableName);
    const picked = selectProfileColumns(schema, requested)
        .map((name) => schema.columns.find((column) => bareIdentifier(column.name).toLowerCase() === bareIdentifier(name).toLowerCase()))
        .filter((column) => Boolean(column));
    if (!picked.length) {
        return { success: false, error: `表 ${tableName} 没有可用于 profile 的列` };
    }
    const budget = currentBudget();
    const blocked = budget ? budget.takeSqlQuery() : null;
    if (blocked)
        return { success: false, error: blocked };
    const tableSql = quoteTableSql(db, schema.table || tableName);
    const aggregate = await runQuery(db, buildProfileAggregateSql(db, tableSql, picked));
    if (!aggregate.success) {
        return { success: false, error: aggregate.error || 'profile 聚合查询失败' };
    }
    const row = aggregate.rows[0] || {};
    const rows = Number(row.__rows ?? 0);
    const stats = picked.map((column, index) => {
        const nonNull = Number(row[`__nn${index}`] ?? 0);
        const stat = { name: column.name, type: column.type };
        if (rows > 0)
            stat.nullRate = Math.round(((rows - nonNull) / rows) * 1000) / 1000;
        stat.distinct = Number(row[`__nd${index}`] ?? 0);
        if (row[`__min${index}`] !== undefined)
            stat.min = row[`__min${index}`];
        if (row[`__max${index}`] !== undefined)
            stat.max = row[`__max${index}`];
        return stat;
    });
    // Top 值：只对 distinct ≤ 20 的列查（最多 3 列），避免高基数列全分组
    const topTargets = stats
        .filter((stat) => (stat.distinct ?? 0) > 1 && (stat.distinct ?? 0) <= 20)
        .slice(0, PROFILE_TOP_COLUMNS);
    const errors = [];
    let partial = false;
    await Promise.all(topTargets.map(async (stat) => {
        const blockedTop = budget ? budget.takeSqlQuery() : null;
        if (blockedTop) {
            partial = true;
            errors.push(blockedTop);
            return;
        }
        const result = await runQuery(db, buildTopValuesSql(db, tableSql, stat.name));
        if (!result.success) {
            partial = true;
            errors.push(`${stat.name}: ${result.error || 'Top 值查询失败'}`);
            return;
        }
        stat.top = result.rows.slice(0, PROFILE_TOP_VALUES).map((topRow) => ({
            value: topRow.value,
            count: Number(topRow.count ?? 0),
        }));
    }));
    const profile = {
        table: schema.table || tableName,
        rows,
        columns: stats,
        partial: partial || aggregate.truncated,
        elapsedMs: Date.now() - started,
        ...(errors.length ? { errors } : {}),
    };
    profileMemory.set(cacheKey, { profile, fetchedAt: Date.now() });
    if (profileMemory.size > PROFILE_MAX_CACHE) {
        const oldest = profileMemory.keys().next().value;
        if (oldest)
            profileMemory.delete(oldest);
    }
    logLine(`table profile ok table=${profile.table} rows=${profile.rows} columns=${stats.length} ` +
        `top=${topTargets.length} elapsed=${profile.elapsedMs}ms${profile.partial ? ' partial=1' : ''}`);
    return profile;
}
/** 为某次请求的数据库配置构造一组工具（工具需要闭包持有该库的连接信息）。 */
export function createTools(db, options = {}) {
    const batchQueries = options.batchQueries !== false;
    const clarifyEnabled = options.clarify !== false;
    const isKingbase = db.type === 'kingbase';
    const limitWord = isKingbase ? 'LIMIT' : 'TOP';
    const dialectTip = isKingbase
        ? '金仓是 PostgreSQL 方言：表名/列名请使用双引号（如 public."WMS_Stocks"），行数限制用 LIMIT。'
        : '';
    const getSchemaTool = tool(async ({ keyword }) => {
        const budget = currentBudget();
        const cacheKey = (keyword ?? '').trim().toLowerCase();
        // 同一轮内重复调用直接给短确认，不要再占一次 schema 预算/上下文。
        const cached = budget?.schemaCache.get(cacheKey);
        if (cached) {
            logLine(`tool list_tables cached keyword=${cacheKey || '-'}`);
            return cachedAck(cached);
        }
        if (!cacheKey && budget?.fullListServed) {
            logLine('tool list_tables cached full-list');
            return cachedAck('同一轮已返回过完整表清单（见同轮另一条 list_tables 结果），直接使用，不要重复调用。');
        }
        const blocked = budget ? budget.takeSchemaCall() : null;
        if (blocked) {
            logLine(`tool list_tables blocked: ${blocked}`);
            return budgetMessage('schema', blocked);
        }
        const allSchema = await getSchemaCached(db);
        let schema = allSchema;
        if (cacheKey) {
            const matched = allSchema.tables.filter((table) => {
                const haystack = `${table.schema || ''}.${table.name} ${table.comment || ''}`.toLowerCase();
                return haystack.includes(cacheKey);
            });
            schema = matched.length
                ? {
                    ...allSchema,
                    tableCount: matched.length,
                    tables: matched,
                }
                : {
                    ...allSchema,
                    hint: `keyword「${keyword}」未匹配到表名或注释，已返回全部 ${allSchema.tableCount} 张表；` +
                        '请直接选表，不要再用其它 keyword 重试。',
                };
        }
        const maxChars = budget ? budget.limits.maxResultChars : 8000;
        const isFullList = schema.tableCount > 0 && schema.tableCount === (schema.totalTables ?? schema.tableCount);
        // 并发的两次全表查询：只让其中一次返回完整清单。
        const duplicateHint = '同一轮已返回过完整表清单（见同轮另一条 list_tables 结果），直接使用，不要重复调用。';
        if (isFullList && budget?.fullListServed) {
            const ack = cachedAck(duplicateHint);
            const deny = budget ? budget.takeChars(ack.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            budget?.schemaCache.set(cacheKey, duplicateHint);
            logLine(`tool list_tables cached-duplicate tables=${schema.tableCount}`);
            return ack;
        }
        const remaining = budget ? budget.remaining() : {};
        let json = JSON.stringify({ ...schema, ...remaining });
        if (schema.tables.length > COMPACT_TABLE_THRESHOLD || json.length > maxChars) {
            const namesOnly = schema.tables.length > 100;
            const compact = {
                database: schema.database,
                tableCount: schema.tableCount,
                totalTables: schema.totalTables,
                availableSchemas: schema.availableSchemas,
                tables: namesOnly ? tableNamesOnly(schema.tables) : compactTableEntries(schema.tables),
                hint: schema.hint ||
                    (namesOnly
                        ? '表较多，已只返回表名；用 search_tables 或 get_table_schema 查注释/字段。'
                        : '表较多，已只返回表名/注释；直接选表后用 get_table_schema 查看字段。'),
                ...remaining,
            };
            json = JSON.stringify(compact);
            if (json.length > maxChars) {
                json = fitJson((keep) => ({
                    ...compact,
                    tables: compact.tables.slice(0, keep),
                    truncated: keep < compact.tables.length,
                }), compact.tables.length, maxChars);
            }
        }
        const deny = budget ? budget.takeChars(json.length) : null;
        if (deny) {
            logLine(`tool list_tables budget blocked: ${deny}`);
            return budgetMessage('chars', deny);
        }
        if (isFullList && budget)
            budget.fullListServed = true;
        // 同一轮再次调用时只回短确认，避免把清单重复放进上下文
        budget?.schemaCache.set(cacheKey, schema.hint
            ? '同一轮已返回过该 list_tables 结果（含未命中提示），不要再用其它 keyword 重试。'
            : '同一轮已返回过该 list_tables 结果，直接使用，不要重复调用。');
        logLine(`tool list_tables ok keyword=${cacheKey || '-'} tables=${schema.tables.length}` +
            `${schema.totalTables !== undefined ? `/${schema.totalTables}` : ''} chars=${json.length}` +
            `${schema.hint ? ' hint=1' : ''}`);
        return json;
    }, {
        name: 'list_tables',
        description: '列出数据库中可用的表（大库返回表名 + 截断注释）。生成 SQL 前先用本工具了解有哪些表，' +
            '再用 get_table_schema 查看字段。每轮最多调用一次；拿到清单后不要再用其它 keyword 重试。' +
            '工具结果里的 remainingSchema/remainingSql 为 0 时立即收尾。' +
            (dialectTip ? ` ${dialectTip}` : ''),
        schema: z.object({
            keyword: z.string().optional().describe('可选：按表名或表注释模糊筛选，例如“库存”“MES”。'),
        }),
    });
    const getTableSchemaTool = tool(async ({ table, tables, detail, columns }) => {
        const budget = currentBudget();
        const withComments = detail === 'full';
        const requested = Array.from(new Set([...(Array.isArray(tables) ? tables : []), table]
            .map((item) => String(item || '').trim())
            .filter(Boolean))).slice(0, 8);
        if (!requested.length)
            return budgetMessage('schema', '缺少 table 或 tables');
        // ---- profile 模式：只支持单表，一次只读聚合拿到数据画像 ----
        if (detail === 'profile') {
            if (requested.length !== 1 || Array.isArray(tables)) {
                return budgetMessage('schema', 'profile 模式只支持单张表（用 table 字段）；批量请用默认 compact/full');
            }
            const profile = await runTableProfile(db, requested[0], columns);
            if ('success' in profile && profile.success === false) {
                logLine(`tool get_table_schema profile fail: ${profile.error}`);
                return JSON.stringify({
                    success: false,
                    error: profile.error,
                    ...(budget ? budget.remaining() : {}),
                });
            }
            const maxChars = budget ? budget.limits.maxResultChars : 8000;
            const remaining = budget ? budget.remaining() : {};
            const base = profile;
            let json = JSON.stringify({ success: true, ...base, ...remaining });
            if (json.length > maxChars) {
                json = fitJson((keep) => ({
                    success: true,
                    ...base,
                    columns: base.columns.slice(0, keep),
                    truncated: keep < base.columns.length,
                    ...remaining,
                }), base.columns.length, maxChars);
            }
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool get_table_schema profile table=${base.table} rows=${base.rows} ` +
                `cols=${base.columns.length} chars=${json.length}${base.cached ? ' cached=1' : ''}`);
            return json;
        }
        const single = requested.length === 1 && !Array.isArray(tables);
        const results = [];
        for (const name of requested) {
            const cacheKey = name.toLowerCase();
            if (budget?.tableSchemaCache.has(cacheKey)) {
                results.push({ table: name, cached: true });
                continue;
            }
            const blocked = budget ? budget.takeSchemaCall() : null;
            if (blocked) {
                results.push({ table: name, error: blocked });
                continue;
            }
            try {
                const schema = await getTableSchemaCached(db, name);
                budget?.tableSchemaCache.set(cacheKey, '1');
                results.push({
                    table: schema.table || name,
                    database: schema.database,
                    columns: withComments ? fullColumns(schema.columns) : compactColumns(schema.columns),
                    ...(schema.primaryKey?.length ? { primaryKey: schema.primaryKey } : {}),
                    ...(schema.foreignKeys?.length ? { foreignKeys: schema.foreignKeys } : {}),
                    ...(schema.dateColumns?.length ? { dateColumns: schema.dateColumns } : {}),
                });
            }
            catch (error) {
                results.push({
                    table: name,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const maxChars = budget ? budget.limits.maxResultChars : 8000;
        const remaining = budget ? budget.remaining() : {};
        let json;
        if (single && results.length === 1 && !('error' in results[0]) && !('cached' in results[0])) {
            const entry = results[0];
            const columns = Array.isArray(entry.columns) ? entry.columns : [];
            json = fitJson((keep) => ({
                ...entry,
                columns: columns.slice(0, keep),
                truncated: keep < columns.length,
                ...(keep < columns.length
                    ? { hint: '字段过多已截断，请优先使用与业务指标相关的字段' }
                    : {}),
                ...remaining,
            }), columns.length, maxChars);
        }
        else {
            json = JSON.stringify({
                success: results.every((item) => !item.error),
                schemas: results,
                ...remaining,
            });
            if (json.length > maxChars) {
                const parsed = parseJsonObject(json) || {};
                const schemas = Array.isArray(parsed.schemas) ? parsed.schemas : [];
                if (schemas.length > 1) {
                    json = fitJson((keep) => ({
                        ...parsed,
                        schemas: schemas.slice(0, keep),
                        truncated: keep < schemas.length,
                    }), schemas.length, maxChars);
                }
            }
        }
        const deny = budget ? budget.takeChars(json.length) : null;
        if (deny) {
            logLine(`tool get_table_schema budget blocked: ${deny}`);
            return budgetMessage('chars', deny);
        }
        const okCount = results.filter((item) => !item.error).length;
        logLine(`tool get_table_schema ok tables=${results.length} ok=${okCount} chars=${json.length}`);
        return json;
    }, {
        name: 'get_table_schema',
        description: '查看表字段。默认紧凑格式“列名:类型 NULL/NOT NULL”；detail="full" 带业务注释；' +
            'detail="profile" 对单表执行只读聚合（行数/空值率/distinct/日期数值范围/低基数列 Top5），' +
            '适合分析前先了解数据分布，避免多次探索查询。' +
            '返回值含主键 primaryKey / 外键 foreignKeys / 日期列 dateColumns（数据库有约束时）。' +
            '单表用 table；多表用 tables（最多 8 张）一次返回。' +
            '同一张表每轮只查一次；工具结果里的 remainingSchema 为 0 时立即收尾。' +
            (isKingbase ? ' 可传 schema.table，例如 public."WMS_Stocks"；返回的列名已带双引号。' : ''),
        schema: z.object({
            table: z.string().optional().describe('单张表名；与 tables 二选一'),
            tables: z
                .array(z.string())
                .max(8)
                .optional()
                .describe('多张表名，一次返回（推荐，最多 8 张）；profile 模式不支持'),
            detail: z
                .enum(['compact', 'full', 'profile'])
                .optional()
                .describe('默认 compact（列名:类型/NULL）；full 带注释；profile 对单表做只读聚合画像'),
            columns: z
                .array(z.string())
                .max(12)
                .optional()
                .describe('仅 profile 模式：要画像的列（最多 12 个）；缺省自动选主键+日期列+前几个业务列'),
        }),
    });
    const runQueryTool = tool(async ({ sql: sqlText, queries }) => {
        const budget = currentBudget();
        const inputQueries = Array.isArray(queries)
            ? queries.map((item) => String(item || '').trim()).filter(Boolean)
            : [];
        if (!batchQueries && inputQueries.length && !sqlText) {
            return budgetMessage('sql', '当前开启了 SQL 审批，一次只能执行一条 SQL；请改用 sql 字段');
        }
        const rawQueries = batchQueries ? inputQueries : [];
        const seenSql = new Set();
        const list = (rawQueries.length ? rawQueries : sqlText ? [sqlText] : [])
            .filter((sql) => {
            const key = normalizeSqlKey(sql);
            if (seenSql.has(key))
                return false;
            seenSql.add(key);
            return true;
        })
            .slice(0, 10);
        if (!list.length)
            return budgetMessage('sql', '缺少 sql 或 queries');
        const denied = [];
        const runnable = [];
        for (const sql of list) {
            const blocked = budget ? budget.takeSqlQuery() : null;
            if (blocked) {
                denied.push(blocked);
                continue;
            }
            runnable.push(sql);
        }
        if (!runnable.length) {
            const reason = denied[0] || '本次分析的 SQL 查询次数已达上限';
            logLine(`tool run_sql blocked: ${reason}`);
            return budgetMessage('sqlQueries', reason);
        }
        const started = Date.now();
        const maxChars = budget ? budget.limits.maxResultChars : 8000;
        // 批量查询把单轮总字符预算平均分给每条 SQL，避免 4 条结果一起撑爆上下文。
        const perQueryMax = Math.max(1200, Math.floor(maxChars / Math.max(1, runnable.length)));
        const results = await Promise.all(runnable.map(async (sql) => {
            const result = await runQuery(db, sql);
            const { json, trimmed } = trimQueryResult(result, perQueryMax, limitWord);
            return { result, json, trimmed };
        }));
        const remaining = budget ? budget.remaining() : {};
        const nudge = budget ? budget.takeReportNudge() : null;
        const queryId = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        let json;
        if (runnable.length === 1 && !rawQueries.length) {
            // 单条查询保持原有结构（兼容旧前端/模型习惯）
            const parsed = parseJsonObject(results[0].json) || {};
            json = JSON.stringify({
                ...parsed,
                queryId,
                complete: parsed.success !== false && parsed.truncated !== true,
                ...(nudge ? { nudge } : {}),
                ...remaining,
            });
        }
        else {
            const payload = {
                success: results.every((item) => item.result.success) && denied.length === 0,
                multi: true,
                queryId,
                complete: results.every((item) => item.result.success) &&
                    denied.length === 0 &&
                    results.every((item) => !item.trimmed && !item.result.truncated),
                rowCount: results.reduce((sum, item) => sum + item.result.rowCount, 0),
                truncated: results.some((item) => item.trimmed || item.result.truncated),
                results: results.map((item, index) => {
                    const parsed = parseJsonObject(item.json) || {};
                    return {
                        index: index + 1,
                        success: item.result.success,
                        error: item.result.error,
                        columns: parsed.columns,
                        rows: parsed.rows,
                        rowCount: parsed.rowCount,
                        truncated: parsed.truncated,
                        complete: item.result.success && !item.trimmed && !item.result.truncated,
                        ...(parsed.hint ? { hint: parsed.hint } : {}),
                    };
                }),
                ...(denied.length
                    ? {
                        skipped: denied.length,
                        hint: '部分查询已达到本次上限，不要再重复查询；请基于已有结果继续。',
                    }
                    : {}),
                ...(nudge ? { nudge } : {}),
                ...remaining,
            };
            json = JSON.stringify(payload);
        }
        if (budget) {
            results.forEach((item, index) => {
                const parsed = parseJsonObject(item.json) || {};
                const columns = Array.isArray(parsed.columns)
                    ? parsed.columns.map((column) => String(column))
                    : [];
                const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
                const id = runnable.length === 1 && !rawQueries.length ? queryId : `${queryId}#${index + 1}`;
                budget.recordQueryResult(id, columns, rows);
            });
        }
        const deny = budget ? budget.takeChars(json.length) : null;
        if (deny) {
            logLine(`tool run_sql budget blocked: ${deny}`);
            return budgetMessage('chars', deny);
        }
        const rowCount = results.reduce((sum, item) => sum + item.result.rowCount, 0);
        const failed = results.filter((item) => !item.result.success).length;
        logLine(`tool run_sql ${failed ? 'error' : 'ok'} queries=${results.length} rows=${rowCount}` +
            `${results.some((item) => item.trimmed) ? '+' : ''} chars=${json.length} ` +
            `elapsed=${Date.now() - started}ms`);
        return json;
    }, {
        name: 'run_sql',
        description: batchQueries
            ? '执行只读查询并返回 JSON 结果（columns/rows/rowCount/truncated；rows 为二维数组，按 columns 顺序对齐）。' +
                '能一次取回的口径请合并到 queries 数组（2~10 条独立 SQL 并行执行），少走模型往返；' +
                '工具结果里的 remainingSql 为 0 时不要再查询，直接出报告/收尾；' +
                `数据量大时请用 GROUP BY / ${limitWord} 聚合，不要拉全量明细。` +
                (dialectTip ? ` ${dialectTip}` : '')
            : '执行一条只读查询并返回 JSON 结果（columns/rows/rowCount/truncated；rows 为二维数组，按 columns 顺序对齐）。' +
                '工具结果里的 remainingSql 为 0 时不要再查询，直接出报告/收尾；' +
                `数据量大时请用 GROUP BY / ${limitWord} 聚合，不要拉全量明细。` +
                (dialectTip ? ` ${dialectTip}` : ''),
        schema: z.object({
            sql: z.string().optional().describe('单条只读 SQL；与 queries 二选一'),
            queries: z
                .array(z.string())
                .max(10)
                .optional()
                .describe('2~10 条互相独立的只读 SQL，一次调用并行执行（推荐）'),
        }),
    });
    const askClarificationTool = tool(async ({ question, fields, allow_skip }) => {
        return JSON.stringify({
            success: true,
            clarify: true,
            question: String(question || '').slice(0, 300),
            fields: Array.isArray(fields) ? fields.slice(0, 5) : [],
            allow_skip: allow_skip !== false,
        });
    }, {
        name: 'ask_clarification',
        description: '当用户问题缺少关键条件（如时间范围、仓库/组织、指标口径、统计维度）且无法从上下文推断时调用。' +
            '一次最多问 5 个字段，只问真正影响结果的条件；能从上下文推断的不要问。' +
            '调用后本轮会暂停，前端展示表单，用户补充后再继续分析。',
        schema: z.object({
            question: z.string().describe('给用户看的说明，例如：为了准确统计库存，请补充以下条件'),
            fields: z
                .array(z.object({
                key: z.string().describe('字段 key，使用英文/拼音，避免中文'),
                label: z.string().describe('字段名，例如：时间范围 / 仓库 / 指标'),
                type: z
                    .enum(['select', 'multiselect', 'date', 'daterange', 'number', 'text'])
                    .describe('控件类型；有固定选项用 select，可多选用 multiselect'),
                required: z.boolean().optional().describe('是否必填，默认 false'),
                options: z
                    .array(z.object({
                    label: z.string(),
                    value: z.union([z.string(), z.number()]),
                }))
                    .max(30)
                    .optional()
                    .describe('select/multiselect 的候选项'),
                placeholder: z.string().optional(),
                default: z
                    .union([
                    z.string(),
                    z.number(),
                    z.boolean(),
                    z.array(z.union([z.string(), z.number()])),
                ])
                    .optional(),
            }))
                .min(1)
                .max(5),
            allow_skip: z.boolean().optional().describe('是否允许用户跳过补充，默认 true'),
        }),
    });
    const renderChartTool = tool(async (input) => {
        const spec = { ...input, component: DEFAULT_VISUAL_COMPONENT };
        // 只把轻量确认回灌给模型，完整图表 option 走 artifact 给前端，避免下一轮重新吃一遍源码
        return [
            JSON.stringify({
                success: true,
                component: spec.component,
                title: spec.title || '',
                hint: '图表已渲染，正文用一两句话给结论即可。',
            }),
            spec,
        ];
    }, {
        name: LEGACY_CHART_TOOL_NAME,
        description: '【仅单图场景】用户只想看一张图、不需要整份报表时调用。' +
            '传入标准 ECharts option（数据内嵌，中文标题/坐标/图例）；调用后正文只写结论；查询为空不要调用。',
        schema: z.object({
            title: z.string().optional().describe('图表标题'),
            height: z.number().optional().describe('高度 px，默认 300'),
            props: z
                .object({
                option: z.record(z.string(), z.any()).describe('ECharts option，数据内嵌'),
            })
                .describe('透传给图表组件的 props'),
        }),
        responseFormat: 'content_and_artifact',
    });
    const renderReportTool = tool(async (input) => {
        const spec = { ...input, component: REPORT_COMPONENT };
        // 报表 spec 可能很大（40 个 block + ECharts option），只回灌轻量确认
        return [
            JSON.stringify({
                success: true,
                component: spec.component,
                title: spec.title || '',
                hint: '报表已渲染，正文只写一两句总结。',
            }),
            spec,
        ];
    }, {
        name: REPORT_TOOL_NAME,
        description: REPORT_TOOL_DESCRIPTION,
        // 轻量 schema：完整组件契约已在描述/系统提示里，避免每次请求都带上大段 JSON Schema
        schema: z.object({
            title: z.string().describe('报表标题，中文'),
            subtitle: z.string().optional(),
            meta: z.array(z.string()).max(5).optional(),
            blocks: z
                .array(z.record(z.string(), z.any()))
                .min(1)
                .max(40)
                .describe('自由组合的区块数组；普通区块 type 取 section/summary/notice/kpi/hbar/progress/' +
                'chips/dist/chart/table/risk/insights，任意区块都可带 span(1~12)；' +
                '需要分栏时用 {type:"row", columns:[{span:8, blocks:[...]}, {span:4, blocks:[...]}]}；字段见工具描述'),
        }),
        responseFormat: 'content_and_artifact',
    });
    const renderHtmlReportTool = tool(async (input) => {
        const normalized = normalizeHtmlReportInput(input);
        const coverage = normalized.coverage || [];
        const fail = (error, detail) => [JSON.stringify({ success: false, error, detail }), null];
        if (!coverage.length) {
            return fail('缺少 coverage：报告里每个指标/数字都要标注 ok / missing / needs_review / pending；请先补充覆盖率再出报告。');
        }
        const pending = coverage.filter((entry) => entry.status === 'pending');
        if (pending.length) {
            return fail('仍有指标处于 pending（还没查），不能生成报告。', pending.map((entry) => entry.item));
        }
        const noSource = coverage.filter((entry) => entry.status === 'ok' && !entry.source);
        if (noSource.length) {
            return fail('ok 指标必须提供数据来源（SQL/queryId/表名）。', noSource.map((entry) => entry.item));
        }
        const noNote = coverage.filter((entry) => (entry.status === 'missing' || entry.status === 'needs_review') &&
            !(entry.note && entry.note.trim()));
        if (noNote.length) {
            return fail('missing/needs_review 指标必须写清原因（note）。', noNote.map((entry) => entry.item));
        }
        const budget = currentBudget();
        const strictNumberCheck = budget?.limits.strictNumberCheck === true;
        const numberCheck = budget
            ? validateCoverageNumbers(coverage, budget, strictNumberCheck)
            : null;
        if (numberCheck && strictNumberCheck && numberCheck.mismatches.length) {
            return fail('报告中的数值无法在本轮查询结果中找到，请核对数字，或把对应指标改标 needs_review / missing。', numberCheck.mismatches);
        }
        if (numberCheck?.mismatches.length) {
            for (const mismatch of numberCheck.mismatches) {
                normalized.warnings.push(`数值核对：${mismatch}`);
            }
        }
        if (numberCheck)
            logLine(formatNumberCheck(numberCheck));
        const elementInfo = normalized.elements.length ? normalized.elements.join(',') : '-';
        const richness = analyzeReportRichness(normalized.html, normalized.charts);
        const richnessInfo = `data=${richness.dataElements.length}(${richness.dataElements.join(',') || '-'}) ` +
            `narrative=${richness.narrativeElements.length}(${richness.narrativeElements.join(',') || '-'}) ` +
            `sections=${richness.sections} tables=${richness.tables} ` +
            `charts=${richness.chartTypes.join(',') || '-'}`;
        if (richness.dataElements.length < 1) {
            logLine('report richness warning: data elements too few');
        }
        logLine(`tool render_html_report ok chars=${normalized.html.length} css=${normalized.css?.length || 0} ` +
            `warnings=${normalized.warnings.length} elements=${elementInfo} ${richnessInfo}` +
            (normalized.warnings.length ? ` ${normalized.warnings.join(' | ').slice(0, 400)}` : ''));
        // 模型只需要知道“已渲染”；完整 HTML/CSS/charts 通过 artifact 交给前端。
        // 这样既不会把源码再喂回模型，也不会因为 warnings 触发重新生成整份报告。
        return [
            JSON.stringify({
                success: true,
                component: normalized.component,
                title: normalized.title,
                template: normalized.template,
                layout: normalized.layout,
                visualStyle: normalized.visualStyle,
                charts: normalized.charts ? Object.keys(normalized.charts).length : 0,
                coverage: {
                    ok: coverage.filter((entry) => entry.status === 'ok').length,
                    missing: coverage.filter((entry) => entry.status === 'missing').length,
                    needs_review: coverage.filter((entry) => entry.status === 'needs_review').length,
                },
                ...(numberCheck
                    ? {
                        numberCheck: {
                            checked: numberCheck.checked,
                            matched: numberCheck.matched,
                            skipped: numberCheck.skipped,
                            mismatches: numberCheck.mismatches,
                        },
                    }
                    : {}),
                hint: '报告已渲染。数据质量提示由前端展示，正文只写一句“报告已生成”，不要重试。',
            }),
            normalized,
        ];
    }, {
        name: HTML_REPORT_TOOL_NAME,
        description: HTML_REPORT_TOOL_DESCRIPTION,
        schema: htmlReportSchema,
        responseFormat: 'content_and_artifact',
    });
    const skills = getSkillPack();
    const knowledge = getKnowledgePack();
    const extraTools = [];
    if (skills && skills.skills.length) {
        extraTools.push(tool(async ({ keyword }) => {
            const budget = currentBudget();
            const list = skills.search(String(keyword || ''), 20);
            const json = JSON.stringify({
                skills: list.map((skill) => ({
                    name: skill.name,
                    description: skill.description,
                    when_to_use: skill.whenToUse,
                    version: skill.version,
                })),
                total: skills.skills.length,
                ...(budget ? budget.remaining() : {}),
            });
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool list_skills keyword=${String(keyword || '').slice(0, 40)} hits=${list.length}`);
            return json;
        }, {
            name: 'list_skills',
            description: '列出可用技能（name/description/when_to_use）。系统提示里已有技能目录；' +
                '目录被截断或需要按关键词筛选时使用。',
            schema: z.object({
                keyword: z.string().optional().describe('可选：按技能名/描述/适用场景筛选'),
            }),
        }), tool(async ({ name }) => {
            const budget = currentBudget();
            const skill = skills.read(String(name || ''), 12000);
            if (!skill) {
                return JSON.stringify({
                    success: false,
                    error: `技能不存在：${name}`,
                    hint: '先用 list_skills 查看可用技能名。',
                });
            }
            const json = JSON.stringify({
                success: true,
                name: skill.skill.name,
                content: skill.content,
                files: skill.files,
                truncated: skill.truncated,
                ...(budget ? budget.remaining() : {}),
            });
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool read_skill name=${skill.skill.name} chars=${skill.content.length}`);
            return json;
        }, {
            name: 'read_skill',
            description: '读取技能完整步骤（SKILL.md 正文，不含 frontmatter），单次最多 12000 字符。' +
                '用户任务与技能目录中的描述匹配时先读取，再按步骤执行；不要凭标题猜流程。',
            schema: z.object({
                name: z.string().describe('技能名，例如 report-authoring'),
            }),
        }), tool(async ({ name, path }) => {
            const budget = currentBudget();
            const file = skills.readFile(String(name || ''), String(path || ''), 6000);
            if (!file) {
                return JSON.stringify({
                    success: false,
                    error: '技能文件不存在、不是文本文件或路径不允许',
                });
            }
            const json = JSON.stringify({
                success: true,
                name,
                path: file.path,
                content: file.content,
                truncated: file.truncated,
                ...(budget ? budget.remaining() : {}),
            });
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool read_skill_file name=${String(name || '')} path=${file.path} ` +
                `chars=${file.content.length}`);
            return json;
        }, {
            name: 'read_skill_file',
            description: '读取技能内的参考文件（references/assets 下的文本文件），单次最多 6000 字符。' +
                '路径相对技能目录，例如 references/metrics.md。',
            schema: z.object({
                name: z.string().describe('技能名'),
                path: z.string().describe('技能内相对路径，例如 references/metrics.md'),
            }),
        }));
    }
    if (knowledge && (knowledge.docs.length || knowledge.reports.length)) {
        extraTools.push(tool(async ({ query }) => {
            const budget = currentBudget();
            const hits = knowledge.search(String(query || ''), 5);
            const json = JSON.stringify(hits.map((hit) => ({
                path: hit.path,
                title: hit.title,
                kind: hit.kind,
                snippet: hit.snippet,
            })));
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool search_knowledge query=${String(query || '').slice(0, 40)} hits=${hits.length}`);
            return json;
        }, {
            name: 'search_knowledge',
            description: '在客户知识包（业务术语、表说明、数据质量说明、报告结构）里搜索相关片段。' +
                '需要业务口径或表含义时先调用；不要凭空猜测业务规则。',
            schema: z.object({
                query: z.string().describe('要搜索的业务词/表名/指标/问题关键词'),
            }),
        }), tool(async ({ path }) => {
            const budget = currentBudget();
            const content = knowledge.read(String(path || ''), 6000);
            if (!content)
                return JSON.stringify({ success: false, error: '知识文档不存在或路径不允许' });
            const json = JSON.stringify({ path, content });
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool read_knowledge path=${String(path || '').slice(0, 80)} chars=${content.length}`);
            return json;
        }, {
            name: 'read_knowledge',
            description: '读取知识包中的一篇文档（Markdown），单次最多 6000 字符。' +
                '先用 search_knowledge 找到 path，再按需读取。',
            schema: z.object({
                path: z.string().describe('知识包内相对路径，例如 docs/业务术语.md'),
            }),
        }));
    }
    extraTools.push(tool(async ({ query }) => {
        const budget = currentBudget();
        const candidates = await retrieveTables(db, String(query || ''), 8);
        const json = JSON.stringify(candidates.length
            ? candidates
            : {
                tables: [],
                hint: '没有检索到相关表；请换关键词，或用 list_tables(keyword) 按表名/注释查找。',
            });
        const deny = budget ? budget.takeChars(json.length) : null;
        if (deny)
            return budgetMessage('chars', deny);
        logLine(`tool search_tables query=${String(query || '').slice(0, 40)} hits=${candidates.length}`);
        return json;
    }, {
        name: 'search_tables',
        description: '按业务词/关键词检索相关表，返回 Top 8 紧凑表目录（表名、注释、行数级别、关键字段、关联表）。' +
            '系统每轮会预检索一批候选表；需要更多表时用本工具，不要假设全库表结构。',
        schema: z.object({
            query: z.string().describe('业务词、表名、指标或问题关键词'),
        }),
    }));
    if (knowledge && knowledge.queries.length) {
        extraTools.push(tool(async ({ key, params }) => {
            const budget = currentBudget();
            const saved = knowledge.getQuery(String(key || ''));
            if (!saved)
                return JSON.stringify({ success: false, error: `预置查询不存在：${key}` });
            if (saved.status === 'needs_review') {
                return JSON.stringify({
                    success: false,
                    error: `预置查询「${saved.label || saved.key}」口径待确认，不能用于报告数值`,
                    status: 'needs_review',
                });
            }
            if (saved.status === 'missing') {
                return JSON.stringify({
                    success: false,
                    error: saved.note || `预置查询「${saved.label || saved.key}」缺少数据/字段`,
                    status: 'missing',
                });
            }
            const template = typeof saved.sql === 'string'
                ? saved.sql
                : db.type === 'kingbase'
                    ? saved.sql.kingbase
                    : saved.sql.sqlserver;
            if (!template) {
                return JSON.stringify({
                    success: false,
                    error: `预置查询「${saved.key}」没有当前数据库方言的 SQL`,
                });
            }
            const blocked = budget ? budget.takeSqlQuery() : null;
            if (blocked)
                return budgetMessage('sqlQueries', blocked);
            const input = params && typeof params === 'object' ? params : {};
            const bound = bindSavedSql(template, input, db);
            if (bound.missing.length) {
                return JSON.stringify({
                    success: false,
                    error: `缺少预置查询参数：${bound.missing.join(', ')}`,
                    params: saved.params || [],
                });
            }
            const result = await runQuery(db, bound.sql);
            const maxChars = budget ? budget.limits.maxResultChars : 8000;
            const { json: resultJson, trimmed } = trimQueryResult(result, maxChars, limitWord);
            const parsed = parseJsonObject(resultJson) || {};
            const queryId = `saved-${saved.key}-${Date.now().toString(36)}`;
            const json = JSON.stringify({
                ...parsed,
                queryId,
                savedQuery: saved.key,
                complete: result.success && !trimmed && !result.truncated,
            });
            if (budget) {
                const columns = Array.isArray(parsed.columns)
                    ? parsed.columns.map((column) => String(column))
                    : [];
                const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
                budget.recordQueryResult(queryId, columns, rows);
            }
            const deny = budget ? budget.takeChars(json.length) : null;
            if (deny)
                return budgetMessage('chars', deny);
            logLine(`tool run_saved_query ${result.success ? 'ok' : 'error'} key=${saved.key} ` +
                `rows=${result.rowCount} chars=${json.length}`);
            return json;
        }, {
            name: 'run_saved_query',
            description: '执行知识包里的预置参数化查询（queries/*.json）。' +
                '适合常用指标；不确定 key 时先用 search_knowledge 查看文档。' +
                '返回结果含 queryId、complete、rows；complete=false 不能当完整数据使用。',
            schema: z.object({
                key: z.string().describe('预置查询 key'),
                params: z
                    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
                    .optional()
                    .describe('参数，如 { from: "2024-12-16", to: "2024-12-22" }'),
            }),
        }));
    }
    return [
        getSchemaTool,
        getTableSchemaTool,
        ...extraTools,
        runQueryTool,
        ...(clarifyEnabled ? [askClarificationTool] : []),
        renderReportTool,
        renderHtmlReportTool,
        renderChartTool,
    ].filter((item) => {
        if (!options.reportMode)
            return true;
        // 报告轮：只保留发现表、看结构、查数、读技能、出 HTML 报告（以及知识包相关工具）。
        return [
            'list_tables',
            'search_tables',
            'get_table_schema',
            'run_sql',
            'ask_clarification',
            'render_html_report',
            'list_skills',
            'read_skill',
            'read_skill_file',
            'search_knowledge',
            'read_knowledge',
            'run_saved_query',
        ].includes(item.name);
    });
}
