import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const currentDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = resolve(currentDir, '..', 'knowledge');
const MAX_DOC_BYTES = 512 * 1024;
const MAX_READ_CHARS = 6000;
const MAX_INDEX_DOCS = 20;
let cached;
function knowledgeDir() {
    return process.env.AGENT_KNOWLEDGE_DIR || DEFAULT_DIR;
}
function listFiles(dir, ext) {
    if (!existsSync(dir))
        return [];
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.'))
            continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listFiles(full, ext));
            continue;
        }
        if (!entry.name.toLowerCase().endsWith(ext))
            continue;
        try {
            if (statSync(full).size > MAX_DOC_BYTES)
                continue;
        }
        catch {
            continue;
        }
        out.push(full);
    }
    return out.sort();
}
function titleOf(content, fallback) {
    const line = content
        .split(/\r?\n/)
        .map(item => item.trim())
        .find(item => /^#{1,3}\s+/.test(item));
    return line ? line.replace(/^#{1,3}\s+/, '').trim() : fallback;
}
function headingsOf(content) {
    return content
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(item => /^#{1,3}\s+/.test(item))
        .map(item => item.replace(/^#{1,3}\s+/, '').trim())
        .filter(Boolean);
}
function readDoc(packDir, full, kind) {
    let content;
    try {
        content = readFileSync(full, 'utf8');
    }
    catch {
        return null;
    }
    const path = relative(packDir, full).split('\\').join('/');
    const fallback = path.replace(/\.md$/i, '');
    return {
        path,
        title: titleOf(content, fallback),
        headings: headingsOf(content),
        kind,
        content,
    };
}
function loadQueries(packDir) {
    const dir = join(packDir, 'queries');
    const out = [];
    for (const file of listFiles(dir, '.json')) {
        let parsed;
        try {
            parsed = JSON.parse(readFileSync(file, 'utf8'));
        }
        catch {
            continue;
        }
        const list = Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object' && Array.isArray(parsed.queries)
                ? (parsed.queries)
                : [parsed];
        for (const item of list) {
            if (!item || typeof item !== 'object')
                continue;
            const raw = item;
            if (typeof raw.key !== 'string' || !raw.key.trim())
                continue;
            const sql = raw.sql;
            if (typeof sql !== 'string' &&
                !(sql && typeof sql === 'object' && !Array.isArray(sql))) {
                continue;
            }
            out.push({
                key: raw.key.trim(),
                label: typeof raw.label === 'string' ? raw.label : undefined,
                description: typeof raw.description === 'string' ? raw.description : undefined,
                sql: sql,
                params: Array.isArray(raw.params)
                    ? raw.params.map(value => String(value)).filter(Boolean)
                    : undefined,
                tables: Array.isArray(raw.tables)
                    ? raw.tables.map(value => String(value)).filter(Boolean)
                    : undefined,
                status: raw.status === 'needs_review' || raw.status === 'missing' || raw.status === 'ready'
                    ? raw.status
                    : 'ready',
                note: typeof raw.note === 'string' ? raw.note : undefined,
            });
        }
    }
    return out;
}
function tokenize(text) {
    const lower = ` ${String(text || '').toLowerCase()} `;
    const tokens = new Set();
    for (const word of lower.match(/[a-z0-9_]+/g) || []) {
        if (word.length >= 2)
            tokens.add(word);
    }
    for (const run of lower.match(/[\u3400-\u9fff]+/g) || []) {
        if (run.length === 1)
            tokens.add(run);
        for (let i = 0; i < run.length - 1; i++)
            tokens.add(run.slice(i, i + 2));
        if (run.length >= 3)
            tokens.add(run);
    }
    return Array.from(tokens);
}
function snippetOf(content, terms) {
    const flat = content.replace(/\s+/g, ' ').trim();
    if (!flat)
        return '';
    const lower = flat.toLowerCase();
    let index = -1;
    for (const term of terms) {
        const hit = lower.indexOf(term.toLowerCase());
        if (hit >= 0 && (index < 0 || hit < index))
            index = hit;
    }
    const start = Math.max(0, index < 0 ? 0 : index - 60);
    return flat.slice(start, start + 260);
}
function buildIndexText(manifest, docs, reports, queries) {
    const lines = [`【知识包】${manifest.name}${manifest.description ? `：${manifest.description}` : ''}`];
    const docList = [...docs, ...reports];
    if (docList.length) {
        lines.push('可用文档（需要细节用 search_knowledge / read_knowledge）：');
        for (const doc of docList.slice(0, MAX_INDEX_DOCS)) {
            lines.push(`- ${doc.title}（${doc.path}）`);
        }
        if (docList.length > MAX_INDEX_DOCS) {
            lines.push(`- 其余 ${docList.length - MAX_INDEX_DOCS} 篇请用 search_knowledge 查找`);
        }
    }
    if (queries.length) {
        lines.push('可用预置查询（run_saved_query）：');
        for (const query of queries.slice(0, 12)) {
            lines.push(`- ${query.key}${query.label ? `（${query.label}）` : ''}`);
        }
    }
    return lines.join('\n').slice(0, 2400);
}
function safeReadPath(packDir, requested) {
    if (!requested || typeof requested !== 'string')
        return null;
    const clean = requested.trim().replace(/^\/+/, '');
    if (isAbsolute(clean))
        return null;
    const full = normalize(join(packDir, clean));
    const rel = relative(packDir, full);
    if (!rel || rel.startsWith('..') || isAbsolute(rel))
        return null;
    return full;
}
function buildPack(packDir) {
    const manifestFile = join(packDir, 'manifest.json');
    if (!existsSync(manifestFile)) {
        return { pack: null, status: { loaded: false, reason: 'manifest.json 不存在' } };
    }
    let manifest;
    try {
        manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    }
    catch {
        return { pack: null, status: { loaded: false, reason: 'manifest.json 不是合法 JSON' } };
    }
    if (!manifest || typeof manifest.name !== 'string') {
        return { pack: null, status: { loaded: false, reason: 'manifest.name 缺失' } };
    }
    const docs = listFiles(join(packDir, 'docs'), '.md')
        .map(file => readDoc(packDir, file, 'doc'))
        .filter((doc) => Boolean(doc));
    const reports = listFiles(join(packDir, 'reports'), '.md')
        .map(file => readDoc(packDir, file, 'report'))
        .filter((doc) => Boolean(doc));
    const queries = loadQueries(packDir);
    const hasMetadata = docs.length > 0 ||
        reports.length > 0 ||
        queries.length > 0 ||
        Object.keys(manifest.tables || {}).length > 0 ||
        (manifest.priorityTables || []).length > 0;
    if (!hasMetadata) {
        return {
            pack: null,
            status: {
                loaded: false,
                name: manifest.name,
                reason: '知识包为空（没有 docs/queries/tables）',
            },
        };
    }
    const search = (query, limit = 5) => {
        const terms = tokenize(query);
        if (!terms.length) {
            return [...docs, ...reports].slice(0, limit).map(doc => ({
                path: doc.path,
                title: doc.title,
                kind: doc.kind,
                snippet: doc.content.replace(/\s+/g, ' ').slice(0, 220),
                score: 0,
            }));
        }
        const hits = [];
        for (const doc of [...docs, ...reports]) {
            const title = `${doc.title} ${doc.headings.join(' ')}`.toLowerCase();
            const body = doc.content.toLowerCase();
            let score = 0;
            for (const term of terms) {
                if (title.includes(term))
                    score += 4;
                else if (body.includes(term))
                    score += 1;
            }
            if (!score)
                continue;
            hits.push({
                path: doc.path,
                title: doc.title,
                kind: doc.kind,
                snippet: snippetOf(doc.content, terms),
                score,
            });
        }
        return hits.sort((a, b) => b.score - a.score).slice(0, limit);
    };
    const read = (requested, maxChars = MAX_READ_CHARS) => {
        const full = safeReadPath(packDir, requested);
        if (!full || !existsSync(full))
            return null;
        try {
            const content = readFileSync(full, 'utf8');
            return content.slice(0, maxChars);
        }
        catch {
            return null;
        }
    };
    return {
        pack: {
            dir: packDir,
            manifest,
            docs,
            reports,
            queries,
            indexText: buildIndexText(manifest, docs, reports, queries),
            search,
            read,
            getQuery: key => queries.find(query => query.key.toLowerCase() === String(key).toLowerCase()),
        },
        status: { loaded: true, name: manifest.name },
    };
}
let cachedStatus;
function ensureLoaded(dir) {
    if (cached !== undefined)
        return;
    const result = buildPack(dir || knowledgeDir());
    cached = result.pack;
    cachedStatus = result.status;
}
export function loadKnowledgePack(dir) {
    const result = buildPack(dir || knowledgeDir());
    cached = result.pack;
    cachedStatus = result.status;
    return cached;
}
export function getKnowledgePack() {
    ensureLoaded();
    return cached || null;
}
export function getKnowledgeStatus() {
    ensureLoaded();
    return cachedStatus || { loaded: false, reason: '知识包未加载' };
}
/** 供测试/开发重载；生产包打包后不会变。 */
export function reloadKnowledgePack(dir) {
    return loadKnowledgePack(dir);
}
export function tokenizeForSearch(text) {
    return tokenize(text);
}
