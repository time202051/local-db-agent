import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import type { KingbaseDbRuntime } from '../config.js';
import { assertReadOnly } from '../sql-guard.js';
import { isHiddenTable as isHidden, parseTableName } from './identifiers.js';
import type {
  ColumnInfo,
  ListTablesOptions,
  PingResult,
  QueryResult,
  SchemaColumn,
  SchemaKeyRow,
  SchemaResult,
  TableBrief,
  TableSchemaResult,
} from './types.js';

interface PoolEntry {
  promise: Promise<Pool>;
  lastUsed: number;
}

// 连接池按"连接信息"缓存：不同请求可能指向不同的库（前端下发）
const pools = new Map<string, PoolEntry>();
const POOL_TTL_MS = 30 * 60 * 1000;
const MAX_POOLS = 8;

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function qualifiedName(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

function poolKey(db: KingbaseDbRuntime): string {
  const passwordHash = createHash('sha1').update(db.password).digest('hex').slice(0, 12);
  return `${db.host}:${db.port}/${db.database}/${db.user}/${passwordHash}`;
}

function closeEntry(entry: PoolEntry): void {
  entry.promise
    .then((pool) => pool.end())
    .catch(() => {
      /* ignore */
    });
}

function evictStale(): void {
  const now = Date.now();
  for (const [key, entry] of pools) {
    if (now - entry.lastUsed > POOL_TTL_MS) {
      pools.delete(key);
      closeEntry(entry);
    }
  }
}

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldest = Infinity;
  for (const [key, entry] of pools) {
    if (entry.lastUsed < oldest) {
      oldest = entry.lastUsed;
      oldestKey = key;
    }
  }
  if (oldestKey !== null) {
    const entry = pools.get(oldestKey);
    pools.delete(oldestKey);
    if (entry) closeEntry(entry);
  }
}

function serverOptions(db: KingbaseDbRuntime): string {
  const schemas = (db.schemas.length ? db.schemas : ['public'])
    .map((schema) => quoteIdent(schema))
    .join(',');
  return [
    '-c default_transaction_read_only=on',
    `-c statement_timeout=${db.requestTimeoutMs}`,
    '-c lock_timeout=5000',
    '-c idle_in_transaction_session_timeout=60000',
    '-c client_encoding=UTF8',
    `-c search_path=${schemas}`,
    '-c application_name=agent-local',
  ].join(' ');
}

async function createPool(db: KingbaseDbRuntime): Promise<Pool> {
  const pool = new Pool({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    max: 3,
    idleTimeoutMillis: 5 * 60 * 1000,
    connectionTimeoutMillis: 12000,
    keepAlive: true,
    options: serverOptions(db),
  });

  const check = await pool.query(
    "SELECT current_setting('default_transaction_read_only') AS ro, " +
      "current_setting('transaction_read_only') AS tro, " +
      "current_database() AS db, current_setting('server_version') AS version",
  );
  const ro = String(check.rows[0]?.ro ?? '');
  if (ro !== 'on') {
    await pool.end().catch(() => {});
    throw new Error('金仓只读会话未生效（default_transaction_read_only != on），已拒绝服务');
  }

  pool.on('error', (err: Error) => {
    console.error('[db:kingbase] pool error:', err.message);
  });
  return pool;
}

async function getPool(db: KingbaseDbRuntime): Promise<Pool> {
  const key = poolKey(db);
  evictStale();

  let entry = pools.get(key);
  if (!entry) {
    const promise = createPool(db).catch((err: Error) => {
      // 失败后清空缓存，避免后续永远复用失败的 Promise
      pools.delete(key);
      throw err;
    });
    entry = { promise, lastUsed: Date.now() };
    pools.set(key, entry);
    if (pools.size > MAX_POOLS) evictOldest();
  }
  entry.lastUsed = Date.now();
  return entry.promise;
}

function oneLine(sqlText: string): string {
  return sqlText.replace(/\s+/g, ' ').slice(0, 200);
}

