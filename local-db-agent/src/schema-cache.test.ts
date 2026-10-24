import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getAllColumns, getAllKeys, getSchema } from './db.js';
import { reloadKnowledgePack } from './knowledge.js';
import { clearSchemaCache, getColumnIndexCached, retrieveTables } from './schema-cache.js';

vi.mock('./db.js', () => ({
  getSchema: vi.fn(),
  getTableSchema: vi.fn(),
  getAllColumns: vi.fn(),
  getAllKeys: vi.fn(),
  runQuery: vi.fn(),
}));

const dir = mkdtempSync(join(tmpdir(), 'agent-schema-'));
const noPackDir = mkdtempSync(join(tmpdir(), 'agent-schema-nopack-'));

mkdirSync(join(dir, 'docs'), { recursive: true });
writeFileSync(
  join(dir, 'manifest.json'),
  JSON.stringify({
    name: 'demo',
    priorityTables: ['CORE_Order'],
    tables: {
      CORE_Order: {
        comment: '单据主表',
        aliases: ['出库单', '入库单'],
        keyColumns: ['OrderName', 'OrderType'],
        relationships: [{ to: 'CORE_OrderDetail' }],
      },
      CORE_OrderDetail: {
        comment: '单据明细',
        aliases: ['出库明细'],
        keyColumns: ['OrderID', 'ProductID'],
      },
    },
  }),
  'utf8',
);

const tables = [
  { name: 'CORE_Order', schema: 'dbo', columnCount: 12, rowCount: 93148, comment: '单据主表' },
  {
    name: 'CORE_OrderDetail',
    schema: 'dbo',
    columnCount: 21,
    rowCount: 616404,
    comment: '单据明细',
  },
  { name: 'CORE_Product', schema: 'dbo', columnCount: 20, rowCount: 11140, comment: '物料' },
];

beforeEach(() => {
  clearSchemaCache();
  reloadKnowledgePack(dir);
  vi.mocked(getSchema).mockReset();
  vi.mocked(getSchema).mockResolvedValue({
    database: 'WMS',
    tableCount: tables.length,
    totalTables: tables.length,
    availableSchemas: ['dbo'],
    tables,
  });
  vi.mocked(getAllColumns).mockReset();
  vi.mocked(getAllKeys).mockReset();
  vi.mocked(getAllColumns).mockResolvedValue([
    {
      schema: 'dbo',
      table: 'CORE_Order',
      name: 'OrderName',
      type: 'varchar',
      nullable: false,
      comment: '出库单号',
    },
    {
      schema: 'dbo',
      table: 'CORE_Order',
      name: 'OrderType',
      type: 'int',
      nullable: false,
      comment: '0出库 1入库',
    },
    {
      schema: 'dbo',
      table: 'CORE_OrderDetail',
      name: 'OrderID',
      type: 'uniqueidentifier',
      nullable: false,
      comment: '所属单据',
    },
    {
      schema: 'dbo',
      table: 'CORE_Product',
      name: 'ProductName',
      type: 'varchar',
      nullable: true,
      comment: '物料名称',
    },
  ]);
  vi.mocked(getAllKeys).mockResolvedValue([]);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(noPackDir, { recursive: true, force: true });
  reloadKnowledgePack();
});

