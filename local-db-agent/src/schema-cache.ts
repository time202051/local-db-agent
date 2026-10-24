import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbRuntime } from './config.js';
import { getAllColumns, getAllKeys, getSchema, getTableSchema } from './db.js';
import type {
  ColumnInfo,
  ForeignKeyInfo,
  SchemaColumn,
  SchemaKeyRow,
  SchemaResult,
  TableBrief,
  TableSchemaResult,
} from './db.js';
import { getKnowledgePack, tokenizeForSearch } from './knowledge.js';
import type { KnowledgeTable } from './knowledge.js';
import { logLine } from './log.js';

/**
 * Schema 快照/缓存与相关表检索。
 *
 * 缓存是运行时本地数据，不随包分发；知识包是打包固定的业务说明。
 * 这里不写死任何业务表名。
 */

const currentDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(currentDir, '..', 'data', 'schema-cache');
const TTL_MS = 24 * 60 * 60 * 1000;

interface SchemaEntry {
  schema: SchemaResult;
  fetchedAt: number;
}

interface TableEntry {
  schema: TableSchemaResult;
  fetchedAt: number;
}

interface ColumnEntry {
  columns: SchemaColumn[];
  fetchedAt: number;
}

export interface ColumnIndex {
  database: string;
  byTable: Map<string, ColumnInfo[]>;
  totalTables: number;
  indexedTables: number;
  truncated: boolean;
}

const DATE_TYPE_RE = /date|timestamp/i;

/** 日期/时间类型判断（date/datetime/timestamp/timestamptz 等）。 */
export function isDateColumnType(type: string): boolean {
  return DATE_TYPE_RE.test(String(type || ''));
}

const schemaMemory = new Map<string, SchemaEntry>();
const tableMemory = new Map<string, TableEntry>();
const columnMemory = new Map<string, ColumnEntry>();
const MAX_INDEX_TABLES = 500;

function dataDir(): string {
  return process.env.AGENT_SCHEMA_CACHE_DIR || DEFAULT_DATA_DIR;
}

/** 不含密码的连接标识：密码变化不应让 Schema 缓存失效。 */
function dbKey(db: DbRuntime): string {
  let identity: string;
  if (db.type === 'kingbase') {
    identity = `kingbase|${db.host}:${db.port}|${db.database}|${db.user}`;
  } else {
    const server = /Server=([^;]+)/i.exec(db.connectionString)?.[1] || '';
    const database = /Database=([^;]+)/i.exec(db.connectionString)?.[1] || '';
    const user = /(?:Uid|User Id)=([^;]+)/i.exec(db.connectionString)?.[1] || '';
    identity = `sqlserver|${server}|${database}|${user}`;
  }
  return createHash('sha1')
    .update(
      `${identity}|${(db.schemas || []).join(',')}|${(db.hiddenTables || []).join(',')}|${(db.blockedTables || []).join(',')}`,
    )
    .digest('hex');
}

/** 不含密码的连接标识（密码变化不应让 Schema 缓存失效）。 */
export function dbCacheKey(db: DbRuntime): string {
  return dbKey(db);
}

function readJson<T>(file: string): T | null {
  if (process.env.VITEST) return null;
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, value: unknown): void {
  if (process.env.VITEST) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(value), 'utf8');
  } catch {
    /* 缓存失败不影响主流程 */
  }
}

function fresh<T extends { fetchedAt: number }>(entry: T | null | undefined): entry is T {
  return Boolean(entry && Date.now() - entry.fetchedAt < TTL_MS);
}

export async function getSchemaCached(db: DbRuntime): Promise<SchemaResult> {
  const key = dbKey(db);
  const memory = schemaMemory.get(key);
  if (fresh(memory)) return memory.schema;

  const file = join(dataDir(), `${key}.json`);
  const disk = readJson<SchemaEntry>(file);
  if (fresh(disk)) {
    schemaMemory.set(key, disk);
    return disk.schema;
  }

  const schema = await getSchema(db);
  const entry = { schema, fetchedAt: Date.now() };
  schemaMemory.set(key, entry);
  writeJson(file, entry);
  return schema;
}

