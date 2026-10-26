import { beforeEach, describe, expect, it, vi } from 'vitest';
import { budgetMessage, runWithBudget, TurnBudget } from './budget.js';
import { getAllColumns, getAllKeys, getSchema, getTableSchema, runQuery } from './db.js';
import { clearSchemaCache } from './schema-cache.js';
import { compactTableEntries, createTools, isTerminalVisualTool } from './tools.js';

vi.mock('./db.js', () => ({
  getSchema: vi.fn(),
  getTableSchema: vi.fn(),
  getAllColumns: vi.fn(),
  getAllKeys: vi.fn(),
  runQuery: vi.fn(),
}));

const tables = Array.from({ length: 100 }, (_, index) => ({
  name: `CORE_Table${index}`,
  schema: 'dbo',
  columnCount: 10,
  comment: index === 0 ? '库存主表，记录可用库存与占用库存' : null,
}));

function budget(maxSchemaCalls = 6): TurnBudget {
  return new TurnBudget({
    maxSqlQueries: 6,
    maxSchemaCalls,
    maxResultChars: 8000,
    maxTotalToolChars: 24000,
  });
}

function tool(name: string) {
  return createTools({ type: 'sqlserver' } as never).find((item) => item.name === name) as
    { invoke: (input: unknown) => Promise<unknown> } | undefined;
}

function call(name: string, args: Record<string, unknown>) {
  const target = tool(name);
  if (!target) throw new Error(`missing tool ${name}`);
  return target.invoke({ type: 'tool_call', id: `call-${name}`, name, args });
}

/** tool.invoke 传入 ToolCall 时返回 ToolMessage，这里取 content。 */
function text(value: unknown): string {
  if (typeof value === 'string') return value;
  return String((value as { content?: unknown } | null)?.content ?? '');
}

beforeEach(() => {
  clearSchemaCache();
  vi.mocked(getSchema).mockReset();
  vi.mocked(getTableSchema).mockReset();
  vi.mocked(getSchema).mockResolvedValue({
    database: 'WMS',
    tableCount: tables.length,
    totalTables: tables.length,
    availableSchemas: ['dbo'],
    tables,
  });
  // 这些单测只覆盖 fallback 单表路径，让列索引直接失败
  vi.mocked(getAllColumns).mockReset();
  vi.mocked(getAllKeys).mockReset();
  vi.mocked(getAllColumns).mockRejectedValue(new Error('no column index in this test'));
  vi.mocked(getAllKeys).mockRejectedValue(new Error('no keys in this test'));
});

describe('list_tables 紧凑输出', () => {
  it('大库只返回表名 + 截断注释，并带 remaining', async () => {
    const b = budget();
    const output = text(await runWithBudget(b, () => call('list_tables', {})));
    const parsed = JSON.parse(output) as {
      tables: string[];
      remainingSchema?: number;
      remainingSql?: number;
    };
    expect(parsed.tables).toHaveLength(100);
    expect(parsed.tables[0]).toContain('dbo.CORE_Table0 — 库存主表');
    expect(output.length).toBeLessThan(4000);
    expect(parsed.remainingSchema).toBe(5);
    expect(parsed.remainingSql).toBe(6);
  });

  it('同一轮第二次全表查询只回短确认，不再查库', async () => {
    const b = budget();
    await runWithBudget(b, async () => {
      const first = text(await call('list_tables', { keyword: 'wms' }));
      expect(first.length).toBeGreaterThan(1000);
      const second = text(await call('list_tables', {}));
      expect(second.length).toBeLessThan(400);
      expect(second).toContain('cached');
    });
    expect(vi.mocked(getSchema)).toHaveBeenCalledTimes(1);
  });

  it('超过 100 张表只返回表名', async () => {
    const many = Array.from({ length: 101 }, (_, index) => ({
      name: `CORE_Table${index}`,
      schema: 'dbo',
      columnCount: 10,
      rowCount: 100 + index,
      comment: `注释${index}`,
    }));
    clearSchemaCache();
    vi.mocked(getSchema).mockResolvedValueOnce({
      database: 'WMS',
      tableCount: many.length,
      totalTables: many.length,
      availableSchemas: ['dbo'],
      tables: many,
    });
    const b = budget();
    const output = text(await runWithBudget(b, () => call('list_tables', {})));
    const parsed = JSON.parse(output) as { tables: string[] };
    expect(parsed.tables).toHaveLength(101);
    expect(parsed.tables[0]).toBe('dbo.CORE_Table0');
    expect(parsed.tables[0]).not.toContain('注释');
  });

  it('compactTableEntries 去掉空注释并截断长注释', () => {
    expect(
      compactTableEntries([
        { name: 'A', schema: 'dbo', columnCount: 1, comment: null },
        { name: 'B', schema: 'dbo', columnCount: 1, comment: 'x'.repeat(80) },
      ])[1].length,
    ).toBeLessThan(100);
  });
});

