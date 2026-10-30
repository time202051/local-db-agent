import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TOKEN_PRICES } from './usage.js';
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
    dbMaxRows: 500,
    dbCommandTimeoutSec: 60,
    dbCostLimit: 50,
    dbKingbasePort: 54321,
    llmBaseUrl: 'https://api.deepseek.com/v1',
    llmModel: 'deepseek-chat',
    llmTimeoutSec: 60,
    llmTemperature: 0.1,
    llmTopP: 0.9,
    recursionLimit: 30,
    turnTimeoutSec: 120,
    maxConcurrent: 3,
    // 报告优先保证数据完整；阈值提高，避免生成报告前把旧查询结果清掉。
    summaryTriggerTokens: 40000,
    summaryKeepMessages: 12,
    // 普通问答预算；报告轮在 index.ts 中不再按条数限制
    maxSqlQueries: 6,
    maxSchemaCalls: 4,
    maxResultChars: 8000,
    maxTotalToolChars: 24000,
    maxOutputTokens: 20000,
    // 成本兜底：默认值足够跑完一次完整报告（实测约 12 万），异常时自动收尾。
    maxTurnTokens: 150000,
    maxReportTurnTokens: 200000,
    maxDailyTokens: 2000000,
    maxModelCalls: 12,
    maxReportModelCalls: 16,
    maxPlanModelCalls: 24,
    maxPlanTurnTokens: 240000,
    planTurnTimeoutSec: 600,
    stepTimeoutSec: 240,
    enableSuggestions: true,
    enableClarify: true,
    strictNumberCheck: false,
    requireSqlApproval: false,
    enablePlanMode: true,
    maxPlanSteps: 8,
    maxRetriesPerStep: 2,
    maxReplans: 1,
    maxParallelSteps: 3,
    enableAccuracyCritic: true,
    maxCriticRounds: 1,
    intentGateTimeoutSec: 8,
};
/** 配置错误：消息面向用户、不含密码等敏感信息 */
export class ConfigError extends Error {
}
function num(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function normalizePrices(input) {
    const pick = (value, fallback) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
    return {
        inputMissPerMillion: pick(input?.inputMissPerMillion, DEFAULT_TOKEN_PRICES.inputMissPerMillion),
        inputHitPerMillion: pick(input?.inputHitPerMillion, DEFAULT_TOKEN_PRICES.inputHitPerMillion),
        outputPerMillion: pick(input?.outputPerMillion, DEFAULT_TOKEN_PRICES.outputPerMillion),
    };
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
    return Boolean(db.connectionString ||
        db.server ||
        db.host ||
        db.port ||
        db.database ||
        db.user ||
        db.password ||
        db.trusted);
}
function normalizeStringList(value, fallback) {
    if (!Array.isArray(value))
        return fallback;
    const list = value.map((item) => String(item).trim()).filter(Boolean);
    return list.length ? Array.from(new Set(list)) : fallback;
}
function hashKey(input) {
    return createHash('sha1').update(input).digest('hex');
}
function resolveSqlServerDb(dbInput, common) {
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
    return {
        type: 'sqlserver',
        connectionString,
        ...common,
    };
}
function resolveKingbaseDb(dbInput, common) {
    const rawHost = (dbInput.host ?? dbInput.server ?? '').trim();
    if (!rawHost) {
        throw new ConfigError('金仓数据库配置不完整：需要 host（地址）');
    }
    let host = rawHost;
    const portInput = typeof dbInput.port === 'number' ? dbInput.port : Number(dbInput.port);
    let port = Number.isFinite(portInput) ? portInput : NaN;
    // 兼容 server: "host,port" 的写法；显式 port 优先
    const hostPort = /^(.+?),(\d+)$/.exec(rawHost);
    if (hostPort) {
        host = hostPort[1].trim();
        if (!Number.isFinite(port))
            port = Number(hostPort[2]);
    }
    if (!Number.isFinite(port) || port <= 0)
        port = DEFAULTS.dbKingbasePort;
    port = Math.min(65535, Math.max(1, Math.floor(port)));
    if (!/^[\x21-\x7E]+$/.test(host)) {
        throw new ConfigError('数据库地址格式不正确（host 不能含中文/全角字符/空格）');
    }
    const database = (dbInput.database ?? '').trim();
    const user = (dbInput.user ?? '').trim();
    const password = dbInput.password ?? '';
    if (!database)
        throw new ConfigError('金仓数据库配置不完整：需要 database（库名）');
    if (!user)
        throw new ConfigError('金仓数据库配置不完整：需要 user（用户名）');
    if (!password)
        throw new ConfigError('金仓数据库配置不完整：需要 password（密码）');
    return {
        type: 'kingbase',
        host,
        port,
        database,
        user,
        password,
        ssl: dbInput.ssl === true,
        ...common,
    };
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
    const dbType = dbInput.type === 'kingbase' ? 'kingbase' : 'sqlserver';
    if (dbInput.type && dbInput.type !== 'sqlserver' && dbInput.type !== 'kingbase') {
        throw new ConfigError(`不支持的数据库类型：${String(dbInput.type)}（仅支持 sqlserver / kingbase）`);
    }
    const requestTimeoutMs = Math.max(1, num(lim.commandTimeoutSec, DEFAULTS.dbCommandTimeoutSec)) * 1000;
    const costLimit = Math.max(0, num(lim.costLimit, DEFAULTS.dbCostLimit));
    const maxRows = Math.max(1, num(lim.maxRows, DEFAULTS.dbMaxRows));
    // ---- 数据库（必填，前端下发）----
    // 这些字段 SQL Server / Kingbase 通用：展示范围、隐藏表、拦截表、业务提示词
    const common = {
        requestTimeoutMs,
        costLimit,
        maxRows,
        schemas: normalizeStringList(dbInput.schemas, dbType === 'kingbase' ? ['public'] : []),
        hiddenTables: normalizeStringList(dbInput.hiddenTables, []),
        blockedTables: normalizeStringList(dbInput.blockedTables, []),
        // 兼容旧页面；核心不再读取，业务知识改走 knowledge/
        profile: typeof dbInput.profile === 'string' ? dbInput.profile : 'generic',
        businessPrompt: typeof dbInput.businessPrompt === 'string'
            ? dbInput.businessPrompt.trim().slice(0, 8000)
            : '',
    };
    const db = dbType === 'kingbase'
        ? resolveKingbaseDb(dbInput, common)
        : resolveSqlServerDb(dbInput, common);
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
    const llm = {
        apiKey,
        baseUrl,
        model,
        timeoutMs: Math.max(1, num(lim.llmTimeoutSec, DEFAULTS.llmTimeoutSec)) * 1000,
        temperature: clamp(num(lim.temperature, DEFAULTS.llmTemperature), 0, 2),
        topP: clamp(num(lim.topP, DEFAULTS.llmTopP), 0.1, 1),
    };
    const recursionLimit = Math.max(1, num(lim.recursionLimit, DEFAULTS.recursionLimit));
    const turnTimeoutMs = Math.max(1, num(lim.turnTimeoutSec, DEFAULTS.turnTimeoutSec)) * 1000;
    const maxConcurrent = Math.max(1, num(lim.maxConcurrent, DEFAULTS.maxConcurrent));
    // 报告优先保证数据完整：低阈值会在生成报告前清掉旧查询结果
    const summaryTriggerTokens = Math.max(20000, num(lim.summaryTriggerTokens, DEFAULTS.summaryTriggerTokens));
    const summaryKeepMessages = Math.max(1, num(lim.summaryKeepMessages, DEFAULTS.summaryKeepMessages));
    const maxSqlQueries = Math.max(1, num(lim.maxSqlQueries, DEFAULTS.maxSqlQueries));
    const maxSchemaCalls = Math.max(1, num(lim.maxSchemaCalls, DEFAULTS.maxSchemaCalls));
    const maxResultChars = Math.max(1000, num(lim.maxResultChars, DEFAULTS.maxResultChars));
    const maxTotalToolChars = Math.max(2000, num(lim.maxTotalToolChars, DEFAULTS.maxTotalToolChars));
    const maxOutputTokens = Math.max(500, num(lim.maxOutputTokens, DEFAULTS.maxOutputTokens));
    const maxTurnTokens = Math.max(1000, num(lim.maxTurnTokens, DEFAULTS.maxTurnTokens));
    const maxReportTurnTokens = Math.max(maxTurnTokens, num(lim.maxReportTurnTokens, DEFAULTS.maxReportTurnTokens));
    const maxDailyTokens = Math.max(0, num(lim.maxDailyTokens, DEFAULTS.maxDailyTokens));
    const maxModelCalls = Math.max(1, num(lim.maxModelCalls, DEFAULTS.maxModelCalls));
    const maxReportModelCalls = Math.max(maxModelCalls, num(lim.maxReportModelCalls, DEFAULTS.maxReportModelCalls));
    const maxPlanModelCalls = Math.max(maxModelCalls, lim.maxModelCalls != null
        ? num(lim.maxPlanModelCalls, maxModelCalls)
        : num(lim.maxPlanModelCalls, DEFAULTS.maxPlanModelCalls));
    const maxPlanTurnTokens = Math.max(maxTurnTokens, lim.maxTurnTokens != null
        ? num(lim.maxPlanTurnTokens, maxTurnTokens)
        : num(lim.maxPlanTurnTokens, DEFAULTS.maxPlanTurnTokens));
    const planTurnTimeoutMs = Math.max(turnTimeoutMs, Math.max(1, num(lim.planTurnTimeoutSec, DEFAULTS.planTurnTimeoutSec)) * 1000);
    const stepTimeoutMs = Math.max(10_000, Math.max(1, num(lim.stepTimeoutSec, DEFAULTS.stepTimeoutSec)) * 1000);
    const enableSuggestions = lim.enableSuggestions !== false;
    const enableClarify = lim.enableClarify !== false;
    const strictNumberCheck = lim.strictNumberCheck === true;
    const tokenPrices = normalizePrices(lim.tokenPrices);
    const requireSqlApproval = lim.requireSqlApproval === true;
    const enablePlanMode = lim.enablePlanMode !== false;
    const maxPlanSteps = Math.max(1, num(lim.maxPlanSteps, DEFAULTS.maxPlanSteps));
    const maxRetriesPerStep = Math.max(0, num(lim.maxRetriesPerStep, DEFAULTS.maxRetriesPerStep));
    const maxReplans = Math.max(0, num(lim.maxReplans, DEFAULTS.maxReplans));
    const maxParallelSteps = Math.max(1, num(lim.maxParallelSteps, DEFAULTS.maxParallelSteps));
    const enableAccuracyCritic = lim.enableAccuracyCritic !== false;
    const maxCriticRounds = Math.max(0, num(lim.maxCriticRounds, DEFAULTS.maxCriticRounds));
    const intentGateTimeoutMs = Math.max(1000, num(lim.intentGateTimeoutSec, DEFAULTS.intentGateTimeoutSec) * 1000);
    const key = hashKey(JSON.stringify({
        db,
        llm,
        recursionLimit,
        summaryTriggerTokens,
        summaryKeepMessages,
        maxSqlQueries,
        maxSchemaCalls,
        maxResultChars,
        maxTotalToolChars,
        maxOutputTokens,
        maxTurnTokens,
        maxReportTurnTokens,
        maxDailyTokens,
        maxModelCalls,
        maxReportModelCalls,
        maxPlanModelCalls,
        maxPlanTurnTokens,
        planTurnTimeoutMs,
        stepTimeoutMs,
        enableSuggestions,
        enableClarify,
        strictNumberCheck,
        requireSqlApproval,
        enablePlanMode,
        maxPlanSteps,
        maxRetriesPerStep,
        maxReplans,
        maxParallelSteps,
        enableAccuracyCritic,
        maxCriticRounds,
        intentGateTimeoutMs,
    }));
    return {
        db,
        llm,
        recursionLimit,
        turnTimeoutMs,
        maxConcurrent,
        summaryTriggerTokens,
        summaryKeepMessages,
        maxSqlQueries,
        maxSchemaCalls,
        maxResultChars,
        maxTotalToolChars,
        maxOutputTokens,
        maxTurnTokens,
        maxReportTurnTokens,
        maxDailyTokens,
        maxModelCalls,
        maxReportModelCalls,
        maxPlanModelCalls,
        maxPlanTurnTokens,
        planTurnTimeoutMs,
        stepTimeoutMs,
        enableSuggestions,
        enableClarify,
        strictNumberCheck,
        tokenPrices,
        requireSqlApproval,
        enablePlanMode,
        maxPlanSteps,
        maxRetriesPerStep,
        maxReplans,
        maxParallelSteps,
        enableAccuracyCritic,
        maxCriticRounds,
        intentGateTimeoutMs,
        key,
    };
}
/** 描述某个库连接（脱敏）：只给地址/库名/用户，绝不输出密码 */
export function describeDb(db) {
    if (db.type === 'kingbase') {
        return `${db.host}:${db.port} / ${db.database} / ${db.user} (KingbaseES)`;
    }
    const m = /Server=([^;]+)/i.exec(db.connectionString);
    const d = /Database=([^;]+)/i.exec(db.connectionString);
    const u = /(?:Uid|User Id)=([^;]+)/i.exec(db.connectionString);
    const server = m ? m[1].replace(/[{}]/g, '') : '?';
    const database = d ? d[1].replace(/[{}]/g, '') : '?';
    const user = u ? u[1].replace(/[{}]/g, '') : '(集成认证)';
    return `${server} / ${database} / ${user}`;
}