function buildColumnIndex(
  database: string,
  schema: SchemaResult,
  columns: SchemaColumn[],
): ColumnIndex {
  const priority = new Set(getKnowledgePack()?.manifest.priorityTables || []);
  const selected = [...schema.tables]
    .sort((a, b) => {
      const aName = tableName(a);
      const bName = tableName(b);
      const aPriority =
        priority.has(aName) ||
        priority.has(a.name) ||
        priority.has(bareTableName(aName)) ||
        priority.has(bareTableName(a.name))
          ? 1
          : 0;
      const bPriority =
        priority.has(bName) ||
        priority.has(b.name) ||
        priority.has(bareTableName(bName)) ||
        priority.has(bareTableName(b.name))
          ? 1
          : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return Number(b.rowCount || 0) - Number(a.rowCount || 0);
    })
    .slice(0, MAX_INDEX_TABLES);
  const wanted = new Set<string>();
  for (const item of selected) {
    wanted.add(normalizeTableKey(tableName(item)));
    wanted.add(normalizeTableKey(item.name));
    if (item.schema) wanted.add(normalizeTableKey(`${item.schema}.${item.name}`));
  }
  const byTable = new Map<string, ColumnInfo[]>();
  for (const column of columns) {
    const qualifiedKey = normalizeTableKey(`${column.schema}.${column.table}`);
    const bareKey = normalizeTableKey(column.table);
    if (!wanted.has(qualifiedKey) && !wanted.has(bareKey)) continue;
    const list = byTable.get(qualifiedKey) || [];
    list.push({
      name: column.name,
      type: column.type,
      nullable: column.nullable,
      comment: column.comment,
      ...(column.primaryKey ? { primaryKey: true } : {}),
      ...(column.unique ? { unique: true } : {}),
      ...(column.references?.length ? { references: column.references } : {}),
    });
    byTable.set(qualifiedKey, list);
    // 无 schema 的表名也放一份，方便 get_table_schema 直接命中
    if (!byTable.has(bareKey)) byTable.set(bareKey, list);
  }
  return {
    database,
    byTable,
    totalTables: schema.tables.length,
    indexedTables: selected.length,
    truncated: schema.tables.length > selected.length,
  };
}

/** 把 keys 查询结果合并进列清单：主键/唯一/外键引用。 */
function mergeKeyInfo(columns: SchemaColumn[], keys: SchemaKeyRow[]): SchemaColumn[] {
  if (!keys.length) return columns;
  const keysByTable = new Map<string, SchemaKeyRow[]>();
  for (const key of keys) {
    const tableKey = normalizeTableKey(`${key.schema}.${key.table}`);
    const list = keysByTable.get(tableKey) || [];
    list.push(key);
    keysByTable.set(tableKey, list);
  }
  return columns.map((column) => {
    const tableKeys = keysByTable.get(normalizeTableKey(`${column.schema}.${column.table}`));
    if (!tableKeys?.length) return column;
    const colKey = normalizeTableKey(column.name);
    const matched = tableKeys.filter((key) => normalizeTableKey(key.column) === colKey);
    if (!matched.length) return column;
    const primaryKey = matched.some((key) => key.primaryKey);
    const unique = matched.some((key) => key.unique);
    const references = matched
      .filter((key) => key.refTable)
      .map((key) => ({
        schema: key.refSchema,
        table: key.refTable as string,
        column: key.refColumn as string,
      }));
    if (!primaryKey && !unique && !references.length) return column;
    return {
      ...column,
      ...(primaryKey ? { primaryKey: true } : {}),
      ...(unique ? { unique: true } : {}),
      ...(references.length ? { references } : {}),
    };
  });
}

export interface TableKeyMeta {
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
  dateColumns: string[];
}

