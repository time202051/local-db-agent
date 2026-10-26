import { describe, expect, it } from 'vitest';
import { TurnBudget } from './budget.js';
import { DEFAULT_TOKEN_PRICES } from './usage.js';

const usage = {
  inputTokens: 60,
  outputTokens: 50,
  cacheReadTokens: 20,
  cacheCreationTokens: 0,
};

function budget(extra: { maxTurnTokens?: number; maxModelCalls?: number } = {}): TurnBudget {
  return new TurnBudget({
    maxSqlQueries: 6,
    maxSchemaCalls: 4,
    maxResultChars: 8000,
    maxTotalToolChars: 24000,
    maxTurnTokens: extra.maxTurnTokens,
    maxModelCalls: extra.maxModelCalls,
  });
}

describe('TurnBudget 成本', () => {
  it('记录 token、缓存和费用', () => {
    const b = budget();
    b.recordModelUsage(usage, DEFAULT_TOKEN_PRICES);
    expect(b.usage.modelCalls).toBe(1);
    expect(b.usage.inputTokens).toBe(60);
    expect(b.usage.outputTokens).toBe(50);
    expect(b.usage.cacheReadTokens).toBe(20);
    expect(b.usage.cost).toBeGreaterThan(0);
    expect(b.tokenTotal()).toBe(110);
    expect(b.summary()).toContain('tokens=60+50');
  });

  it('超过 token 上限时返回收尾提示', () => {
    const b = budget({ maxTurnTokens: 100, maxModelCalls: 5 });
    b.recordModelUsage(usage, DEFAULT_TOKEN_PRICES);
    expect(b.checkModelBudget()).toContain('成本上限');
  });

  it('超过模型调用次数时返回收尾提示', () => {
    const b = budget({ maxTurnTokens: 10000, maxModelCalls: 1 });
    b.recordModelUsage(usage, DEFAULT_TOKEN_PRICES);
    expect(b.checkModelBudget()).toContain('调用次数');
  });

  it('记录查询结果供数值对账', () => {
    const b = budget();
    b.recordQueryResult('q-1', ['qty'], [[1000]]);
    expect(b.queryResults.get('q-1')?.rows).toEqual([[1000]]);
  });
});
