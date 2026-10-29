import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 客户知识包：打包时固定，运行时只读。
 *
 * 目录约定：
 *   knowledge/manifest.json
 *   knowledge/docs/*.md
 *   knowledge/queries/*.json
 *   knowledge/reports/*.md  （deprecated；报告结构请放 skills/<name>/SKILL.md）
 *
 * 核心不包含任何业务表/指标；业务知识完全来自这里。
 */

export interface KnowledgeRelationship {
  to: string;
  type?: string;
  on?: string;
}

export interface KnowledgeTable {
  comment?: string;
  aliases?: string[];
  columnAliases?: Record<string, string[]>;
  keyColumns?: string[];
  indexedColumns?: string[];
  relationships?: KnowledgeRelationship[];
  doc?: string;
  status?: 'ready' | 'needs_review' | 'missing';
  note?: string;
}

export interface KnowledgeManifest {
  name: string;
  version?: number | string;
  description?: string;
  appliesTo?: {
    database?: string[];
    schemas?: string[];
    server?: string[];
  };
  priorityTables?: string[];
  tables?: Record<string, KnowledgeTable>;
}

export interface SavedQuery {
  key: string;
  label?: string;
  description?: string;
  sql: string | { sqlserver?: string; kingbase?: string };
  params?: string[];
  tables?: string[];
  status?: 'ready' | 'needs_review' | 'missing';
  note?: string;
}

export interface KnowledgeSection {
  heading: string;
  content: string;
}

export interface KnowledgeDoc {
  path: string;
  title: string;
  headings: string[];
  kind: 'doc' | 'report';
  content: string;
  sections: KnowledgeSection[];
}

export interface KnowledgeHit {
  path: string;
  title: string;
  kind: 'doc' | 'report';
  heading?: string;
  snippet: string;
  score: number;
}

export interface KnowledgePack {
  dir: string;
  manifest: KnowledgeManifest;
  docs: KnowledgeDoc[];
  reports: KnowledgeDoc[];
  queries: SavedQuery[];
  indexText: string;
  search: (query: string, limit?: number) => KnowledgeHit[];
  read: (path: string, maxChars?: number, section?: string) => string | null;
  getQuery: (key: string) => SavedQuery | undefined;
}

export interface KnowledgeStatus {
  loaded: boolean;
  name?: string;
  reason?: string;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = resolve(currentDir, '..', 'knowledge');
const MAX_DOC_BYTES = 2 * 1024 * 1024;
const MAX_READ_CHARS = 8000;
const MAX_INDEX_DOCS = 20;

let cached: KnowledgePack | null | undefined;

function knowledgeDir(): string {
  return process.env.AGENT_KNOWLEDGE_DIR || DEFAULT_DIR;
}

function listFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, ext));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith(ext)) continue;
    try {
      if (statSync(full).size > MAX_DOC_BYTES) continue;
    } catch {
      continue;
    }
    out.push(full);
  }
  return out.sort();
}

function listRootMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    if (/^readme/i.test(entry.name)) continue;
    const full = join(dir, entry.name);
    try {
      if (statSync(full).size > MAX_DOC_BYTES) continue;
    } catch {
      continue;
    }
    out.push(full);
  }
  return out.sort();
}

