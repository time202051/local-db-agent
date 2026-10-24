import type { ConnectionPool } from 'mssql';
import type { SqlServerDbRuntime } from '../config.js';
import { assertReadOnly, normalizeUnicodeLiterals } from '../sql-guard.js';
import { isHiddenTable, parseTableName } from './identifiers.js';
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

/**
 * 读取目标库的表清单（受限账号只会返回它有权访问的表）。
 *
 * 注意：模型的 keyword 经常是中文（如“库存”），SQL Server 表名却是英文。
 * 因此这里同时查询 MS_Description 注释参与匹配；未命中时直接返回全表清单，
 * 避免模型换着 keyword 反复调用 list_tables（每次都是一个完整的模型往返）。
 */
export async function getSchema(
  db: SqlServerDbRuntime,
  options: ListTablesOptions = {},
): Promise<SchemaResult> {
  const pool = await getPool(db);

  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS DbName');
  const database = String(dbNameResult.recordset?.[0]?.DbName ?? '');

  const keyword = (options.keyword ?? '').trim().toLowerCase();
  let rows: Array<Record<string, unknown>>;
  try {
    const result = await pool.request().query(
      `SELECT s.name AS TableSchema,
              t.name AS TableName,
              COUNT(c.column_id) AS ColumnCount,
              ISNULL(MAX(pr.rows), 0) AS RowCount,
              MAX(CAST(ep.value AS nvarchar(4000))) AS TableComment
       FROM sys.tables t
       JOIN sys.schemas s ON s.schema_id = t.schema_id
       LEFT JOIN sys.columns c ON c.object_id = t.object_id
       LEFT JOIN (
         SELECT object_id, SUM(rows) AS rows
         FROM sys.partitions
         WHERE index_id IN (0, 1)
         GROUP BY object_id
       ) pr ON pr.object_id = t.object_id
       LEFT JOIN sys.extended_properties ep
         ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
       WHERE t.is_ms_shipped = 0
       GROUP BY s.name, t.name
       ORDER BY s.name, t.name`,
    );
    rows = result.recordset as Array<Record<string, unknown>>;
  } catch {
    // 极少数只读账号没有 sys 视图权限，回退到 INFORMATION_SCHEMA（没有注释）
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
    rows = result.recordset as Array<Record<string, unknown>>;
  }

  const all: TableBrief[] = [];
  const availableSchemas = new Set<string>();
  for (const row of rows) {
    const schema = String(row.TableSchema);
    const table = String(row.TableName);
    const comment = row.TableComment == null ? null : String(row.TableComment);
    availableSchemas.add(schema);
    all.push({
      name: table,
      schema,
      columnCount: Number(row.ColumnCount ?? 0),
      rowCount: Number(row.RowCount ?? 0),
      comment,
    });
  }

  const allowed = all.filter(
    (item) =>
      !isHiddenTable(item.name, item.schema ?? '', db.hiddenTables) &&
      !isHiddenTable(item.name, item.schema ?? '', db.blockedTables),
  );
  const inSchema = allowed.filter(
    (item) => !db.schemas.length || db.schemas.includes(item.schema ?? ''),
  );

  const matches = (item: TableBrief): boolean => {
    const haystack = `${item.schema ?? ''}.${item.name} ${item.comment ?? ''}`.toLowerCase();
    return haystack.includes(keyword);
  };

  let tables = inSchema;
  let hint: string | undefined;
  if (keyword) {
    const matched = inSchema.filter(matches);
    if (matched.length) {
      tables = matched;
    } else {
      // 中文 keyword 匹配不到英文表名时，别让模型继续换词重试
      tables = inSchema.length ? inSchema : allowed;
      hint =
        `keyword "${options.keyword}" 未匹配到表名或表注释，已返回全部 ${tables.length} 张表；` +
        '请直接从列表里选表，不要再用其它 keyword 重试；需要字段时用 get_table_schema。';
    }
  }

  if (!tables.length && all.length) {
    tables = allowed;
    hint =
      `当前 schemas 配置（${db.schemas.join(', ') || '空'}）过滤后没有可展示的表（库内共 ${all.length} 张），` +
      `已回退展示全部 ${tables.length} 张；请检查前端 schemas 配置。`;
  }
  if (!tables.length) {
    hint =
      all.length > 0
        ? `库内 ${all.length} 张表都被 hiddenTables/blockedTables 过滤，请检查前端配置。`
        : '当前账号在这个库没有任何可访问的基础表（可能是权限不足或库为空）。';
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

/** 一次性读取所有可见表的列清单，用于本地检索索引。 */
export async function getAllColumns(db: SqlServerDbRuntime): Promise<SchemaColumn[]> {
  const pool = await getPool(db);
  const result = await pool.request().query(
    `SELECT s.name AS TableSchema,
            t.name AS TableName,
            c.name AS ColumnName,
            ty.name AS DataType,
            c.is_nullable AS IsNullable,
            c.column_id AS Ordinal,
            CAST(ep.value AS nvarchar(1000)) AS Comment
     FROM sys.tables t
     JOIN sys.schemas s ON s.schema_id = t.schema_id
     JOIN sys.columns c ON c.object_id = t.object_id
     JOIN sys.types ty ON ty.user_type_id = c.user_type_id
     LEFT JOIN sys.extended_properties ep
       ON ep.major_id = t.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
     WHERE t.is_ms_shipped = 0
     ORDER BY s.name, t.name, c.column_id`,
  );
  return (result.recordset as Array<Record<string, unknown>>).map((row) => ({
    schema: String(row.TableSchema),
    table: String(row.TableName),
    name: String(row.ColumnName),
    type: String(row.DataType),
    nullable: Number(row.IsNullable) === 1,
    comment: row.Comment == null ? null : String(row.Comment),
    ordinal: Number(row.Ordinal ?? 0),
  }));
}

/**
 * 一次性读取所有可见表的主键/唯一约束/外键，用于本地 schema 关系图。
 * 任何失败都返回空数组（keys 是增强信息，缺失不阻塞主流程）。
 */
export async function getAllKeys(db: SqlServerDbRuntime): Promise<SchemaKeyRow[]> {
  const pool = await getPool(db);
  const rows: SchemaKeyRow[] = [];

  try {
    // 主键 + 唯一约束（只取唯一约束索引，避免普通唯一索引把大量业务列标成 unique）
    const keys = await pool.request().query(
      `SELECT s.name AS TableSchema,
              t.name AS TableName,
              c.name AS ColumnName,
              i.is_primary_key AS IsPrimaryKey,
              CASE WHEN i.is_unique_constraint = 1 AND i.is_primary_key = 0 THEN 1 ELSE 0 END AS IsUnique,
              ic.key_ordinal AS KeyOrdinal,
              i.name AS ConstraintName
       FROM sys.indexes i
       JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
       JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
       JOIN sys.tables t ON t.object_id = i.object_id
       JOIN sys.schemas s ON s.schema_id = t.schema_id
       WHERE (i.is_primary_key = 1 OR i.is_unique_constraint = 1)
         AND t.is_ms_shipped = 0
       ORDER BY s.name, t.name, i.name, ic.key_ordinal`,
    );
    for (const row of keys.recordset as Array<Record<string, unknown>>) {
      rows.push({
        schema: String(row.TableSchema),
        table: String(row.TableName),
        column: String(row.ColumnName),
        primaryKey: Number(row.IsPrimaryKey) === 1,
        unique: Number(row.IsUnique) === 1,
        ordinal: Number(row.KeyOrdinal ?? 0),
        constraint: row.ConstraintName == null ? undefined : String(row.ConstraintName),
      });
    }

    // 外键：父列 → 被引用列
    const fks = await pool.request().query(
      `SELECT s.name AS TableSchema,
              t.name AS TableName,
              c.name AS ColumnName,
              rs.name AS RefSchema,
              rt.name AS RefTable,
              rc.name AS RefColumn,
              fkc.key_ordinal AS KeyOrdinal,
              fk.name AS ConstraintName
       FROM sys.foreign_keys fk
       JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
       JOIN sys.tables t ON t.object_id = fk.parent_object_id
       JOIN sys.schemas s ON s.schema_id = t.schema_id
       JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
       JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
       JOIN sys.schemas rs ON rs.schema_id = rt.schema_id
       JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
       ORDER BY s.name, t.name, fk.name, fkc.key_ordinal`,
    );
    for (const row of fks.recordset as Array<Record<string, unknown>>) {
      rows.push({
        schema: String(row.TableSchema),
        table: String(row.TableName),
        column: String(row.ColumnName),
        primaryKey: false,
        unique: false,
        refSchema: String(row.RefSchema),
        refTable: String(row.RefTable),
        refColumn: String(row.RefColumn),
        ordinal: Number(row.KeyOrdinal ?? 0),
        constraint: row.ConstraintName == null ? undefined : String(row.ConstraintName),
      });
    }
  } catch (error) {
    console.error(
      `[db:sqlserver] getAllKeys failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
  return rows;
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