describe('retrieveTables', () => {
  it('按业务别名命中相关表，并带出关联表', async () => {
    const db = { type: 'sqlserver', connectionString: 'Server=test;Database=WMS;Uid=sa' } as never;
    const rows = await retrieveTables(db, '看一下出库单明细', 8);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].table).toBe('dbo.CORE_Order');
    expect(rows.map((row) => row.table)).toContain('dbo.CORE_OrderDetail');
    expect(rows[0].rows).toBe('约万级');
    expect(rows[0].keyColumns).toContain('OrderName');
    expect(rows[0].matchedColumns).toContain('OrderName');
  });

  it('检索不到时返回空，不伪造表', async () => {
    const db = { type: 'sqlserver', connectionString: 'Server=test;Database=WMS;Uid=sa' } as never;
    const rows = await retrieveTables(db, '完全无关的关键词xyz', 8);
    expect(rows).toHaveLength(0);
  });

  it('金仓带引号表名也能命中列索引', async () => {
    clearSchemaCache();
    vi.mocked(getSchema).mockResolvedValueOnce({
      database: 'KB',
      tableCount: 1,
      totalTables: 1,
      availableSchemas: ['public'],
      tables: [
        {
          name: 'public."CORE_Order"',
          schema: 'public',
          columnCount: 12,
          rowCount: 1000,
          comment: '单据主表',
        },
      ],
    });
    vi.mocked(getAllColumns).mockResolvedValueOnce([
      {
        schema: 'public',
        table: 'CORE_Order',
        name: 'OrderName',
        type: 'varchar',
        nullable: false,
        comment: '出库单号',
      },
    ]);
    const db = {
      type: 'kingbase',
      host: 'test',
      port: 54321,
      database: 'KB',
      user: 'sa',
      password: 'x',
      ssl: false,
      requestTimeoutMs: 60000,
      costLimit: 50,
      maxRows: 500,
      schemas: ['public'],
      hiddenTables: [],
      blockedTables: [],
    } as never;
    const rows = await retrieveTables(db, '出库单号', 8);
    expect(rows[0].table).toBe('public."CORE_Order"');
    expect(rows[0].matchedColumns).toContain('OrderName');
  });

  it('没有知识包时用主键/日期列/外键兜底（getAllKeys 合并进列索引）', async () => {
    try {
      reloadKnowledgePack(noPackDir);
      clearSchemaCache();
      vi.mocked(getSchema).mockResolvedValue({
        database: 'WMS',
        tableCount: 1,
        totalTables: 1,
        availableSchemas: ['dbo'],
        tables: [tables[0]],
      });
      vi.mocked(getAllColumns).mockResolvedValue([
        { schema: 'dbo', table: 'CORE_Order', name: 'OrderID', type: 'int', nullable: false },
        { schema: 'dbo', table: 'CORE_Order', name: 'AddTime', type: 'datetime', nullable: false },
        { schema: 'dbo', table: 'CORE_Order', name: 'CustomerID', type: 'int', nullable: false },
      ]);
      vi.mocked(getAllKeys).mockResolvedValue([
        {
          schema: 'dbo',
          table: 'CORE_Order',
          column: 'OrderID',
          primaryKey: true,
          unique: false,
          ordinal: 1,
        },
        {
          schema: 'dbo',
          table: 'CORE_Order',
          column: 'CustomerID',
          primaryKey: false,
          unique: false,
          refTable: 'Customer',
          refColumn: 'ID',
          ordinal: 1,
        },
      ]);
      const db = {
        type: 'sqlserver',
        connectionString: 'Server=test;Database=WMS;Uid=sa',
      } as never;
      const rows = await retrieveTables(db, 'OrderID', 8);
      expect(rows[0].table).toBe('dbo.CORE_Order');
      expect(rows[0].keyColumns).toEqual(['OrderID', 'AddTime']);
      expect(rows[0].dateColumns).toEqual(['AddTime']);
      expect(rows[0].related).toContain('Customer');

      // 第二次读内存缓存仍要有列；修复前 filtered 用未归一化 key，会缓存空列
      const cachedIndex = await getColumnIndexCached(db);
      expect(cachedIndex.byTable.size).toBeGreaterThan(0);
    } finally {
      reloadKnowledgePack(dir);
    }
  });

  it('知识包 keyColumns 优先于数据库 PK 兜底', async () => {
    const db = { type: 'sqlserver', connectionString: 'Server=test;Database=WMS;Uid=sa' } as never;
    const rows = await retrieveTables(db, 'OrderName', 8);
    expect(rows[0].keyColumns).toEqual(['OrderName', 'OrderType']);
  });
});
