import { AsyncLocalStorage } from 'node:async_hooks';
import { estimateCost, totalTokens } from './usage.js';
import type { ModelUsage, TokenPrices } from './usage.js';

/**
 * 单轮对话预算。
 *
 * 数据库是海量数据，模型可能反复查询；这里在服务端硬性限制：
 * - 单轮 SQL 查询次数
 * - 单轮表结构查询次数
 * - 单次/单轮工具输出字符数
 *
 * 达到上限时**不抛错**，而是返回一段提示，让模型基于已有结果收尾，
 * 避免 LangChain 把错误转成工具消息后触发无限重试。
 */
export interface BudgetLimits {
  maxSqlQueries: number;
  maxSchemaCalls: number;
  maxResultChars: number;
  maxTotalToolChars: number;
  /** 本轮 input+output token 上限；不传则不限制 */
  maxTurnTokens?: number;
  /** 本轮模型调用次数上限；不传则不限制 */
  maxModelCalls?: number;
  /** 报告数值对账是否阻断（默认只告警） */
  strictNumberCheck?: boolean;
}

export interface BudgetUsage {
  sqlQueries: number;
  schemaCalls: number;
  totalChars: number;
  exceeded: string[];
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cost: number;
  modelCalls: number;
}

export class TurnBudget {
  readonly limits: BudgetLimits;
  readonly usage: BudgetUsage = {
    sqlQueries: 0,
    schemaCalls: 0,
    totalChars: 0,
    exceeded: [],
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    cost: 0,
    modelCalls: 0,
  };
  readonly startedAt = Date.now();
  /** 本轮 SQL 结果，供报告数值对账使用。key 为 queryId（多查询带 #序号）。 */
  readonly queryResults = new Map<string, { columns: string[]; rows: unknown[][] }>();
  /** 同一轮内 list_tables 结果缓存：模型重复调用时直接复用，不再花一次模型往返去重查。 */
  readonly schemaCache = new Map<string, string>();
  /** 同一轮内是否已经返回过“全量表清单”，用于去掉重复的大 JSON。 */
  fullListServed = false;
  /** 同一轮内 get_table_schema 结果缓存（按表名）。 */
  readonly tableSchemaCache = new Map<string, string>();
  /** 报告轮已经给过一次“优先出报告”的软提示。 */
  reportNudgeServed = false;
  /** 报告轮不按 SQL/Schema 条数限制，只靠 120 秒超时和覆盖率门禁。 */
  readonly unlimitedQueries: boolean;

  constructor(limits: BudgetLimits, options: { unlimitedQueries?: boolean } = {}) {
    this.limits = limits;
    this.unlimitedQueries = options.unlimitedQueries === true;
  }

  /** 给模型看的剩余预算；无限模式不返回剩余，避免模型误以为要按条数收尾。 */
  remaining(): { remainingSql?: number; remainingSchema?: number } {
    if (this.unlimitedQueries) return {};
    return {
      remainingSql: Math.max(0, this.limits.maxSqlQueries - this.usage.sqlQueries),
      remainingSchema: Math.max(0, this.limits.maxSchemaCalls - this.usage.schemaCalls),
    };
  }

  /** 记录一次模型调用的用量；由 cost-guard 中间件调用。 */
  recordModelUsage(usage: ModelUsage, prices: TokenPrices): void {
    this.usage.inputTokens += usage.inputTokens;
    this.usage.outputTokens += usage.outputTokens;
    this.usage.cacheReadTokens += usage.cacheReadTokens;
    this.usage.cacheCreationTokens += usage.cacheCreationTokens;
    this.usage.cost += estimateCost(usage, prices);
    this.usage.modelCalls += 1;
  }

  /** 本轮 token 总量。 */
  tokenTotal(): number {
    return this.usage.inputTokens + this.usage.outputTokens;
  }

  /**
   * 模型调用前检查成本预算；返回 null 表示放行，否则返回给模型/用户的收尾提示。
   * 默认值足够跑完一次报告，只有异常循环才会触发。
   */
  checkModelBudget(): string | null {
    const maxCalls = this.limits.maxModelCalls;
    if (typeof maxCalls === 'number' && this.usage.modelCalls >= maxCalls) {
      const reason =
        `本轮模型调用次数已达上限（${maxCalls} 次）。` +
        '请基于已有结果直接回答；如果还没完成，请缩小范围后重试。';
      this.deny(reason);
      return reason;
    }
    const maxTokens = this.limits.maxTurnTokens;
    if (typeof maxTokens === 'number' && this.tokenTotal() >= maxTokens) {
      const reason =
        `本轮分析已达到成本上限（${totalTokens(this.usage)} tokens）。` +
        '请基于已有结果直接回答；未完成的部分请缩小范围后重试。';
      this.deny(reason);
      return reason;
    }
    return null;
  }

