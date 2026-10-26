/**
 * Token / 成本统计。
 *
 * - 从 LangChain 的 usage_metadata（以及 DeepSeek 的原始响应字段）提取
 *   input / output / cache_read / cache_creation。
 * - 按可配置单价估算费用（默认按 deepseek-chat 的公开价格）。
 * - 维护按 conversationId 的日内预算账本（内存，重启清零）。
 */
export const DEFAULT_TOKEN_PRICES = {
    inputMissPerMillion: 0.27,
    inputHitPerMillion: 0.07,
    outputPerMillion: 1.1,
};
function toNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
function pickNumber(source, keys) {
    if (!source || typeof source !== 'object')
        return 0;
    const record = source;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
    }
    return 0;
}
/**
 * 从 LangChain AIMessage.usage_metadata + response_metadata 提取用量。
 * 不同 provider 字段名不同，这里做兼容；取不到就返回 0。
 */
export function extractUsage(usageMetadata, responseMetadata) {
    const usage = (usageMetadata || {});
    const details = usage.input_token_details || {};
    const meta = (responseMetadata || {});
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
export function estimateCost(usage, prices = DEFAULT_TOKEN_PRICES) {
    const input = Math.max(0, usage.inputTokens);
    const cacheRead = Math.min(Math.max(0, usage.cacheReadTokens), input);
    const miss = Math.max(0, input - cacheRead);
    const output = Math.max(0, usage.outputTokens);
    const cost = (miss * prices.inputMissPerMillion +
        cacheRead * prices.inputHitPerMillion +
        output * prices.outputPerMillion) /
        1_000_000;
    return Math.round(cost * 1_000_000) / 1_000_000;
}
export function totalTokens(usage) {
    return usage.inputTokens + usage.outputTokens;
}
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LEDGER_ENTRIES = 500;
function today() {
    return new Date().toISOString().slice(0, 10);
}
/**
 * 按会话的日预算账本。
 * 进程内保存；重启后清零。匿名请求共用 anonymous。
 */
export class UsageLedger {
    entries = new Map();
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.entries) {
            if (now - entry.updatedAt > 7 * DAY_MS)
                this.entries.delete(key);
        }
        if (this.entries.size > MAX_LEDGER_ENTRIES) {
            const sorted = [...this.entries.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
            for (const [key] of sorted.slice(0, this.entries.size - MAX_LEDGER_ENTRIES)) {
                this.entries.delete(key);
            }
        }
    }
    entry(key) {
        this.cleanup();
        const day = today();
        const existing = this.entries.get(key);
        if (existing && existing.date === day)
            return existing;
        const fresh = {
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
    check(key, limit) {
        if (!Number.isFinite(limit) || limit <= 0)
            return null;
        const entry = this.entry(key);
        const used = entry.inputTokens + entry.outputTokens;
        if (used < limit)
            return null;
        return (`今日分析额度已用完（${used}/${limit} tokens）。` +
            '请明天再试，或让管理员在 limits 里调高 maxDailyTokens。');
    }
    record(key, usage, cost) {
        const entry = this.entry(key);
        entry.inputTokens += usage.inputTokens;
        entry.outputTokens += usage.outputTokens;
        entry.cacheReadTokens += usage.cacheReadTokens;
        entry.cacheCreationTokens += usage.cacheCreationTokens;
        entry.cost += cost;
        entry.updatedAt = Date.now();
    }
    summary(key) {
        const entry = this.entry(key);
        return {
            usedTokens: entry.inputTokens + entry.outputTokens,
            cost: Math.round(entry.cost * 1_000_000) / 1_000_000,
            date: entry.date,
        };
    }
    reset() {
        this.entries.clear();
    }
}
let ledger;
export function getUsageLedger() {
    if (!ledger)
        ledger = new UsageLedger();
    return ledger;
}
/** 把 token 数格式化成紧凑字符串，便于日志。 */
export function formatTokens(value) {
    if (value >= 1_000_000)
        return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000)
        return `${(value / 1_000).toFixed(1)}K`;
    return String(Math.round(value));
}