function friendlyError(message: string): string {
  if (/read-only transaction|cannot execute .* in a read-only transaction/i.test(message)) {
    return '只读模式已阻止写操作。当前 agent 只允许查询数据。';
  }
  if (/relation .* does not exist/i.test(message)) {
    return '表名不存在。金仓表名区分大小写，请使用双引号，例如 public."WMS_Stocks"。';
  }
  if (/column .* does not exist/i.test(message)) {
    return '字段不存在。请先调用 get_table_schema 查看真实字段名，并注意双引号。';
  }
  if (/statement timeout|canceling statement due to statement timeout/i.test(message)) {
    return '查询超时。请缩小时间范围，或先做 GROUP BY / LIMIT 聚合。';
  }
  if (/syntax error.*\btop\b|at or near "top"/i.test(message)) {
    return '金仓不支持 TOP，请改用 LIMIT。';
  }
  if (/function .* does not exist/i.test(message)) {
    return '函数不存在。金仓是 PostgreSQL 语法，日期函数请用 now()/date_trunc/to_char。';
  }
  return message;
}

/** 读取目标库的表清单（只展示 db.schemas 指定 schema 下的业务表）。 */
export async function getSchema(
  db: KingbaseDbRuntime,
  options: ListTablesOptions = {},
): Promise<SchemaResult> {
  const pool = await getPool(db);
  const schemas = db.schemas.length ? db.schemas : ['public'];
  const keyword = (options.keyword ?? '').trim().toLowerCase();

  const dbNameResult = await pool.query('SELECT current_database() AS db');
  const database = String(dbNameResult.rows[0]?.db ?? '');

  const result = await pool.query(
    `SELECT t.table_schema,
            t.table_name,
            COUNT(c.column_name)::int AS column_count,
            MAX(GREATEST(pc.reltuples, 0))::bigint AS row_count,
            obj_description(pc.oid) AS comment
     FROM information_schema.tables t
     LEFT JOIN information_schema.columns c
       ON c.table_schema = t.table_schema AND c.table_name = t.table_name
     LEFT JOIN pg_namespace n ON n.nspname = t.table_schema
     LEFT JOIN pg_class pc ON pc.relnamespace = n.oid AND pc.relname = t.table_name
     WHERE t.table_type = 'BASE TABLE' AND t.table_schema = ANY($1::text[])
     GROUP BY t.table_schema, t.table_name, pc.oid
     ORDER BY t.table_schema, t.table_name`,
    [schemas],
  );

  const all: TableBrief[] = [];
  const availableSchemas = new Set<string>();
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const schema = String(row.table_schema);
    const table = String(row.table_name);
    const comment = row.comment == null ? null : String(row.comment);
    availableSchemas.add(schema);
    if (isHidden(table, schema, db.hiddenTables)) continue;
    if (isHidden(table, schema, db.blockedTables)) continue;
    all.push({
      name: qualifiedName(schema, table),
      schema,
      columnCount: Number(row.column_count ?? 0),
      rowCount: Number(row.row_count ?? 0),
      comment,
    });
  }

  let tables = all;
  let hint: string | undefined;
  if (keyword) {
    const matched = all.filter((item) =>
      `${item.name} ${item.comment ?? ''}`.toLowerCase().includes(keyword),
    );
    if (matched.length) {
      tables = matched;
    } else if (all.length) {
      tables = all;
      hint =
        `keyword "${options.keyword}" 未匹配到表名或表注释，已返回全部 ${all.length} 张表；` +
        '请直接从列表里选表，不要再用其它 keyword 重试。';
    }
  }
  if (!all.length) {
    hint = `schema（${schemas.join(', ')}）下没有可访问的基础表，请检查 schemas 配置或账号权限。`;
  }

  return {
    database,
    tableCount: tables.length,
    tables,
    availableSchemas: Array.from(availableSchemas).sort(),
    totalTables: all.length,
    ...(hint ? { hint } : {}),
  };
}

export { parseTableName } from './identifiers.js';

