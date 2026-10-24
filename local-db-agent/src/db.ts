import type { DbRuntime } from './config.js';
import * as kingbase from './db/kingbase.js';
import * as sqlserver from './db/sqlserver.js';
import type {
  ListTablesOptions,
  PingResult,
  QueryResult,
  SchemaColumn,
  SchemaKeyRow,
  SchemaResult,
  TableSchemaResult,
} from './db/types.js';

export type {
  ColumnInfo,
  ForeignKeyInfo,
  ListTablesOptions,
  PingResult,
  QueryResult,
  SchemaColumn,
  SchemaKeyRow,
  SchemaResult,
  TableBrief,
  TableSchemaResult,
} from './db/types.js';

/** 读取目标库的表清单（Kingbase 会应用 schemas/hiddenTables/blockedTables）。 */
export async function getSchema(
  db: DbRuntime,
  options: ListTablesOptions = {},
): Promise<SchemaResult> {
  return db.type === 'kingbase'
    ? kingbase.getSchema(db, options)
    : sqlserver.getSchema(db, options);
}

/** 取单张表的字段（Kingbase 支持 schema.table 入参）。 */
export async function getTableSchema(db: DbRuntime, tableName: string): Promise<TableSchemaResult> {
  return db.type === 'kingbase'
    ? kingbase.getTableSchema(db, tableName)
    : sqlserver.getTableSchema(db, tableName);
}

/** 全库列清单（用于本地检索索引，不发模型）。 */
export async function getAllColumns(db: DbRuntime): Promise<SchemaColumn[]> {
  return db.type === 'kingbase' ? kingbase.getAllColumns(db) : sqlserver.getAllColumns(db);
}

/** 全库主键/唯一/外键清单（用于 schema 关系图，不发模型）。失败返回空数组。 */
export async function getAllKeys(db: DbRuntime): Promise<SchemaKeyRow[]> {
  return db.type === 'kingbase' ? kingbase.getAllKeys(db) : sqlserver.getAllKeys(db);
}

export async function runQuery(db: DbRuntime, sqlText: string): Promise<QueryResult> {
  return db.type === 'kingbase' ? kingbase.runQuery(db, sqlText) : sqlserver.runQuery(db, sqlText);
}

/** 轻量连接探测（供 /config/check 用） */
export async function pingDatabase(db: DbRuntime): Promise<PingResult> {
  return db.type === 'kingbase' ? kingbase.pingDatabase(db) : sqlserver.pingDatabase(db);
}

export async function closeAllPools(): Promise<void> {
  await Promise.all([kingbase.closeAllPools(), sqlserver.closeAllPools()]);
}
