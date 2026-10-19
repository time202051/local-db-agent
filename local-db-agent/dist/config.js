import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const currentDir = dirname(fileURLToPath(import.meta.url));
function loadDotEnv(path) {
    let content;
    try {
        content = readFileSync(path, 'utf8');
    }
    catch {
        return;
    }
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const separator = line.indexOf('=');
        if (separator === -1)
            continue;
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}
loadDotEnv(resolve(currentDir, '..', '.env'));
/**
 * agent 端唯一需要配置的东西：服务端口 / 监听地址。
 * 数据库、大模型、保护参数 全部由前端在注册组件时下发，agent 端不读任何相关配置。
 */
export const serverConfig = {
    port: Number(process.env.PORT ?? 52310),
    host: process.env.HOST ?? '127.0.0.1',
};
/** 内置安全兜底（前端不传 limits 时使用；不需要在 agent 端配置）。 */
const DEFAULTS = {
    dbMaxRows: 200,
    dbCommandTimeoutSec: 15,
    dbCostLimit: 30,
    llmBaseUrl: 'https://api.deepseek.com/v1',
    llmModel: 'deepseek-chat',
    llmTimeoutSec: 60,
    recursionLimit: 12,
    turnTimeoutSec: 120,
    maxConcurrent: 3,
    summaryTriggerTokens: 6000,
    summaryKeepMessages: 12,
};
/** 配置错误：消息面向用户、不含密码等敏感信息 */
export class ConfigError extends Error {
}
function num(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
/** ODBC 值转义：含 ; { } 等字符时用大括号包裹 */
function odbcValue(value) {
    return '{' + value.replace(/\}/g, '}}') + '}';
}
/** 由离散字段拼出 ODBC 连接串 */
function buildOdbcString(db) {
    const driver = (db.driver ?? 'ODBC Driver 17 for SQL Server').trim();
    const parts = [`Driver={${driver}}`];
    if (db.server)
        parts.push(`Server=${odbcValue(db.server)}`);
    if (db.database)
        parts.push(`Database=${odbcValue(db.database)}`);
    if (db.trusted) {
        parts.push('Trusted_Connection=Yes');
    }
    else {
        if (db.user)
            parts.push(`Uid=${odbcValue(db.user)}`);
        if (db.password !== undefined)
            parts.push(`Pwd=${odbcValue(db.password)}`);
    }
    if (typeof db.encrypt === 'boolean')
        parts.push(`Encrypt=${db.encrypt ? 'Yes' : 'No'}`);
    parts.push('TrustServerCertificate=Yes');
    return parts.join(';') + ';';
}
function hasAnyDbField(db) {
    return Boolean(db.connectionString || db.server || db.database || db.user || db.password || db.trusted);
}
function hashKey(input) {
    return createHash('sha1').update(input).digest('hex');
}
/**
 * 校验并归一化前端下发的配置（数据库和大模型都必须由前端提供）。
 * agent 端不再有任何数据库/大模型默认值。
 */
export function resolveRequestConfig(raw) {
    const input = raw ?? {};
    const dbInput = input.db ?? {};
    const llmInput = input.llm ?? {};
    const lim = input.limits ?? {};
    // ---- 数据库（必填，前端下发）----
    let connectionString;
    if (dbInput.connectionString && dbInput.connectionString.trim()) {
        connectionString = dbInput.connectionString.trim();
    }
    else if (hasAnyDbField(dbInput)) {
        if (!dbInput.server || !dbInput.database) {
            throw new ConfigError('数据库配置不完整：至少需要 server（地址）和 database（库名）');
        }
        if (!dbInput.trusted && !dbInput.user) {
            throw new ConfigError('数据库配置不完整：非集成认证时需提供 user（用户名）和 password（密码）');
        }
        if (!/^[\x21-\x7E]+$/.test(dbInput.server.trim())) {
            throw new ConfigError('数据库地址格式不正确（server 不能含中文/全角字符/空格）');
        }
        connectionString = buildOdbcString(dbInput);
    }
    else {
        throw new ConfigError('缺少数据库配置：请在注册组件时传入 db（server/database/user/password 或 connectionString）');
    }
    // ---- 大模型（必填 apiKey，前端下发）----
    const apiKey = (llmInput.apiKey && llmInput.apiKey.trim()) || '';
    if (!apiKey) {
        throw new ConfigError('缺少大模型密钥：请在注册组件时传入 llm.apiKey');
    }
    if (!/^[\x21-\x7E]+$/.test(apiKey)) {
        throw new ConfigError('大模型密钥格式不正确（含非 ASCII 字符，请检查 llm.apiKey，勿含中文/空格）');
    }
    const baseUrl = (llmInput.baseUrl && llmInput.baseUrl.trim()) || DEFAULTS.llmBaseUrl;
    const model = (llmInput.model && llmInput.model.trim()) || DEFAULTS.llmModel;
    const requestTimeoutMs = Math.max(1, num(lim.commandTimeoutSec, DEFAULTS.dbCommandTimeoutSec)) * 1000;
    const db = {
        connectionString,
        requestTimeoutMs,
        costLimit: Math.max(0, num(lim.costLimit, DEFAULTS.dbCostLimit)),
        maxRows: Math.max(1, num(lim.maxRows, DEFAULTS.dbMaxRows)),
    };
    const llm = {
        apiKey,
        baseUrl,
        model,
        timeoutMs: Math.max(1, num(lim.llmTimeoutSec, DEFAULTS.llmTimeoutSec)) * 1000,
    };
    const recursionLimit = Math.max(1, num(lim.recursionLimit, DEFAULTS.recursionLimit));
    const turnTimeoutMs = Math.max(1, num(lim.turnTimeoutSec, DEFAULTS.turnTimeoutSec)) * 1000;
    const maxConcurrent = Math.max(1, num(lim.maxConcurrent, DEFAULTS.maxConcurrent));
    const summaryTriggerTokens = Math.max(500, num(lim.summaryTriggerTokens, DEFAULTS.summaryTriggerTokens));
    const summaryKeepMessages = Math.max(1, num(lim.summaryKeepMessages, DEFAULTS.summaryKeepMessages));
    const key = hashKey(JSON.stringify({ db, llm, recursionLimit, summaryTriggerTokens, summaryKeepMessages }));
    return {
        db,
        llm,
        recursionLimit,
        turnTimeoutMs,
        maxConcurrent,
        summaryTriggerTokens,
        summaryKeepMessages,
        key,
    };
}
/** 描述某个库连接（脱敏）：只给地址/库名/用户，绝不输出密码 */
export function describeDb(db) {
    const m = /Server=([^;]+)/i.exec(db.connectionString);
    const d = /Database=([^;]+)/i.exec(db.connectionString);
    const u = /(?:Uid|User Id)=([^;]+)/i.exec(db.connectionString);
    const server = m ? m[1].replace(/[{}]/g, '') : '?';
    const database = d ? d[1].replace(/[{}]/g, '') : '?';
    const user = u ? u[1].replace(/[{}]/g, '') : '(集成认证)';
    return `${server} / ${database} / ${user}`;
}
