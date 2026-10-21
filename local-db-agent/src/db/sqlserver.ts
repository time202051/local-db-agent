import type { ConnectionPool } from 'mssql';
import type { SqlServerDbRuntime } from '../config.js';
import { assertReadOnly, normalizeUnicodeLiterals } from '../sql-guard.js';
import { isHiddenTable, parseTableName } from './identifiers.js';
import type {
  ColumnInfo,
  ListTablesOptions,
  PingResult,
  QueryResult,
  SchemaResult,
  TableBrief,
  TableSchemaResult,
} from './types.js';

type MssqlModule = typeof import('mssql');

let mssqlPromise: Promise<MssqlModule> | null = null;

/**
 * 动态加载 msnodesqlv8：只连 Kingbase 的机器即使没有安装 ODBC 驱动，
 * 也不会因为启动时的静态 import 失败。
 */
async function loadMssql(): Promise<MssqlModule> {
  if (!mssqlPromise) {
    mssqlPromise = import('mssql/msnodesqlv8.js').then((mod) => {
      const wrapped = mod as unknown as { default?: MssqlModule };
      return (wrapped.default ?? (mod as unknown as MssqlModule)) as MssqlModule;
    });
  }
  return mssqlPromise;
}

interface PoolEntry {
  promise: Promise<ConnectionPool>;
  lastUsed: number;
}

// 连接池按"连接串"缓存：不同请求可能指向不同的库（前端下发）
const pools = new Map<string, PoolEntry>();
const POOL_TTL_MS = 30 * 60 * 1000;
const MAX_POOLS = 8;