describe('get_table_schema 批量', () => {
  it('tables 数组一次返回多张表，列用 名称:类型', async () => {
    vi.mocked(getTableSchema).mockImplementation(async (_db, name) => ({
      database: 'WMS',
      table: String(name),
      columns: [
        { name: 'Id', type: 'int', nullable: false },
        { name: 'Amount', type: 'decimal', nullable: true },
      ],
    }));
    const b = budget(8);
    const output = text(
      await runWithBudget(b, () =>
        call('get_table_schema', { tables: ['dbo.CORE_Order', 'dbo.CORE_Stock'] }),
      ),
    );
    const parsed = JSON.parse(output) as {
      schemas: Array<{ table: string; columns: string[] }>;
    };
    expect(parsed.schemas).toHaveLength(2);
    expect(parsed.schemas[0].columns).toEqual(['Id:int NOT NULL', 'Amount:decimal NULL']);
    expect(b.usage.schemaCalls).toBe(2);
    expect(vi.mocked(getTableSchema)).toHaveBeenCalledTimes(2);
  });

  it('默认 compact 不带注释，detail=full 才带', async () => {
    vi.mocked(getTableSchema).mockResolvedValue({
      database: 'WMS',
      table: 'dbo.T',
      columns: [{ name: 'Id', type: 'int', nullable: false, comment: '主键' }],
    });
    const compact = text(
      await runWithBudget(budget(), () => call('get_table_schema', { table: 'dbo.T' })),
    );
    expect(compact).not.toContain('主键');
    const full = text(
      await runWithBudget(budget(), () =>
        call('get_table_schema', { table: 'dbo.T', detail: 'full' }),
      ),
    );
    expect(full).toContain('主键');
  });
});

describe('get_table_schema 去重', () => {
  it('同一张表第二次只回短确认', async () => {
    vi.mocked(getTableSchema).mockResolvedValue({
      database: 'WMS',
      table: 'dbo.CORE_Table0',
      columns: [{ name: 'Id', type: 'int', nullable: false }],
    });
    const b = budget();
    await runWithBudget(b, async () => {
      const first = text(await call('get_table_schema', { table: 'dbo.CORE_Table0' }));
      expect(first).toContain('columns');
      const second = text(await call('get_table_schema', { table: 'dbo.CORE_Table0' }));
      expect(second.length).toBeLessThan(300);
      expect(second).toContain('cached');
    });
    expect(vi.mocked(getTableSchema)).toHaveBeenCalledTimes(1);
  });
});

describe('剩余预算', () => {
  it('超限提示里带 remaining=0', async () => {
    const b = budget(1);
    const output = await runWithBudget(b, async () => {
      b.takeSchemaCall();
      return budgetMessage('schema', '已达上限');
    });
    const parsed = JSON.parse(output) as { remainingSchema: number };
    expect(parsed.remainingSchema).toBe(0);
  });

  it('render_html_report 是终止型可视化工具', () => {
    expect(isTerminalVisualTool('render_html_report')).toBe(true);
    expect(isTerminalVisualTool('render_report')).toBe(false);
    expect(isTerminalVisualTool('run_sql')).toBe(false);
  });
});

