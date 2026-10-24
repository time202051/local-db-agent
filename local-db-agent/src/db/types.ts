export interface ColumnReference {
  schema?: string;
  table: string;
  column: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  comment?: string | null;
  /** 数据库真实主键列 */
  primaryKey?: boolean;
  /** 数据库真实唯一约束列 */
  unique?: boolean;
  /** 该列参与的外键引用（可能多个） */
  references?: ColumnReference[];
}

export interface ForeignKeyInfo {
  columns: string[];
  refSchema?: string;
  refTable: string;
  refColumns: string[];
}

export interface TableBrief {
  /** 可直接放进 SQL 的表名；金仓为 schema."Table" 形式 */
  name: string;
  schema?: string;
  columnCount: number;
  /** 近似行数（SQL Server 取自 sys.partitions，金仓取自 pg_class.reltuples） */
  rowCount?: number;
  comment?: string | null;
}

/** 全库列清单（用于相关表检索/字段缓存，不直接发给模型）。 */
export interface SchemaColumn extends ColumnInfo {
  schema: string;
  table: string;
  ordinal?: number;
}

/** 精简版 schema：只给表名 + 列数，避免大库一次把全字段喂给模型 */
export interface SchemaResult {
  database: string;
  tableCount: number;
  tables: TableBrief[];
  /** 诊断提示：keyword 未命中、schemas 配置过滤掉全部表等，避免模型反复重试 */
  hint?: string;
  /** 库内实际存在的 schema，便于发现 schemas 配置写错 */
  availableSchemas?: string[];
  /** 过滤前的表总数 */
  totalTables?: number;
}

/** 单表详情：按需查询某张表的字段 */
export interface TableSchemaResult {
  database: string;
  table: string;
  comment?: string | null;
  columns: ColumnInfo[];
  /** 主键列名列表（数据库有 PK 时才有） */
  primaryKey?: string[];
  /** 外键关系列表（数据库有 FK 时才有） */
  foreignKeys?: ForeignKeyInfo[];
  /** 日期/时间类型列名（从类型推断） */
  dateColumns?: string[];
}

/** 批量 keys 查询的一行：主键/唯一/外键，供 schema-cache 合并进 SchemaColumn。 */
export interface SchemaKeyRow {
  schema: string;
  table: string;
  column: string;
  primaryKey: boolean;
  unique: boolean;
  refSchema?: string;
  refTable?: string;
  refColumn?: string;
  /** 该列在约束里的位置（1 起），用于多列约束排序 */
  ordinal: number;
  constraint?: string;
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
