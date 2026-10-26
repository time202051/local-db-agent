import { describe, expect, it } from 'vitest';
import { DEFAULT_TOKEN_PRICES, estimateCost, extractUsage, UsageLedger } from './usage.js';

describe('extractUsage', () => {
  it('读取 LangChain usage_metadata 的 cache_read / cache_creation', () => {
    const usage = extractUsage(
      {
        input_tokens: 1000,
        output_tokens: 200,
        input_token_details: { cache_read: 600, cache_creation: 50 },
      },
      undefined,
    );
    expect(usage).toEqual({
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 600,
      cacheCreationTokens: 50,
    });
  });

  it('回退读取 DeepSeek 原始字段', () => {
    const usage = extractUsage(
      { input_tokens: 800, output_tokens: 100 },
      { tokenUsage: { prompt_cache_hit_tokens: 300 } },
    );
    expect(usage.cacheReadTokens).toBe(300);
    expect(usage.outputTokens).toBe(100);
  });

  it('cache_read 不会超过 input', () => {
    const usage = extractUsage(
      { input_tokens: 100, output_tokens: 10, input_token_details: { cache_read: 999 } },
      undefined,
    );
    expect(usage.cacheReadTokens).toBe(100);
  });
});

describe('estimateCost', () => {
  it('按命中/未命中/输出分别计价', () => {
    const cost = estimateCost(
      {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 400_000,
        cacheCreationTokens: 0,
      },
      DEFAULT_TOKEN_PRICES,
    );
    // 600k * 0.27 + 400k * 0.07 + 1M * 1.1 = 0.162 + 0.028 + 1.1
    expect(cost).toBeCloseTo(1.29, 6);
  });
});

describe('UsageLedger', () => {
  it('累计用量并在超限时返回提示', () => {
    const ledger = new UsageLedger();
    ledger.record(
      'c1',
      { inputTokens: 600, outputTokens: 400, cacheReadTokens: 0, cacheCreationTokens: 0 },
      0.1,
    );
    expect(ledger.check('c1', 2000)).toBeNull();
    ledger.record(
      'c1',
      { inputTokens: 600, outputTokens: 400, cacheReadTokens: 0, cacheCreationTokens: 0 },
      0.1,
    );
    expect(ledger.check('c1', 1500)).toContain('额度已用完');
    expect(ledger.summary('c1').usedTokens).toBe(2000);
    expect(ledger.check('c2', 1500)).toBeNull();
  });

  it('reset 清空账本', () => {
    const ledger = new UsageLedger();
    ledger.record(
      'c1',
      { inputTokens: 10, outputTokens: 10, cacheReadTokens: 0, cacheCreationTokens: 0 },
      0,
    );
    ledger.reset();
    expect(ledger.summary('c1').usedTokens).toBe(0);
  });
});