function titleOf(content: string, fallback: string): string {
  const line = content
    .split(/\r?\n/)
    .map(item => item.trim())
    .find(item => /^#{1,3}\s+/.test(item));
  return line ? line.replace(/^#{1,3}\s+/, '').trim() : fallback;
}

function headingsOf(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(item => /^#{1,3}\s+/.test(item))
    .map(item => item.replace(/^#{1,3}\s+/, '').trim())
    .filter(Boolean);
}

function sectionsOf(content: string): KnowledgeSection[] {
  const lines = content.split(/\r?\n/);
  const sections: KnowledgeSection[] = [];
  let heading = '';
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (heading || text) sections.push({ heading: heading || '正文', content: text });
    buffer = [];
  };
  for (const line of lines) {
    const match = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (match) {
      flush();
      heading = match[2].trim();
      buffer.push(line);
      continue;
    }
    buffer.push(line);
  }
  flush();
  return sections.filter(section => section.content.length > 0);
}

function readDoc(packDir: string, full: string, kind: 'doc' | 'report'): KnowledgeDoc | null {
  let content: string;
  try {
    content = readFileSync(full, 'utf8');
  } catch {
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
    sections: sectionsOf(content),
  };
}

function loadQueries(packDir: string): SavedQuery[] {
  const dir = join(packDir, 'queries');
  const out: SavedQuery[] = [];
  for (const file of listFiles(dir, '.json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { queries?: unknown }).queries)
        ? ((parsed as { queries: unknown[] }).queries)
        : [parsed];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const raw = item as Record<string, unknown>;
      if (typeof raw.key !== 'string' || !raw.key.trim()) continue;
      const sql = raw.sql;
      if (
        typeof sql !== 'string' &&
        !(sql && typeof sql === 'object' && !Array.isArray(sql))
      ) {
        continue;
      }
      out.push({
        key: raw.key.trim(),
        label: typeof raw.label === 'string' ? raw.label : undefined,
        description: typeof raw.description === 'string' ? raw.description : undefined,
        sql: sql as SavedQuery['sql'],
        params: Array.isArray(raw.params)
          ? raw.params.map(value => String(value)).filter(Boolean)
          : undefined,
        tables: Array.isArray(raw.tables)
          ? raw.tables.map(value => String(value)).filter(Boolean)
          : undefined,
        status:
          raw.status === 'needs_review' || raw.status === 'missing' || raw.status === 'ready'
            ? raw.status
            : 'ready',
        note: typeof raw.note === 'string' ? raw.note : undefined,
      });
    }
  }
  return out;
}

function tokenize(text: string): string[] {
  const lower = ` ${String(text || '').toLowerCase()} `;
  const tokens = new Set<string>();
  for (const word of lower.match(/[a-z0-9_]+/g) || []) {
    if (word.length >= 2) tokens.add(word);
  }
  for (const run of lower.match(/[\u3400-\u9fff]+/g) || []) {
    if (run.length === 1) tokens.add(run);
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
    if (run.length >= 3) tokens.add(run);
  }
  return Array.from(tokens);
}

function snippetOf(content: string, terms: string[]): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  const lower = flat.toLowerCase();
  let index = -1;
  for (const term of terms) {
    const hit = lower.indexOf(term.toLowerCase());
    if (hit >= 0 && (index < 0 || hit < index)) index = hit;
  }
  const start = Math.max(0, index < 0 ? 0 : index - 60);
  return flat.slice(start, start + 260);
}

function buildIndexText(manifest: KnowledgeManifest, docs: KnowledgeDoc[], reports: KnowledgeDoc[], queries: SavedQuery[]): string {
  const lines = [`【知识包】${manifest.name}${manifest.description ? `：${manifest.description}` : ''}`];
  const rank = (path: string): number =>
    /tables\//.test(path) ? 0 : /metrics\//.test(path) ? 1 : /enums\//.test(path) ? 2 : 3;
  const docList = [...docs, ...reports].sort(
    (a, b) => rank(a.path) - rank(b.path) || a.title.localeCompare(b.title),
  );
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

function safeReadPath(packDir: string, requested: string): string | null {
  if (!requested || typeof requested !== 'string') return null;
  const clean = requested.trim().replace(/^\/+/, '');
  if (isAbsolute(clean)) return null;
  const full = normalize(join(packDir, clean));
  const rel = relative(packDir, full);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return full;
}

function buildPack(packDir: string): { pack: KnowledgePack | null; status: KnowledgeStatus } {
  const manifestFile = join(packDir, 'manifest.json');
  const hasManifest = existsSync(manifestFile);
  let manifest: KnowledgeManifest;
  if (hasManifest) {
    try {
      manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as KnowledgeManifest;
    } catch {
      return { pack: null, status: { loaded: false, reason: 'manifest.json 不是合法 JSON' } };
    }
    if (!manifest || typeof manifest.name !== 'string') {
      return { pack: null, status: { loaded: false, reason: 'manifest.name 缺失' } };
    }
  } else {
    manifest = { name: 'manual', version: 1, description: '数据库说明书' };
  }

  const docFiles = Array.from(
    new Set([
      ...listFiles(join(packDir, 'docs'), '.md'),
      ...listFiles(join(packDir, 'manual'), '.md'),
      ...listRootMarkdown(packDir),
    ]),
  );
  const docs = docFiles
    .map(file => readDoc(packDir, file, 'doc'))
    .filter((doc): doc is KnowledgeDoc => Boolean(doc));
  const reports = listFiles(join(packDir, 'reports'), '.md')
    .map(file => readDoc(packDir, file, 'report'))
    .filter((doc): doc is KnowledgeDoc => Boolean(doc));
  const queries = loadQueries(packDir);
  const hasMetadata =
    docs.length > 0 ||
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

  const search = (query: string, limit = 5): KnowledgeHit[] => {
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
    const hits: KnowledgeHit[] = [];
    for (const doc of [...docs, ...reports]) {
      const docTitle = doc.title.toLowerCase();
      const sections = doc.sections.length
        ? doc.sections
        : [{ heading: '', content: doc.content }];
      for (const section of sections) {
        const heading = String(section.heading || '').toLowerCase();
        const body = section.content.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (docTitle.includes(term)) score += 4;
          else if (heading.includes(term)) score += 3;
          else if (body.includes(term)) score += 1;
        }
        if (!score) continue;
        hits.push({
          path: doc.path,
          title: doc.title,
          kind: doc.kind,
          heading: section.heading && section.heading !== '正文' ? section.heading : undefined,
          snippet: snippetOf(section.content, terms),
          score,
        });
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  };

  const read = (
    requested: string,
    maxChars = MAX_READ_CHARS,
    sectionName?: string,
  ): string | null => {
    const rawRequested = String(requested || '');
    const hashIndex = rawRequested.indexOf('#');
    const requestedPath = hashIndex >= 0 ? rawRequested.slice(0, hashIndex) : rawRequested;
    const full = safeReadPath(packDir, requestedPath);
    if (!full || !existsSync(full)) return null;
    try {
      const content = readFileSync(full, 'utf8');
      const inlineSection = hashIndex >= 0 ? rawRequested.slice(hashIndex + 1) : '';
      const wanted = String(sectionName || inlineSection || '').trim().toLowerCase();
      if (wanted) {
        const doc = [...docs, ...reports].find(
          item => item.path.toLowerCase() === requestedPath.replace(/\\/g, '/').toLowerCase(),
        );
        const section = doc?.sections.find(item => {
          const heading = item.heading.toLowerCase();
          return heading === wanted || heading.includes(wanted);
        });
        if (section) {
          return `## ${section.heading}\n${section.content}`.slice(0, maxChars);
        }
      }
      return content.slice(0, maxChars);
    } catch {
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

let cachedStatus: KnowledgeStatus | undefined;

function ensureLoaded(dir?: string): void {
  if (cached !== undefined) return;
  const result = buildPack(dir || knowledgeDir());
  cached = result.pack;
  cachedStatus = result.status;
}

export function loadKnowledgePack(dir?: string): KnowledgePack | null {
  const result = buildPack(dir || knowledgeDir());
  cached = result.pack;
  cachedStatus = result.status;
  return cached;
}

export function getKnowledgePack(): KnowledgePack | null {
  ensureLoaded();
  return cached || null;
}

export function getKnowledgeStatus(): KnowledgeStatus {
  ensureLoaded();
  return cachedStatus || { loaded: false, reason: '知识包未加载' };
}

/** 供测试/开发重载；生产包打包后不会变。 */
export function reloadKnowledgePack(dir?: string): KnowledgePack | null {
  return loadKnowledgePack(dir);
}

export function tokenizeForSearch(text: string): string[] {
  return tokenize(text);
}
