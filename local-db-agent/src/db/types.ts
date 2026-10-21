export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  comment?: string | null;
}

export interface TableBrief {
  /** 可直接放进 SQL 的表名；金仓为 schema."Table" 形式 */
  name: string;
  schema?: string;
  columnCount: number;
  comment?: string | null;
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
  comment?: string | null;
  columns: ColumnInfo[];
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

export interface ListTablesOptions {
  /** 按表名/表注释模糊筛选，适合表很多时缩小范围 */
  keyword?: string;
}

export interface PingResult {
  database: string;
  tableCount: number;
  version?: string;
  readOnly?: boolean;
}
