import sql from 'mssql/msnodesqlv8.js';
import type { DbRuntime } from './config.js';
import { assertReadOnly, normalizeUnicodeLiterals } from './sql-guard.js';

interface PoolEntry {
  promise: Promise<sql.ConnectionPool>;
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

async function getPool(db: DbRuntime): Promise<sql.ConnectionPool> {
  const key = db.connectionString;
  evictStale();

  let entry = pools.get(key);
  if (!entry) {
    // 注意：必须用 new ConnectionPool(...)，不能用 sql.connect(...)——
    // 后者会复用已有的全局连接并忽略新传入的配置（多库场景会张冠李戴）。
    const pool = new sql.ConnectionPool({
      connectionString: key,
      requestTimeout: db.requestTimeoutMs,
    } as any);
    const promise = pool
      .connect()
      .then(() => {
        // 连接池出错时记录，避免未处理异常导致进程退出
        pool.on('error', (err: Error) => {
          console.error('[db] pool error:', err.message);
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

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableBrief {
  name: string;
  columnCount: number;
}

/** 精简版 schema：只给表名 + 列数，避免大库一次把全字段喂给模型 */
export interface SchemaResult {
  database: string;
  tableCount: number;
  tables: TableBrief[];
}

/** 单表详情：按需查询某张表的字段 */
export interface TableSchemaResult {
  database: string;
  table: string;
  columns: ColumnInfo[];
}

/** 读取目标库的表清单（受限账号只会返回它有权访问的表）。 */
export async function getSchema(db: DbRuntime): Promise<SchemaResult> {
  const pool = await getPool(db);

  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS DbName');
  const database = String(dbNameResult.recordset?.[0]?.DbName ?? '');

  const result = await pool.request().query(
    `SELECT t.TABLE_NAME AS TableName, COUNT(c.COLUMN_NAME) AS ColumnCount
     FROM INFORMATION_SCHEMA.TABLES t
     LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
       ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
     WHERE t.TABLE_TYPE = 'BASE TABLE'
     GROUP BY t.TABLE_NAME
     ORDER BY t.TABLE_NAME`,
  );

  const tables: TableBrief[] = (result.recordset as Array<Record<string, unknown>>).map((row) => ({
    name: String(row.TableName),
    columnCount: Number(row.ColumnCount ?? 0),
  }));

  return { database, tableCount: tables.length, tables };
}

/** 取单张表的字段（按需调用，避免一次性拉全库字段）。 */
export async function getTableSchema(db: DbRuntime, tableName: string): Promise<TableSchemaResult> {
  const pool = await getPool(db);

  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS DbName');
  const database = String(dbNameResult.recordset?.[0]?.DbName ?? '');

  const result = await pool
    .request()
    .input('tableName', tableName)
    .query(
      `SELECT c.COLUMN_NAME AS ColumnName,
            c.DATA_TYPE   AS DataType,
            c.IS_NULLABLE AS IsNullable
     FROM INFORMATION_SCHEMA.COLUMNS c
     JOIN INFORMATION_SCHEMA.TABLES t
       ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
     WHERE t.TABLE_TYPE = 'BASE TABLE' AND t.TABLE_NAME = @tableName
     ORDER BY c.ORDINAL_POSITION`,
    );

  const columns: ColumnInfo[] = (result.recordset as Array<Record<string, unknown>>).map((row) => ({
    name: String(row.ColumnName),
    type: String(row.DataType),
    nullable: String(row.IsNullable).toUpperCase() === 'YES',
  }));

  return { database, table: tableName, columns };
}

export interface QueryResult {
  success: boolean;
  error: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
}

export async function runQuery(db: DbRuntime, sqlText: string): Promise<QueryResult> {
  const started = Date.now();
  try {
    const guardError = assertReadOnly(sqlText);
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
      normalizeUnicodeLiterals(sqlText);
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
      `[db] ok rows=${rows.length}${truncated ? '+' : ''} elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)}`,
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
      `[db] fail elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)} err=${message}`,
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
export async function pingDatabase(db: DbRuntime): Promise<{ database: string; tableCount: number }> {
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