/** 从列清单推导表级元数据：主键列 / 外键分组 / 日期列。 */
export function deriveTableMeta(columns: ColumnInfo[]): TableKeyMeta {
  const primaryKey = columns
    .filter((column) => column.primaryKey)
    .map((column) => column.name)
    .slice(0, 8);
  const dateColumns = columns
    .filter((column) => isDateColumnType(column.type))
    .map((column) => column.name)
    .slice(0, 4);

  const fkGroups = new Map<string, ForeignKeyInfo>();
  for (const column of columns) {
    for (const ref of column.references || []) {
      const key = normalizeTableKey(ref.table);
      const group = fkGroups.get(key);
      if (group) {
        group.columns.push(column.name);
        group.refColumns.push(ref.column);
      } else {
        fkGroups.set(key, {
          columns: [column.name],
          refSchema: ref.schema,
          refTable: ref.table,
          refColumns: [ref.column],
        });
      }
    }
  }

  return { primaryKey, foreignKeys: Array.from(fkGroups.values()), dateColumns };
}

/** 把 key 元数据挂到 TableSchemaResult（非空才带，节省输出字符）。 */
function withTableMeta(
  result: Omit<TableSchemaResult, 'columns'> & { columns?: ColumnInfo[] },
  columns: ColumnInfo[],
): TableSchemaResult {
  const meta = deriveTableMeta(columns);
  return {
    ...result,
    columns,
    ...(meta.primaryKey.length ? { primaryKey: meta.primaryKey } : {}),
    ...(meta.foreignKeys.length ? { foreignKeys: meta.foreignKeys } : {}),
    ...(meta.dateColumns.length ? { dateColumns: meta.dateColumns } : {}),
  };
}