  /** 记录一条 SQL 结果，供报告数值对账。 */
  recordQueryResult(queryId: string, columns: string[], rows: unknown[][]): void {
    if (!queryId) return;
    this.queryResults.set(queryId, { columns, rows });
    if (this.queryResults.size > 30) {
      const oldest = this.queryResults.keys().next().value;
      if (oldest) this.queryResults.delete(oldest);
    }
  }

  /** 申请一次 SQL 查询；返回 null 表示放行，否则返回给模型看的提示。 */
  takeSqlQuery(): string | null {
    if (!this.unlimitedQueries && this.usage.sqlQueries >= this.limits.maxSqlQueries) {
      return this.deny(
        `本次分析的 SQL 查询次数已达上限（${this.limits.maxSqlQueries} 次）。` +
          '请基于已有查询结果继续，并在报告 coverage 中如实标注未取到的数据。',
      );
    }
    this.usage.sqlQueries += 1;
    return null;
  }

  /** 申请一次表结构查询（list_tables / get_table_schema）。 */
  takeSchemaCall(): string | null {
    if (!this.unlimitedQueries && this.usage.schemaCalls >= this.limits.maxSchemaCalls) {
      return this.deny(
        `本次分析的表结构查询次数已达上限（${this.limits.maxSchemaCalls} 次）。` +
          '请用已经了解到的字段继续，或者直接向用户说明无法继续查询。',
      );
    }
    this.usage.schemaCalls += 1;
    return null;
  }

  /** 申请输出 chars 个字符；返回 null 表示放行，否则返回提示。 */
  takeChars(chars: number): string | null {
    if (chars <= 0) return null;
    if (this.usage.totalChars + chars > this.limits.maxTotalToolChars) {
      return this.deny(
        '本次分析的工具返回内容总量已达上限。' +
          '请直接基于已有信息回答或生成报告；如果需要更细的数据，请用 SQL 聚合（GROUP BY / SUM / COUNT）而不是继续拉明细。',
      );
    }
    this.usage.totalChars += chars;
    return null;
  }

  /** 报告轮达到建议查询量后，只提示一次“优先出报告”，不拦截。 */
  takeReportNudge(): string | null {
    if (!this.unlimitedQueries || this.reportNudgeServed) return null;
    if (this.usage.sqlQueries < 12) return null;
    this.reportNudgeServed = true;
    return (
      '报告轮已执行 12 条 SQL。数据足够时请优先出报告；' +
      '未取到的项在 coverage 标 missing/needs_review，不要为了补全反复探索。'
    );
  }

  private deny(reason: string): string {
    if (!this.usage.exceeded.includes(reason)) this.usage.exceeded.push(reason);
    return reason;
  }

  summary(): string {
    const elapsed = ((Date.now() - this.startedAt) / 1000).toFixed(1);
    const sqlLimit = this.unlimitedQueries ? '∞' : String(this.limits.maxSqlQueries);
    const schemaLimit = this.unlimitedQueries ? '∞' : String(this.limits.maxSchemaCalls);
    const cacheRate =
      this.usage.inputTokens > 0
        ? `${Math.round((this.usage.cacheReadTokens / this.usage.inputTokens) * 100)}%`
        : '0%';
    return (
      `queries=${this.usage.sqlQueries}/${sqlLimit} ` +
      `schema=${this.usage.schemaCalls}/${schemaLimit} ` +
      `chars=${this.usage.totalChars}/${this.limits.maxTotalToolChars} ` +
      `calls=${this.usage.modelCalls} ` +
      `tokens=${this.usage.inputTokens}+${this.usage.outputTokens} ` +
      `cache=${cacheRate} cost=${this.usage.cost.toFixed(4)} ` +
      `elapsed=${elapsed}s`
    );
  }
}

const storage = new AsyncLocalStorage<TurnBudget>();

export function runWithBudget<T>(budget: TurnBudget, fn: () => Promise<T>): Promise<T> {
  return storage.run(budget, fn);
}

export function currentBudget(): TurnBudget | undefined {
  return storage.getStore();
}

/** 预算超限时返回给模型的结构化结果（不是错误，不触发重试）。 */
export function budgetMessage(kind: string, reason: string): string {
  const budget = storage.getStore();
  return JSON.stringify({
    success: false,
    budget: kind,
    error: reason,
    hint: '不要重复调用工具，直接基于已有结果继续。',
    ...(budget ? budget.remaining() : {}),
  });
}
