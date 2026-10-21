import { describe, it, expect } from 'vitest';
import { assertReadOnly, normalizeUnicodeLiterals } from './sql-guard.js';

describe('assertReadOnly', () => {
  it('放行单条 SELECT / WITH', () => {
    expect(assertReadOnly('SELECT * FROM t')).toBeNull();
    expect(assertReadOnly('  with x as (select 1) select * from x ')).toBeNull();
  });

  it('拒绝写操作 / DDL / 多语句 / 注释', () => {
    expect(assertReadOnly('DELETE FROM t')).toContain('仅允许');
    expect(assertReadOnly('SELECT 1; SELECT 2')).toContain('分号');
    expect(assertReadOnly('SELECT 1 -- x')).toContain('注释');
    expect(assertReadOnly('SELECT * INTO t2 FROM t')).toContain('into');
    expect(assertReadOnly('EXEC sp_who')).toContain('仅允许');
  });

  it('拒绝空语句', () => {
    expect(assertReadOnly('   ')).toContain('不能为空');
  });
});

describe('assertReadOnly（Kingbase）', () => {
  it('放行带双引号的 SELECT / WITH', () => {
    expect(
      assertReadOnly(
        'SELECT "ProductCode" FROM public."WMS_Stocks" WHERE "IsDeleted" = false LIMIT 10',
        'kingbase',
      ),
    ).toBeNull();
    expect(
      assertReadOnly('WITH x AS (SELECT 1 AS a) SELECT * FROM x', 'kingbase'),
    ).toBeNull();
  });

  it('拦截写操作、DDL、危险函数', () => {
    expect(assertReadOnly('DELETE FROM public."WMS_Stocks"', 'kingbase')).toContain('仅允许');
    expect(assertReadOnly('SELECT pg_sleep(10)', 'kingbase')).toContain('pg_sleep');
    expect(assertReadOnly("SELECT set_config('x','y',false)", 'kingbase')).toContain(
      'set_config',
    );
    expect(assertReadOnly("SELECT nextval('seq')", 'kingbase')).toContain('nextval');
    expect(assertReadOnly("SELECT * FROM dblink('x','y') AS t(a int)", 'kingbase')).toContain(
      'dblink',
    );
    expect(assertReadOnly('COPY t TO STDOUT', 'kingbase')).toContain('仅允许');
  });

  it('拦截数据修改型 CTE 和 FOR UPDATE', () => {
    expect(
      assertReadOnly(
        'WITH x AS (DELETE FROM public."WMS_Stocks" RETURNING *) SELECT * FROM x',
        'kingbase',
      ),
    ).toContain('delete');
    expect(
      assertReadOnly('SELECT * FROM public."WMS_Stocks" FOR UPDATE', 'kingbase'),
    ).toContain('FOR UPDATE');
  });

  it('拦截 blockedTables（双引号写法）', () => {
    expect(
      assertReadOnly(
        'SELECT * FROM public."ID_Users"',
        'kingbase',
        ['ID_Users', 'AbpTenantConnectionStrings'],
      ),
    ).toContain('不允许查询表');
  });

  it('SQL Server 的 blockedTables 支持 [ ] 写法', () => {
    expect(
      assertReadOnly('SELECT * FROM [dbo].[ID_Users]', 'sqlserver', ['ID_Users']),
    ).toContain('不允许查询表');
  });

  it('拦截 U& 转义和 SQL Server 专属写法', () => {
    expect(assertReadOnly('SELECT U&"\\0073et_config"(\'x\')', 'kingbase')).toContain('U&');
    expect(assertReadOnly('SELECT TOP 10 * FROM public."WMS_Stocks"', 'kingbase')).toContain(
      'LIMIT',
    );
    expect(assertReadOnly('SELECT GETDATE()', 'kingbase')).toContain('now()');
  });

  it('字符串字面量里的关键字不误杀', () => {
    expect(assertReadOnly("SELECT 'delete' AS word", 'kingbase')).toBeNull();
    expect(assertReadOnly("SELECT '-- not a comment' AS word", 'kingbase')).toBeNull();
    expect(assertReadOnly("SELECT ';' AS word", 'kingbase')).toBeNull();
  });

  it('金仓不做 N 前缀转换', () => {
    expect(normalizeUnicodeLiterals("WHERE c = '北京'", 'kingbase')).toBe("WHERE c = '北京'");
  });
});

describe('normalizeUnicodeLiterals', () => {
  it('给含非 ASCII 的字面量补 N 前缀', () => {
    expect(normalizeUnicodeLiterals("WHERE c = '北京'")).toBe("WHERE c = N'北京'");
  });

  it('已有 N 前缀不重复添加', () => {
    expect(normalizeUnicodeLiterals("WHERE c = N'北京'")).toBe("WHERE c = N'北京'");
  });

  it('纯 ASCII 字面量保持不变', () => {
    expect(normalizeUnicodeLiterals("WHERE c = 'abc'")).toBe("WHERE c = 'abc'");
  });

  it('不破坏转义单引号', () => {
    expect(normalizeUnicodeLiterals("WHERE c = 'a''b'")).toBe("WHERE c = 'a''b'");
  });
});