/** 取单张表的字段（按需调用，避免一次性拉全库字段）。 */
export async function getTableSchema(
  db: KingbaseDbRuntime,
  tableName: string,
): Promise<TableSchemaResult> {
  const pool = await getPool(db);
  const schemas = db.schemas.length ? db.schemas : ['public'];
  const parsed = parseTableName(tableName, schemas[0] ?? 'public');
  if (!schemas.includes(parsed.schema)) {
    throw new Error(`表不在允许的 schema 中：${parsed.schema}（允许：${schemas.join(', ')}）`);
  }

  const dbNameResult = await pool.query('SELECT current_database() AS db');
  const database = String(dbNameResult.rows[0]?.db ?? '');

  const found = await pool.query(
    `SELECT c.relname AS table_name, obj_description(c.oid) AS comment
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND lower(c.relname) = lower($2) AND c.relkind IN ('r', 'p')
     ORDER BY c.relname
     LIMIT 1`,
    [parsed.schema, parsed.table],
  );
  if (!found.rows.length) {
    throw new Error(`表不存在：${parsed.schema}.${parsed.table}`);
  }
  const actualTable = String(found.rows[0].table_name);
  if (isHidden(actualTable, parsed.schema, db.blockedTables)) {
    throw new Error(`不允许查看表：${parsed.schema}.${actualTable}`);
  }
  const tableComment = found.rows[0].comment == null ? null : String(found.rows[0].comment);

  const result = await pool.query(
    `SELECT a.attname AS column_name,
            format_type(a.atttypid, a.atttypmod) AS data_type,
            (NOT a.attnotnull) AS nullable,
            col_description(a.attrelid, a.attnum) AS comment
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum`,
    [parsed.schema, actualTable],
  );

  const columns: ColumnInfo[] = (result.rows as Array<Record<string, unknown>>).map((row) => ({
    name: quoteIdent(String(row.column_name)),
    type: String(row.data_type),
    nullable: row.nullable === true,
    comment: row.comment == null ? null : String(row.comment),
  }));

  return {
    database,
    table: qualifiedName(parsed.schema, actualTable),
    comment: tableComment,
    columns,
  };
}

/** 一次性读取所有可见表的列清单，用于本地检索索引。 */
export async function getAllColumns(db: KingbaseDbRuntime): Promise<SchemaColumn[]> {
  const pool = await getPool(db);
  const schemas = db.schemas.length ? db.schemas : ['public'];
  const result = await pool.query(
    `SELECT n.nspname AS table_schema,
            c.relname AS table_name,
            a.attname AS column_name,
            format_type(a.atttypid, a.atttypmod) AS data_type,
            a.attnotnull AS not_null,
            a.attnum AS ordinal,
            col_description(c.oid, a.attnum) AS comment
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE c.relkind IN ('r', 'v')
       AND n.nspname = ANY($1::text[])
       AND a.attnum > 0
       AND NOT a.attisdropped
     ORDER BY n.nspname, c.relname, a.attnum`,
    [schemas],
  );
  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    schema: String(row.table_schema),
    table: String(row.table_name),
    name: String(row.column_name),
    type: String(row.data_type),
    nullable: !row.not_null,
    comment: row.comment == null ? null : String(row.comment),
    ordinal: Number(row.ordinal ?? 0),
  }));
}

/**
 * 一次性读取 schema 内所有表的主键/唯一约束/外键，用于本地 schema 关系图。
 * 任何失败都返回空数组（keys 是增强信息，缺失不阻塞主流程）。
 */
