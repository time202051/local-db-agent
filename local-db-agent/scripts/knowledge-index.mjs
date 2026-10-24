// Validate a customer knowledge pack and generate knowledge/.index.json.
// Run from the app directory: node scripts/knowledge-index.mjs
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const knowledgeDir = process.env.AGENT_KNOWLEDGE_DIR || join(appDir, 'knowledge');
const manifestFile = join(knowledgeDir, 'manifest.json');
const MAX_FILE = 512 * 1024;

function fail(message) {
  console.error(`[knowledge] ${message}`);
  process.exit(1);
}

function files(dir, ext) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...files(full, ext));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(ext)) out.push(full);
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

if (!existsSync(manifestFile)) {
  console.log('[knowledge] no manifest; running in generic mode');
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
} catch (error) {
  fail(`manifest.json 不是合法 JSON: ${error.message}`);
}
if (!manifest || typeof manifest.name !== 'string' || !manifest.name.trim()) {
  fail('manifest.name 必填');
}

const packRoot = resolve(knowledgeDir);
const describeDocs = (dir, kind) =>
  files(dir, '.md').map(file => {
    const size = statSync(file).size;
    if (size > MAX_FILE) fail(`${relative(packRoot, file)} 超过 ${MAX_FILE} 字节`);
    const full = resolve(file);
    const rel = relative(packRoot, full);
    if (rel.startsWith('..')) fail(`文档路径越界: ${rel}`);
    const content = readFileSync(full, 'utf8');
    return {
      path: rel.split('\\').join('/'),
      title: titleOf(content, rel),
      headings: headingsOf(content),
      kind,
      snippet: content.replace(/\s+/g, ' ').slice(0, 220),
    };
  });

const docs = describeDocs(join(knowledgeDir, 'docs'), 'doc');
const reports = describeDocs(join(knowledgeDir, 'reports'), 'report');
if (reports.length) {
  console.warn(
    '[knowledge] reports/ is deprecated; move report structure to skills/<name>/SKILL.md',
  );
}

const queries = [];
for (const file of files(join(knowledgeDir, 'queries'), '.json')) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${relative(packRoot, file)} 不是合法 JSON: ${error.message}`);
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray(parsed.queries)
      ? parsed.queries
      : [parsed];
  for (const item of list) {
    if (!item || typeof item !== 'object') fail(`${relative(packRoot, file)} 包含非法 query`);
    if (typeof item.key !== 'string' || !item.key.trim()) fail(`${relative(packRoot, file)} 缺少 query.key`);
    if (!item.sql || (typeof item.sql !== 'string' && typeof item.sql !== 'object')) {
      fail(`query ${item.key} 缺少 sql`);
    }
    queries.push({
      key: item.key.trim(),
      label: item.label || '',
      status: item.status || 'ready',
      params: Array.isArray(item.params) ? item.params : [],
      tables: Array.isArray(item.tables) ? item.tables : [],
    });
  }
}

const index = {
  name: manifest.name,
  version: manifest.version || 1,
  description: manifest.description || '',
  appliesTo: manifest.appliesTo || {},
  priorityTables: manifest.priorityTables || [],
  tables: Object.keys(manifest.tables || {}),
  docs,
  reports,
  queries,
  generatedAt: new Date().toISOString(),
};

const outFile = join(knowledgeDir, '.index.json');
writeFileSync(outFile, JSON.stringify(index, null, 2), 'utf8');
console.log(
  `[knowledge] ${manifest.name}: ${docs.length} docs, ${reports.length} reports, ${queries.length} queries`,
);
