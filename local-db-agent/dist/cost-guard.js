import { AIMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';
import { currentBudget } from './budget.js';
import { extractUsage } from './usage.js';
/** 成本预算超限：由 index.ts 转成用户可读的 SSE error。 */
export class BudgetExceededError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BudgetExceededError';
    }
}
/**
 * 每次模型调用前检查本轮 token/调用次数预算，调用后记录真实用量。
 *
 * 用 wrapModelCall 而不是 streamEvents 统计，是为了把 summarization 等
 * 内部模型调用也算进来（它们被 excludeTags 过滤，不会出现在 SSE 里）。
 */
export function costGuardMiddleware(prices) {
    return createMiddleware({
        name: 'CostGuardMiddleware',
        wrapModelCall: async (request, handler) => {
            const budget = currentBudget();
            if (budget) {
                const deny = budget.checkModelBudget();
                if (deny)
                    throw new BudgetExceededError(deny);
            }
            const response = await handler(request);
            if (budget && AIMessage.isInstance(response)) {
                budget.recordModelUsage(extractUsage(response.usage_metadata, response.response_metadata), prices);
            }
            return response;
        },
    });
}