describe('报告轮优化', () => {
  it('reportMode 只暴露必要工具，减少固定定义', () => {
    const names = createTools({ type: 'sqlserver' } as never, { reportMode: true }).map(
      item => item.name,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'search_tables',
        'get_table_schema',
        'run_sql',
        'render_html_report',
        'list_skills',
        'read_skill',
        'read_skill_file',
      ]),
    );
    expect(names).not.toContain('render_report');
    expect(names).not.toContain('render_chart');
  });

  it('同一批重复 SQL 只执行一次', async () => {
    vi.mocked(runQuery).mockReset();
    vi.mocked(runQuery).mockResolvedValue({
      success: true,
      error: null,
      columns: ['v'],
      rows: [{ v: 1 }],
      rowCount: 1,
      truncated: false,
      elapsedMs: 1,
    });
    const b = budget();
    const output = text(
      await runWithBudget(b, () =>
        call('run_sql', { queries: ['SELECT 1', ' select   1 ', 'SELECT 2'] }),
      ),
    );
    expect(vi.mocked(runQuery)).toHaveBeenCalledTimes(2);
    const parsed = JSON.parse(output) as {
      results: Array<{ columns: string[]; rows: unknown[][] }>;
    };
    expect(parsed.results).toHaveLength(2);
    // rows 与 columns 顺序对齐，不再逐行重复列名
    expect(parsed.results[0].columns).toEqual(['v']);
    expect(parsed.results[0].rows).toEqual([[1]]);
  });

  it('报告轮 12 条 SQL 后只软提示一次', () => {
    const b = new TurnBudget(
      { maxSqlQueries: 6, maxSchemaCalls: 4, maxResultChars: 8000, maxTotalToolChars: 24000 },
      { unlimitedQueries: true },
    );
    for (let i = 0; i < 11; i++) b.takeSqlQuery();
    expect(b.takeReportNudge()).toBeNull();
    b.takeSqlQuery();
    expect(b.takeReportNudge()).toContain('优先出报告');
    expect(b.takeReportNudge()).toBeNull();
  });
});

describe('get_table_schema 结构关系', () => {
  it('返回主键/外键/日期列（数据库有约束时）', async () => {
    vi.mocked(getTableSchema).mockResolvedValue({
      database: 'WMS',
      table: 'dbo.CORE_Order',
      columns: [
        { name: 'OrderID', type: 'int', nullable: false, primaryKey: true },
        { name: 'AddTime', type: 'datetime', nullable: false },
        {
          name: 'CustomerID',
          type: 'int',
          nullable: false,
          references: [{ table: 'Customer', column: 'ID' }],
        },
      ],
    });
    const b = budget();
    const output = text(
      await runWithBudget(b, () => call('get_table_schema', { table: 'dbo.CORE_Order' })),
    );
    const parsed = JSON.parse(output) as {
      primaryKey?: string[];
      foreignKeys?: Array<{ refTable: string; columns: string[] }>;
      dateColumns?: string[];
    };
    expect(parsed.primaryKey).toEqual(['OrderID']);
    expect(parsed.foreignKeys?.[0]).toMatchObject({
      refTable: 'Customer',
      columns: ['CustomerID'],
    });
    expect(parsed.dateColumns).toEqual(['AddTime']);
  });

  it('没有约束时不带 primaryKey/foreignKeys 字段', async () => {
    vi.mocked(getTableSchema).mockResolvedValue({
      database: 'WMS',
      table: 'dbo.CORE_Order',
      columns: [{ name: 'OrderName', type: 'varchar', nullable: false }],
    });
    const b = budget();
    const output = text(
      await runWithBudget(b, () => call('get_table_schema', { table: 'dbo.CORE_Order' })),
    );
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.primaryKey).toBeUndefined();
    expect(parsed.foreignKeys).toBeUndefined();
    expect(parsed.dateColumns).toBeUndefined();
  });
});

