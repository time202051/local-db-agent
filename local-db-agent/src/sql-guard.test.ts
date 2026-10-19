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