function closeEntry(entry: PoolEntry): void {
  entry.promise
    .then((pool) => pool.close())
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

async function getPool(db: SqlServerDbRuntime): Promise<ConnectionPool> {
  const key = db.connectionString;
  evictStale();

  let entry = pools.get(key);
  if (!entry) {
    const sql = await loadMssql();
    // 注意：必须用 new ConnectionPool(...)，不能用 sql.connect(...)——
    // 后者会复用已有的全局连接并忽略新传入的配置（多库场景会张冠李戴）。
    const pool = new sql.ConnectionPool({
      connectionString: key,
      requestTimeout: db.requestTimeoutMs,
    } as never);
    const promise = pool
      .connect()
      .then(() => {
        // 连接池出错时记录，避免未处理异常导致进程退出
        pool.on('error', (err: Error) => {
          console.error('[db:sqlserver] pool error:', err.message);
        });
        return pool;
      })
      .catch((err: Error) => {
        // 关键：失败后清空缓存，否则后续永远复用这个失败的 Promise
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

/** 读取目标库的表清单（受限账号只会返回它有权访问的表）。 */
export async function getSchema(
  db: SqlServerDbRuntime,
  options: ListTablesOptions = {},
): Promise<SchemaResult> {
  const pool = await getPool(db);

  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS DbName');
  const database = String(dbNameResult.recordset?.[0]?.DbName ?? '');

  const keyword = (options.keyword ?? '').trim().toLowerCase();
  const result = await pool.request().query(
    `SELECT t.TABLE_SCHEMA AS TableSchema,
            t.TABLE_NAME   AS TableName,
            COUNT(c.COLUMN_NAME) AS ColumnCount
     FROM INFORMATION_SCHEMA.TABLES t
     LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
       ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
     WHERE t.TABLE_TYPE = 'BASE TABLE'
     GROUP BY t.TABLE_SCHEMA, t.TABLE_NAME
     ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME`,
  );

  const tables: TableBrief[] = [];
  for (const row of result.recordset as Array<Record<string, unknown>>) {
    const schema = String(row.TableSchema);
    const table = String(row.TableName);
    if (db.schemas.length && !db.schemas.includes(schema)) continue;
    if (isHiddenTable(table, schema, db.hiddenTables)) continue;
    if (isHiddenTable(table, schema, db.blockedTables)) continue;
    if (keyword && !`${schema}.${table}`.toLowerCase().includes(keyword)) continue;
    tables.push({ name: table, schema, columnCount: Number(row.ColumnCount ?? 0) });
  }

  return { database, tableCount: tables.length, tables };
}

/** 取单张表的字段（按需调用，避免一次性拉全库字段）。 */
export async function getTableSchema(
  db: SqlServerDbRuntime,
  tableName: string,
): Promise<TableSchemaResult> {
  const pool = await getPool(db);

  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS DbName');
  const database = String(dbNameResult.recordset?.[0]?.DbName ?? '');

  const parsed = parseTableName(tableName, db.schemas[0] ?? 'dbo');
  // 用户是否显式写了 schema（dbo.CORE_Stock / [dbo].[CORE_Stock]）
  const explicitSchema = /^\s*("[^"]+"|\[[^\]]+\]|[^.\s]+)\s*\./.test(tableName);
  if (isHiddenTable(parsed.table, parsed.schema, db.blockedTables)) {
    throw new Error(`不允许查看表：${parsed.schema}.${parsed.table}`);
  }

  const request = pool.request().input('tableName', parsed.table);
  let schemaFilter = '';
  if (explicitSchema) {
    request.input('schemaName', parsed.schema);
    schemaFilter = ' AND t.TABLE_SCHEMA = @schemaName';
  }

  const result = await request.query(
    `SELECT c.TABLE_SCHEMA AS TableSchema,
            c.COLUMN_NAME  AS ColumnName,
            c.DATA_TYPE    AS DataType,
            c.IS_NULLABLE  AS IsNullable
     FROM INFORMATION_SCHEMA.COLUMNS c
     JOIN INFORMATION_SCHEMA.TABLES t
       ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
     WHERE t.TABLE_TYPE = 'BASE TABLE' AND t.TABLE_NAME = @tableName${schemaFilter}
     ORDER BY c.TABLE_SCHEMA, c.ORDINAL_POSITION`,
  );

  const rows = result.recordset as Array<Record<string, unknown>>;
  if (!rows.length) throw new Error(`表不存在：${tableName}`);
  const actualSchema = String(rows[0].TableSchema);
  if (isHiddenTable(parsed.table, actualSchema, db.blockedTables)) {
    throw new Error(`不允许查看表：${actualSchema}.${parsed.table}`);
  }

  const columns: ColumnInfo[] = rows.map((row) => ({
    name: String(row.ColumnName),
    type: String(row.DataType),
    nullable: String(row.IsNullable).toUpperCase() === 'YES',
  }));

  return { database, table: `${actualSchema}.${parsed.table}`, columns };
}

export async function runQuery(db: SqlServerDbRuntime, sqlText: string): Promise<QueryResult> {
  const started = Date.now();
  try {
    const guardError = assertReadOnly(sqlText, 'sqlserver', db.blockedTables);
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

    // 服务端双重保护：
    //  - QUERY_GOVERNOR_COST_LIMIT：预估代价超阈值直接拒绝（防昂贵查询拖垮库）
    //  - ROWCOUNT：取够 N 行就停（防海量返回）
    const batch =
      `SET QUERY_GOVERNOR_COST_LIMIT ${db.costLimit};\n` +
      `SET ROWCOUNT ${db.maxRows};\n` +
      normalizeUnicodeLiterals(sqlText, 'sqlserver');
    const result = await pool.request().query(batch);

    const recordset = (result.recordset ?? []) as Array<Record<string, unknown>> & {
      columns?: Record<string, unknown>;
    };

    const columns = recordset.columns
      ? Object.keys(recordset.columns)
      : recordset[0]
        ? Object.keys(recordset[0])
        : [];

    // JS 侧再兜一层
    const truncated = recordset.length >= db.maxRows;
    const rows = recordset.slice(0, db.maxRows);

    console.log(
      `[db:sqlserver] ok rows=${rows.length}${truncated ? '+' : ''} elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)}`,
    );

    return {
      success: true,
      error: null,
      columns,
      rows,
      rowCount: rows.length,
      truncated,
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[db:sqlserver] fail elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)} err=${message}`,
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

/** 把 SQL 压成一行并截断，仅用于日志 */
function oneLine(sqlText: string): string {
  return sqlText.replace(/\s+/g, ' ').slice(0, 200);
}

/** 轻量连接探测：建池并取当前库名（供 /config/check 用） */
export async function pingDatabase(db: SqlServerDbRuntime): Promise<PingResult> {
  const pool = await getPool(db);
  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS DbName');
  const database = String(dbNameResult.recordset?.[0]?.DbName ?? '');
  const countResult = await pool
    .request()
    .query("SELECT COUNT(*) AS C FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
  const tableCount = Number(countResult.recordset?.[0]?.C ?? 0);
  return { database, tableCount };
}

export async function closeAllPools(): Promise<void> {
  const entries = [...pools.values()];
  pools.clear();
  await Promise.all(
    entries.map(async (entry) => {
      try {
        const pool = await entry.promise;
        await pool.close();
      } catch {
        /* ignore */
      }
    }),
  );
}