export async function getAllKeys(db: KingbaseDbRuntime): Promise<SchemaKeyRow[]> {
  const pool = await getPool(db);
  const schemas = db.schemas.length ? db.schemas : ['public'];
  try {
    const result = await pool.query(
      `SELECT n.nspname AS table_schema,
              c.relname AS table_name,
              a.attname AS column_name,
              (con.contype = 'p') AS is_primary,
              (con.contype = 'u') AS is_unique,
              rn.nspname AS ref_schema,
              rc.relname AS ref_table,
              ra.attname AS ref_column,
              k.ord AS key_ordinal,
              con.conname AS constraint_name
       FROM pg_constraint con
       JOIN pg_class c ON c.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
       LEFT JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS rk(attnum, ord) ON rk.ord = k.ord
       LEFT JOIN pg_class rc ON rc.oid = con.confrelid
       LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
       LEFT JOIN pg_attribute ra ON ra.attrelid = rc.oid AND ra.attnum = rk.attnum
       WHERE con.contype IN ('p', 'u', 'f')
         AND n.nspname = ANY($1::text[])
       ORDER BY n.nspname, c.relname, con.conname, k.ord`,
      [schemas],
    );
    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      schema: String(row.table_schema),
      table: String(row.table_name),
      column: String(row.column_name),
      primaryKey: row.is_primary === true,
      unique: row.is_unique === true,
      refSchema: row.ref_schema == null ? undefined : String(row.ref_schema),
      refTable: row.ref_table == null ? undefined : String(row.ref_table),
      refColumn: row.ref_column == null ? undefined : String(row.ref_column),
      ordinal: Number(row.key_ordinal ?? 0),
      constraint: row.constraint_name == null ? undefined : String(row.constraint_name),
    }));
  } catch (error) {
    console.error(
      `[db:kingbase] getAllKeys failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

export async function runQuery(db: KingbaseDbRuntime, sqlText: string): Promise<QueryResult> {
  const started = Date.now();
  try {
    const guardError = assertReadOnly(sqlText, 'kingbase', db.blockedTables);
    if (guardError) {
      return {
        success: false,
        error: guardError,
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
        elapsedMs: Date.now() - started,
      };
    }

    const pool = await getPool(db);
    // 用外层 LIMIT 限制返回行数：兼容 SELECT / WITH / UNION，不需要改原 SQL 语义。
    const wrapped = `SELECT * FROM (${sqlText}) AS _agent_q LIMIT ${db.maxRows + 1}`;
    const result = await pool.query(wrapped);

    const rows = result.rows as Array<Record<string, unknown>>;
    const truncated = rows.length > db.maxRows;
    const outputRows = truncated ? rows.slice(0, db.maxRows) : rows;
    const columns = (result.fields ?? []).map((field) => field.name);

    console.log(
      `[db:kingbase] ok rows=${outputRows.length}${truncated ? '+' : ''} elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)}`,
    );

    return {
      success: true,
      error: null,
      columns,
      rows: outputRows,
      rowCount: outputRows.length,
      truncated,
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = friendlyError(rawMessage);
    console.error(
      `[db:kingbase] fail elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)} err=${rawMessage}`,
    );
    return {
      success: false,
      error: message,
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      elapsedMs: Date.now() - started,
    };
  }
}

/** 轻量连接探测：建池、确认只读会话，并取库名/表数/版本（供 /config/check 用） */
export async function pingDatabase(db: KingbaseDbRuntime): Promise<PingResult> {
  const pool = await getPool(db);
  const schemas = db.schemas.length ? db.schemas : ['public'];
  const info = await pool.query(
    "SELECT current_database() AS db, current_setting('server_version') AS version, " +
      "current_setting('default_transaction_read_only') AS ro",
  );
  const database = String(info.rows[0]?.db ?? '');
  const version = String(info.rows[0]?.version ?? '');
  const readOnly = String(info.rows[0]?.ro ?? '') === 'on';
  if (!readOnly) {
    throw new Error('金仓只读会话未生效（default_transaction_read_only != on），已拒绝服务');
  }

  const count = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema = ANY($1::text[])`,
    [schemas],
  );
  const tableCount = Number(count.rows[0]?.c ?? 0);
  return { database, tableCount, version, readOnly };
}

export async function closeAllPools(): Promise<void> {
  const entries = [...pools.values()];
  pools.clear();
  await Promise.all(
    entries.map(async (entry) => {
      try {
        const pool = await entry.promise;
        await pool.end();
      } catch {
        /* ignore */
      }
    }),
  );
}