export async function getColumnIndexCached(db: DbRuntime): Promise<ColumnIndex> {
  const key = dbKey(db);
  const memory = columnMemory.get(key);
  if (fresh(memory)) {
    const schema = await getSchemaCached(db);
    return buildColumnIndex(schema.database, schema, memory.columns);
  }

  const file = join(dataDir(), `${key}.columns.v3.json`);
  const disk = readJson<ColumnEntry>(file);
  if (fresh(disk)) {
    columnMemory.set(key, disk);
    const schema = await getSchemaCached(db);
    return buildColumnIndex(schema.database, schema, disk.columns);
  }

  const schema = await getSchemaCached(db);
  let columns: SchemaColumn[] = [];
  try {
    // getAllKeys 内部失败会返回空数组，不阻塞列索引
    const [cols, keys] = await Promise.all([getAllColumns(db), getAllKeys(db)]);
    columns = mergeKeyInfo(cols, keys);
  } catch (error) {
    logLine(`column index failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      database: schema.database,
      byTable: new Map(),
      totalTables: schema.tables.length,
      indexedTables: 0,
      truncated: false,
    };
  }
  const index = buildColumnIndex(schema.database, schema, columns);
  // 只缓存进入索引的表列，避免超大库把整库列清单写到本地
  const filtered = columns.filter(column => {
    const qualified = normalizeTableKey(`${column.schema}.${column.table}`);
    const bare = normalizeTableKey(column.table);
    return index.byTable.has(qualified) || index.byTable.has(bare);
  });
  const entry = { columns: filtered, fetchedAt: Date.now() };
  columnMemory.set(key, entry);
  writeJson(file, entry);
  logLine(
    `column index tables=${index.indexedTables}/${index.totalTables} truncated=${index.truncated} columns=${filtered.length}`,
  );
  return index;
}

export async function getTableSchemaCached(
  db: DbRuntime,
  table: string,
): Promise<TableSchemaResult> {
  const key = dbKey(db);
  const tableHash = createHash('sha1').update(table.trim().toLowerCase()).digest('hex');
  const memoryKey = `${key}:${tableHash}`;
  const memory = tableMemory.get(memoryKey);
  if (fresh(memory)) return memory.schema;

  // 优先从全库列索引取；没有命中再回退单表查询
  const columnIndex = await getColumnIndexCached(db).catch(() => null);
  const columns =
    columnIndex?.byTable.get(normalizeTableKey(table)) ||
    columnIndex?.byTable.get(normalizeTableKey(table.split('.').pop() || ''));
  if (columns?.length) {
    return withTableMeta(
      {
        database: columnIndex?.database || '',
        table,
      },
      columns,
    );
  }

  const file = join(dataDir(), key, 'tables.v2', `${tableHash}.json`);
  const disk = readJson<TableEntry>(file);
  if (fresh(disk)) {
    tableMemory.set(memoryKey, disk);
    return withTableMeta(disk.schema, disk.schema.columns);
  }

  const schema = await getTableSchema(db, table);
  const entry = { schema, fetchedAt: Date.now() };
  tableMemory.set(memoryKey, entry);
  writeJson(file, entry);
  return withTableMeta(schema, schema.columns);
}

export function clearSchemaCache(): void {
  schemaMemory.clear();
  tableMemory.clear();
  columnMemory.clear();
}

function rowBucket(rowCount?: number): string {
  const n = Number(rowCount || 0);
  if (n <= 0) return '行数未知';
  if (n < 10000) return '约千级';
  if (n < 100000) return '约万级';
  if (n < 1000000) return '约十万级';
  if (n < 10000000) return '约百万级';
  return '约千万级';
}

export interface TableCandidate {
  table: string;
  comment?: string;
  rows?: string;
  keyColumns?: string[];
  dateColumns?: string[];
  matchedColumns?: string[];
  related?: string[];
  doc?: string;
  score?: number;
}

function tableName(item: TableBrief): string {
  if (!item.schema) return item.name;
  // 金仓的 name 已经是 public."Table"，不能再拼一次 schema
  if (item.name.includes('.') || item.name.startsWith('"')) return item.name;
  return `${item.schema}.${item.name}`;
}

/** 列索引 key 归一化：去掉引号/方括号/空格并转小写。 */
function normalizeTableKey(value: string): string {
  return String(value || '')
    .replace(/["'`[\]]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 去掉 schema 和引号，用于匹配知识包里的未限定表名。 */
function bareTableName(value: string): string {
  const last =
    String(value || '')
      .split('.')
      .pop() || String(value || '');
  return last.replace(/^["'`[]+|["'`\]]+$/g, '');
}

function knowledgeEntry(name: string, table: string): KnowledgeTable | undefined {
  const pack = getKnowledgePack();
  const tables = pack?.manifest.tables;
  if (!tables) return undefined;
  return (
    tables[name] || tables[table] || tables[bareTableName(name)] || tables[bareTableName(table)]
  );
}

export async function retrieveTables(
  db: DbRuntime,
  question: string,
  limit = 8,
): Promise<TableCandidate[]> {
  const schema = await getSchemaCached(db);
  const columnIndex = await getColumnIndexCached(db).catch(() => null);
  const pack = getKnowledgePack();
  const priority = new Set(pack?.manifest.priorityTables || []);
  const tokens = tokenizeForSearch(question);

  const scored: Array<TableCandidate & { score: number; qualified: string }> = [];
  for (const item of schema.tables) {
    const qualified = tableName(item);
    const info = knowledgeEntry(qualified, item.name);
    const aliases = info?.aliases || [];
    const columns =
      columnIndex?.byTable.get(normalizeTableKey(qualified)) ||
      columnIndex?.byTable.get(normalizeTableKey(item.name)) ||
      [];
    // 知识包优先；没有知识包时用 PK + 日期列兜底（通用 schema 关系图）
    const pkColumns = columns.filter((column) => column.primaryKey).map((column) => column.name);
    const dateColumns = columns
      .filter((column) => isDateColumnType(column.type))
      .map((column) => column.name)
      .slice(0, 2);
    const keyColumns = info?.keyColumns?.length
      ? info.keyColumns
      : [...pkColumns, ...dateColumns].slice(0, 4);
    // 关联表：知识包关系 + 真实外键目标（去重）
    const fkRelated = columns.flatMap((column) =>
      (column.references || []).map((ref) => ref.table),
    );
    const related = Array.from(
      new Set([...(info?.relationships?.map((rel) => rel.to).filter(Boolean) || []), ...fkRelated]),
    ).slice(0, 4);
    const haystack =
      `${qualified} ${item.comment || ''} ${aliases.join(' ')} ${keyColumns.join(' ')}`.toLowerCase();
    const matchedColumns = new Set<string>();
    let score = 0;

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (qualified.toLowerCase() === lower) score += 12;
      else if (qualified.toLowerCase().includes(lower)) score += 5;
      if (aliases.some((alias) => alias.toLowerCase() === lower)) score += 7;
      else if (aliases.some((alias) => alias.toLowerCase().includes(lower))) score += 3;
      if ((item.comment || '').toLowerCase().includes(lower)) score += 2;
      if (keyColumns.some((column) => column.toLowerCase() === lower)) score += 2;
      else if (keyColumns.some((column) => column.toLowerCase().includes(lower))) score += 1;
      for (const column of columns) {
        const columnName = column.name.toLowerCase();
        const columnComment = (column.comment || '').toLowerCase();
        if (columnName === lower) {
          score += 4;
          matchedColumns.add(column.name);
        } else if (columnName.includes(lower)) {
          score += 2;
          matchedColumns.add(column.name);
        } else if (columnComment.includes(lower)) {
          score += 1;
          matchedColumns.add(column.name);
        }
      }
      if (haystack.includes(lower) && score === 0) score += 1;
    }

    // 有关键词但完全没命中时，不靠 priorityTables 硬塞表；避免无关问题拿到错误候选。
    if (tokens.length && score === 0) continue;
    if (
      priority.has(qualified) ||
      priority.has(item.name) ||
      priority.has(bareTableName(qualified)) ||
      priority.has(bareTableName(item.name))
    ) {
      score += 6;
    }
    if (score <= 0) continue;
    scored.push({
      table: qualified,
      qualified,
      comment: info?.comment || item.comment || undefined,
      rows: rowBucket(item.rowCount),
      keyColumns: keyColumns.length ? keyColumns : undefined,
      dateColumns: dateColumns.length ? dateColumns : undefined,
      matchedColumns: matchedColumns.size ? Array.from(matchedColumns).slice(0, 5) : undefined,
      related: related.length ? related : undefined,
      doc: info?.doc,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, limit);
  const selected = new Set(picked.map((item) => item.qualified));

  // 关系扩展：最多补 2 张直接关联表
  for (const item of [...picked]) {
    for (const related of item.related || []) {
      if (picked.length >= limit + 2) break;
      if (selected.has(related)) continue;
      const relatedKey = normalizeTableKey(related);
      const match = schema.tables.find(
        (table) =>
          normalizeTableKey(table.name) === relatedKey ||
          normalizeTableKey(tableName(table)) === relatedKey,
      );
      if (!match) continue;
      const qualified = tableName(match);
      if (selected.has(qualified)) continue;
      const info = knowledgeEntry(qualified, match.name);
      selected.add(qualified);
      picked.push({
        table: qualified,
        qualified,
        comment: info?.comment || match.comment || undefined,
        rows: rowBucket(match.rowCount),
        keyColumns: info?.keyColumns,
        related: info?.relationships?.map((rel) => rel.to).filter(Boolean),
        doc: info?.doc,
        score: 0,
      });
    }
  }

  return picked.map(({ qualified: _qualified, ...rest }) => rest);
}

export function formatTableCandidates(candidates: TableCandidate[]): string {
  if (!candidates.length) return '';
  const lines = ['【相关表（系统检索，优先使用；不够再 search_tables）】'];
  for (const item of candidates) {
    const parts = [item.table];
    const meta: string[] = [];
    if (item.comment) meta.push(item.comment);
    if (item.rows) meta.push(item.rows);
    if (item.keyColumns?.length) meta.push(`关键字段：${item.keyColumns.join(', ')}`);
    if (item.dateColumns?.length) meta.push(`时间字段：${item.dateColumns.join(', ')}`);
    if (item.matchedColumns?.length) meta.push(`命中字段：${item.matchedColumns.join(', ')}`);
    if (item.related?.length) meta.push(`关联：${item.related.join(', ')}`);
    if (item.doc) meta.push(`文档：${item.doc}`);
    lines.push(`- ${parts.join('')}${meta.length ? `（${meta.join('；')}）` : ''}`);
  }
  return lines.join('\n').slice(0, 4000);
}