describe('get_table_schema profile', () => {
  const profileArgs = {
    table: 'dbo.CORE_Order',
    detail: 'profile',
    columns: ['OrderType', 'AddTime'],
  };

  beforeEach(() => {
    vi.mocked(runQuery).mockReset();
    vi.mocked(getTableSchema).mockResolvedValue({
      database: 'WMS',
      table: 'dbo.CORE_Order',
      columns: [
        { name: 'OrderID', type: 'int', nullable: false, primaryKey: true },
        { name: 'OrderType', type: 'int', nullable: true },
        { name: 'AddTime', type: 'datetime', nullable: false },
      ],
    });
    vi.mocked(runQuery).mockImplementation(async (_db: unknown, sql: unknown) => {
      const text = String(sql);
      if (text.includes('__rows')) {
        return {
          success: true,
          error: null,
          columns: [],
          rows: [
            {
              __rows: 100,
              __nn0: 90,
              __nd0: 2,
              __min0: 0,
              __max0: 1,
              __nn1: 100,
              __nd1: 30,
              __min1: '2024-01-01',
              __max1: '2024-12-31',
            },
          ],
          rowCount: 1,
          truncated: false,
          elapsedMs: 1,
        };
      }
      return {
        success: true,
        error: null,
        columns: [],
        rows: [
          { value: 1, count: 60 },
          { value: 0, count: 30 },
        ],
        rowCount: 2,
        truncated: false,
        elapsedMs: 1,
      };
    });
  });

  it('聚合行数/空值率/枚举 Top', async () => {
    const b = budget();
    const output = text(await runWithBudget(b, () => call('get_table_schema', profileArgs)));
    const parsed = JSON.parse(output) as {
      success: boolean;
      rows: number;
      columns: Array<{
        name: string;
        nullRate?: number;
        distinct?: number;
        min?: unknown;
        max?: unknown;
        top?: Array<{ value: unknown; count: number }>;
      }>;
    };
    expect(parsed.success).toBe(true);
    expect(parsed.rows).toBe(100);
    expect(parsed.columns[0].name).toBe('OrderType');
    expect(parsed.columns[0].nullRate).toBe(0.1);
    expect(parsed.columns[0].distinct).toBe(2);
    expect(parsed.columns[0].top).toHaveLength(2);
    expect(parsed.columns[1].name).toBe('AddTime');
    expect(parsed.columns[1].min).toBe('2024-01-01');
    expect(parsed.columns[1].max).toBe('2024-12-31');
    expect(parsed.columns[1].top).toBeUndefined();
  });

  it('30 分钟缓存：第二次命中不再查库', async () => {
    const args = { ...profileArgs, table: 'dbo.ProfileCached' };
    const b = budget();
    await runWithBudget(b, () => call('get_table_schema', args));
    const firstCalls = vi.mocked(runQuery).mock.calls.length;
    expect(firstCalls).toBeGreaterThan(0);
    const second = text(await runWithBudget(b, () => call('get_table_schema', args)));
    expect(JSON.parse(second).cached).toBe(true);
    expect(vi.mocked(runQuery).mock.calls.length).toBe(firstCalls);
  });

  it('profile 拒绝 tables 批量', async () => {
    const b = budget();
    const output = text(
      await runWithBudget(b, () =>
        call('get_table_schema', { tables: ['dbo.A', 'dbo.B'], detail: 'profile' }),
      ),
    );
    expect(output).toContain('只支持单张表');
  });

  it('聚合 SQL 只包含选中的列', async () => {
    const args = { ...profileArgs, table: 'dbo.ProfileAgg' };
    const b = budget();
    await runWithBudget(b, () => call('get_table_schema', args));
    const aggregate = vi
      .mocked(runQuery)
      .mock.calls.map((callItem) => String(callItem[1]))
      .find((sqlText) => sqlText.includes('__rows'));
    expect(aggregate).toContain('[OrderType]');
    expect(aggregate).toContain('[AddTime]');
    expect(aggregate).not.toContain('[OrderID]');
  });
});
