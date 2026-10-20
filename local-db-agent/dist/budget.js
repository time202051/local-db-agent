import { AsyncLocalStorage } from 'node:async_hooks';
export class TurnBudget {
    limits;
    usage = {
        sqlQueries: 0,
        schemaCalls: 0,
        totalChars: 0,
        exceeded: [],
    };
    startedAt = Date.now();
    constructor(limits) {
        this.limits = limits;
    }
    /** 申请一次 SQL 查询；返回 null 表示放行，否则返回给模型看的提示。 */
    takeSqlQuery() {
        if (this.usage.sqlQueries >= this.limits.maxSqlQueries) {
            return this.deny(`本次分析的 SQL 查询次数已达上限（${this.limits.maxSqlQueries} 次）。` +
                '请基于已有查询结果直接生成报告，不要再查询数据库；不足的数据可以在报告里如实说明“未查询”。');
        }
        this.usage.sqlQueries += 1;
        return null;
    }
    /** 申请一次表结构查询（list_tables / get_table_schema）。 */
    takeSchemaCall() {
        if (this.usage.schemaCalls >= this.limits.maxSchemaCalls) {
            return this.deny(`本次分析的表结构查询次数已达上限（${this.limits.maxSchemaCalls} 次）。` +
                '请用已经了解到的字段继续，或者直接向用户说明无法继续查询。');
        }
        this.usage.schemaCalls += 1;
        return null;
    }
    /** 申请输出 chars 个字符；返回 null 表示放行，否则返回提示。 */
    takeChars(chars) {
        if (chars <= 0)
            return null;
        if (this.usage.totalChars + chars > this.limits.maxTotalToolChars) {
            return this.deny('本次分析的工具返回内容总量已达上限。' +
                '请直接基于已有信息回答或生成报告；如果需要更细的数据，请用 SQL 聚合（GROUP BY / TOP）而不是继续拉明细。');
        }
        this.usage.totalChars += chars;
        return null;
    }
    deny(reason) {
        if (!this.usage.exceeded.includes(reason))
            this.usage.exceeded.push(reason);
        return reason;
    }
    summary() {
        const elapsed = ((Date.now() - this.startedAt) / 1000).toFixed(1);
        return (`queries=${this.usage.sqlQueries}/${this.limits.maxSqlQueries} ` +
            `schema=${this.usage.schemaCalls}/${this.limits.maxSchemaCalls} ` +
            `chars=${this.usage.totalChars}/${this.limits.maxTotalToolChars} ` +
            `elapsed=${elapsed}s`);
    }
}
const storage = new AsyncLocalStorage();
export function runWithBudget(budget, fn) {
    return storage.run(budget, fn);
}
export function currentBudget() {
    return storage.getStore();
}
/** 预算超限时返回给模型的结构化结果（不是错误，不触发重试）。 */
export function budgetMessage(kind, reason) {
    return JSON.stringify({
        success: false,
        budget: kind,
        error: reason,
        hint: '不要重复调用工具，直接基于已有结果继续。',
    });
}
