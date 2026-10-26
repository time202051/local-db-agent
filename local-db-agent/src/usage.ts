/**
 * Token / 成本统计。
 *
 * - 从 LangChain 的 usage_metadata（以及 DeepSeek 的原始响应字段）提取
 *   input / output / cache_read / cache_creation。
 * - 按可配置单价估算费用（默认按 deepseek-chat 的公开价格）。
 * - 维护按 conversationId 的日内预算账本（内存，重启清零）。
 */

export interface TokenPrices {
  /** 每 100 万 input token（缓存未命中）的价格 */
  inputMissPerMillion: number;
  /** 每 100 万 input token（缓存命中）的价格 */
  inputHitPerMillion: number;
  /** 每 100 万 output token 的价格 */
  outputPerMillion: number;
}

export const DEFAULT_TOKEN_PRICES: TokenPrices = {
  inputMissPerMillion: 0.27,
  inputHitPerMillion: 0.07,
  outputPerMillion: 1.1,
};

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cost: number;
}

interface RawUsageLike {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_token_details?: {
    cache_read?: number;
    cache_creation?: number;
    cached_tokens?: number;
  };
}

interface RawMetadataLike {
  tokenUsage?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function pickNumber(source: unknown, keys: string[]): number {
  if (!source || typeof source !== 'object') return 0;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

/**
 * 从 LangChain AIMessage.usage_metadata + response_metadata 提取用量。
 * 不同 provider 字段名不同，这里做兼容；取不到就返回 0。
 */
export function extractUsage(usageMetadata?: unknown, responseMetadata?: unknown): ModelUsage {
  const usage = (usageMetadata || {}) as RawUsageLike;
  const details = usage.input_token_details || {};
  const meta = (responseMetadata || {}) as RawMetadataLike;

  const inputTokens = toNumber(usage.input_tokens);
  const outputTokens = toNumber(usage.output_tokens);

  let cacheReadTokens = toNumber(details.cache_read) || toNumber(details.cached_tokens);
  let cacheCreationTokens = toNumber(details.cache_creation);

  // DeepSeek 原生字段：prompt_cache_hit_tokens / prompt_cache_miss_tokens
  if (!cacheReadTokens) {
    cacheReadTokens =
      toNumber(meta.prompt_cache_hit_tokens) ||
      pickNumber(meta.tokenUsage, ['prompt_cache_hit_tokens', 'cache_read_input_tokens']) ||
      pickNumber(meta.usage, ['prompt_cache_hit_tokens', 'cache_read_input_tokens']);
  }
  if (!cacheCreationTokens) {
    cacheCreationTokens = pickNumber(meta.tokenUsage, ['cache_creation_input_tokens']);
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens: Math.min(cacheReadTokens, inputTokens || cacheReadTokens),
    cacheCreationTokens,
  };
}

/** 按单价估算费用（美元）。 */
export function estimateCost(
  usage: ModelUsage,
  prices: TokenPrices = DEFAULT_TOKEN_PRICES,
): number {
  const input = Math.max(0, usage.inputTokens);
  const cacheRead = Math.min(Math.max(0, usage.cacheReadTokens), input);
  const miss = Math.max(0, input - cacheRead);
  const output = Math.max(0, usage.outputTokens);
  const cost =
    (miss * prices.inputMissPerMillion +
      cacheRead * prices.inputHitPerMillion +
      output * prices.outputPerMillion) /
    1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function totalTokens(usage: { inputTokens: number; outputTokens: number }): number {
  return usage.inputTokens + usage.outputTokens;
}

interface LedgerEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cost: number;
  updatedAt: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LEDGER_ENTRIES = 500;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 按会话的日预算账本。
 * 进程内保存；重启后清零。匿名请求共用 anonymous。
 */
export class UsageLedger {
  private readonly entries = new Map<string, LedgerEntry>();

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.updatedAt > 7 * DAY_MS) this.entries.delete(key);
    }
    if (this.entries.size > MAX_LEDGER_ENTRIES) {
      const sorted = [...this.entries.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      for (const [key] of sorted.slice(0, this.entries.size - MAX_LEDGER_ENTRIES)) {
        this.entries.delete(key);
      }
    }
  }

  private entry(key: string): LedgerEntry {
    this.cleanup();
    const day = today();
    const existing = this.entries.get(key);
    if (existing && existing.date === day) return existing;
    const fresh: LedgerEntry = {
      date: day,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      cost: 0,
      updatedAt: Date.now(),
    };
    this.entries.set(key, fresh);
    return fresh;
  }

  /** 检查今日额度；返回 null 表示放行，否则返回给用户看的提示。 */
  check(key: string, limit: number): string | null {
    if (!Number.isFinite(limit) || limit <= 0) return null;
    const entry = this.entry(key);
    const used = entry.inputTokens + entry.outputTokens;
    if (used < limit) return null;
    return (
      `今日分析额度已用完（${used}/${limit} tokens）。` +
      '请明天再试，或让管理员在 limits 里调高 maxDailyTokens。'
    );
  }

  record(key: string, usage: ModelUsage, cost: number): void {
    const entry = this.entry(key);
    entry.inputTokens += usage.inputTokens;
    entry.outputTokens += usage.outputTokens;
    entry.cacheReadTokens += usage.cacheReadTokens;
    entry.cacheCreationTokens += usage.cacheCreationTokens;
    entry.cost += cost;
    entry.updatedAt = Date.now();
  }

  summary(key: string): { usedTokens: number; cost: number; date: string } {
    const entry = this.entry(key);
    return {
      usedTokens: entry.inputTokens + entry.outputTokens,
      cost: Math.round(entry.cost * 1_000_000) / 1_000_000,
      date: entry.date,
    };
  }

  reset(): void {
    this.entries.clear();
  }
}

let ledger: UsageLedger | undefined;

export function getUsageLedger(): UsageLedger {
  if (!ledger) ledger = new UsageLedger();
  return ledger;
}

/** 把 token 数格式化成紧凑字符串，便于日志。 */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}
