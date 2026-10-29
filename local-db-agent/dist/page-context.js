import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getKnowledgePack } from './knowledge.js';
const currentDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KNOWLEDGE_DIR = resolve(currentDir, '..', 'knowledge');
const MAX_URL = 500;
const GENERIC_TOKENS = new Set([
    'api',
    'app',
    'v1',
    'v2',
    'pages',
    'page',
    'list',
    'get',
    'post',
    'put',
    'delete',
    'query',
    'search',
    'info',
    'detail',
    'details',
    'export',
    'import',
    'by',
    'id',
    'create',
    'update',
    'remove',
    'check',
    'count',
]);
const indexCache = new Map();
function knowledgeRoot() {
    return getKnowledgePack()?.dir || process.env.AGENT_KNOWLEDGE_DIR || DEFAULT_KNOWLEDGE_DIR;
}
function readJson(file) {
    try {
        if (!existsSync(file))
            return null;
        return JSON.parse(readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
function normalizePath(raw) {
    let text = String(raw || '').trim().slice(0, MAX_URL);
    if (!text)
        return '';
    text = text.split('#')[0].split('?')[0];
    try {
        if (/^https?:\/\//i.test(text))
            text = new URL(text).pathname;
    }
    catch {
        // Keep the original relative path.
    }
    const apiAt = text.toLowerCase().indexOf('/api/');
    if (apiAt > 0)
        text = text.slice(apiAt);
    if (!text.startsWith('/'))
        text = `/${text}`;
    return text.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}
function normalizeToken(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/["'`[\]{}]/g, '')
        .replace(/[^a-z0-9_\u3400-\u9fff]+/g, '');
}
function pathTokens(path) {
    const out = new Set();
    for (const part of path.split('/')) {
        if (!part || part.startsWith('{'))
            continue;
        const lower = part.toLowerCase();
        out.add(lower);
        out.add(lower.replace(/[-_]/g, ''));
        for (const piece of lower.split(/[-_]/)) {
            if (piece && !GENERIC_TOKENS.has(piece))
                out.add(piece);
        }
    }
    return Array.from(out).filter(Boolean);
}
function templateRegex(path) {
    const escaped = path
        .split('/')
        .map(segment => {
        if (/^\{[^}]+\}$/.test(segment))
            return '[^/]+';
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
        .join('/');
    return new RegExp(`^${escaped}/?$`, 'i');
}
function buildIndex(knowledgeDir) {
    const cached = indexCache.get(knowledgeDir);
    if (cached)
        return cached;
    const map = readJson(join(knowledgeDir, 'api-map.json'));
    const manifest = readJson(join(knowledgeDir, 'manifest.json'));
    const exact = new Map();
    const byPath = new Map();
    const templates = [];
    for (const [key, endpoint] of Object.entries(map?.endpoints || {})) {
        if (!endpoint || typeof endpoint !== 'object')
            continue;
        const item = { ...endpoint, key };
        const method = String(endpoint.method || key.split(' ')[0] || 'POST').toUpperCase();
        const path = normalizePath(String(endpoint.path || key.split(' ').slice(1).join(' ')));
        if (!path)
            continue;
        exact.set(`${method} ${path}`, item);
        const pathList = byPath.get(path) || [];
        pathList.push(item);
        byPath.set(path, pathList);
        if (path.includes('{'))
            templates.push({ regex: templateRegex(path), endpoint: item });
    }
    templates.sort((a, b) => b.regex.source.length - a.regex.source.length);
    const index = { map, manifest, exact, byPath, templates };
    indexCache.set(knowledgeDir, index);
    return index;
}
function tableFromTokens(path, manifest) {
    const tokens = pathTokens(path);
    if (!tokens.length || !manifest?.tables)
        return [];
    let best = '';
    let bestScore = 0;
    for (const [table, info] of Object.entries(manifest.tables)) {
        const aliases = [table, ...(info.aliases || [])].map(normalizeToken).filter(Boolean);
        if (!aliases.length)
            continue;
        let score = 0;
        for (const token of tokens) {
            const lower = normalizeToken(token);
            if (!lower)
                continue;
            for (const alias of aliases) {
                if (alias === lower)
                    score += 5;
                else if (alias.includes(lower) || lower.includes(alias))
                    score += 2;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            best = table;
        }
    }
    return bestScore >= 2 ? [best] : [];
}
function fromEndpoint(endpoint, input, apiUrl, manifest, source) {
    const tables = Array.from(new Set((endpoint.tables || []).map(String).filter(Boolean)));
    const fallbackTables = tables.length ? tables : tableFromTokens(apiUrl, manifest);
    const usedTokens = !tables.length && fallbackTables.length > 0;
    return {
        requestedUrl: String(input.apiUrl || ''),
        apiUrl,
        method: String(endpoint.method || input.method || 'POST').toUpperCase(),
        matchedKey: endpoint.key,
        summary: endpoint.summary,
        tables: fallbackTables,
        primaryTable: fallbackTables[0],
        confidence: Number(endpoint.confidence) || (fallbackTables.length ? 0.45 : 0),
        source: fallbackTables.length ? (usedTokens ? 'path-tokens' : source) : 'unresolved',
        ...(fallbackTables.length
            ? usedTokens
                ? { reason: '接口已识别，但 Swagger 没有表映射；按 URL 关键词兜底' }
                : {}
            : {
                reason: endpoint.external
                    ? '该接口是外部接口，知识包没有对应表'
                    : '接口已找到，但 Swagger/知识库没有映射到表',
            }),
    };
}
/**
 * 把页面分页接口解析成表。
 *
 * 未命中时不抛错、不臆造表，返回 source=unresolved 和原因，由调用方决定
 * 是否向用户说明或继续按普通问题处理。
 */
export function resolvePageContext(input, options = {}) {
    const rawUrl = String(input?.apiUrl || '').trim();
    if (!rawUrl)
        return null;
    const dir = options.knowledgeDir || knowledgeRoot();
    const index = buildIndex(dir);
    const apiUrl = normalizePath(rawUrl);
    const requestedMethod = String(input?.method || 'POST').toUpperCase();
    if (!apiUrl) {
        return {
            requestedUrl: rawUrl,
            apiUrl: '',
            method: requestedMethod,
            tables: [],
            confidence: 0,
            source: 'unresolved',
            reason: '接口 URL 为空或不合法',
        };
    }
    const exact = index.exact.get(`${requestedMethod} ${apiUrl}`);
    if (exact)
        return fromEndpoint(exact, input, apiUrl, index.manifest, 'api-map');
    // 方法没传对时，仍按路径匹配；优先用户指定方法，其次 POST/GET。
    const pathMatches = index.byPath.get(apiUrl) || [];
    if (pathMatches.length) {
        const preferred = pathMatches.find(item => String(item.method).toUpperCase() === requestedMethod) ||
            pathMatches.find(item => String(item.method).toUpperCase() === 'POST') ||
            pathMatches.find(item => String(item.method).toUpperCase() === 'GET') ||
            pathMatches[0];
        return fromEndpoint(preferred, input, apiUrl, index.manifest, 'api-map');
    }
    for (const template of index.templates) {
        if (!template.regex.test(apiUrl))
            continue;
        const method = String(template.endpoint.method || '').toUpperCase();
        if (method && method !== requestedMethod)
            continue;
        return fromEndpoint(template.endpoint, input, apiUrl, index.manifest, 'api-map');
    }
    const fallback = tableFromTokens(apiUrl, index.manifest);
    if (fallback.length) {
        return {
            requestedUrl: rawUrl,
            apiUrl,
            method: requestedMethod,
            tables: fallback,
            primaryTable: fallback[0],
            confidence: 0.45,
            source: 'path-tokens',
            reason: '接口未在 Swagger 映射中命中，按 URL 关键词匹配到表，置信度较低',
        };
    }
    return {
        requestedUrl: rawUrl,
        apiUrl,
        method: requestedMethod,
        tables: [],
        confidence: 0,
        source: 'unresolved',
        reason: index.map
            ? 'api-map 中没有该接口，且 URL 关键词也无法匹配到表'
            : '知识包没有 api-map.json，无法根据接口识别表',
    };
}
/**
 * 只有用户明确提到“当前页面/本页/这个表格/这个接口”或询问表时，
 * 才使用 pageContext；普通问候和普通全局问题不应被页面表污染。
 */
export function isPageContextRelevant(text) {
    const question = String(text || '').trim();
    if (!question)
        return false;
    return (/当前页面|本页|这个页面|当前表格|这个表格|这张表|这个表|当前数据|本页数据|当前接口|这个接口|当前列表|本列表/i.test(question) || isTableIdentificationQuestion(question));
}
/**
 * 判断用户是不是只问“当前页面接口对应哪张表”。
 */
export function isTableIdentificationQuestion(text) {
    const question = String(text || '').trim();
    if (!question || question.length > 80)
        return false;
    if (/(分析|统计|趋势|报告|导出|汇总|明细|多少|数量|占比|排名|对比|列出|最多|最少|最大|最小|排序|空值|缺失|质量)/.test(question)) {
        return false;
    }
    return /哪张表|哪个表|什么表|表名|表叫什么|对应(?:的)?(?:哪张表|哪个表|什么表)|接口.*(?:哪张表|哪个表|什么表|表名)/i.test(question);
}
export function formatPageContextAnswer(context) {
    if (!context) {
        return ('本轮没有收到当前页面的分页接口 URL，无法判断对应表。\n' +
            '请在 agentChat 传 `pageContext.apiUrl`，例如：\n' +
            '`{ apiUrl: "api/app/product/product-pages" }`。');
    }
    const lines = [`当前页面分页接口：${context.method} ${context.apiUrl}`];
    if (context.summary)
        lines.push(`接口说明：${context.summary}`);
    if (context.tables.length) {
        lines.push(`主表：${context.primaryTable || context.tables[0]}` +
            (context.tables.length > 1 ? `\n候选表：${context.tables.slice(1).join('、')}` : ''));
        const sourceText = context.source === 'api-map'
            ? '知识包 api-map'
            : context.source === 'path-tokens'
                ? 'URL 关键词推断'
                : '未识别';
        lines.push(`判断依据：${sourceText}，置信度 ${context.confidence.toFixed(2)}${context.source === 'path-tokens' ? '（建议确认接口映射）' : ''}。`);
        lines.push('本轮只做接口到表的映射，没有执行 SQL。');
    }
    else {
        lines.push(`未识别到对应表：${context.reason || '接口未映射'}`);
        lines.push('本轮不会猜测表名，也没有执行 SQL。');
    }
    return lines.join('\n');
}
export function clearPageContextCache() {
    indexCache.clear();
}
