import { describe, expect, it } from 'vitest';
import { TurnBudget } from './budget.js';
import { normalizeNumber, validateCoverageNumbers } from './report-check.js';

function budget(): TurnBudget {
  return new TurnBudget({
    maxSqlQueries: 6,
    maxSchemaCalls: 4,
    maxResultChars: 8000,
    maxTotalToolChars: 24000,
  });
}

describe('normalizeNumber', () => {
  it('支持逗号、万、亿', () => {
    expect(normalizeNumber('1,234.5')).toBe(1234.5);
    expect(normalizeNumber('1.2万')).toBe(12000);
    expect(normalizeNumber(1.2, '亿')).toBe(120000000);
  });

  it('百分比视为派生值', () => {
    expect(normalizeNumber('98.5%')).toBeNull();
    expect(normalizeNumber(98.5, '%')).toBeNull();
  });
});

describe('validateCoverageNumbers', () => {
  it('能匹配直接数值和格式化数值', () => {
    const b = budget();
    b.recordQueryResult(
      'q-1',
      ['qty', 'amount'],
      [
        [1000, 120000000],
        [12000, 500],
      ],
    );
    const result = validateCoverageNumbers(
      [
        { item: '库存总量', status: 'ok', value: 1000, source: 'q-1' },
        { item: '库存金额', status: 'ok', value: '1.2亿', source: 'q-1' },
        { item: '入库量', status: 'ok', value: 1.2, unit: '万', source: 'q-1' },
      ],
      b,
    );
    expect(result.checked).toBe(3);
    expect(result.matched).toBe(3);
    expect(result.mismatches).toHaveLength(0);
  });

  it('数值不在结果里时给出 mismatch', () => {
    const b = budget();
    b.recordQueryResult('q-1', ['qty'], [[1000]]);
    const result = validateCoverageNumbers(
      [{ item: '库存总量', status: 'ok', value: 999, source: 'q-1' }],
      b,
    );
    expect(result.mismatches[0]).toContain('库存总量');
  });

  it('百分比跳过，来源可疑只告警', () => {
    const b = budget();
    b.recordQueryResult('q-1', ['rate'], [[98.5]]);
    const result = validateCoverageNumbers(
      [{ item: '及时率', status: 'ok', value: 98.5, unit: '%', source: '随手写的' }],
      b,
    );
    expect(result.skipped).toBe(1);
    expect(result.warnings[0]).toContain('来源');
  });
});
