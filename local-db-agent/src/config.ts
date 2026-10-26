import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TOKEN_PRICES } from './usage.js';
import type { TokenPrices } from './usage.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(path: string): void {
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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
  llmTemperature: 0.3,
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
  enableSuggestions: true,
  enableClarify: true,
  strictNumberCheck: false,
  requireSqlApproval: false,
};

export type DbType = 'sqlserver' | 'kingbase';

// ============================================================
// 前端下发配置（Vue.use(AgentChat, { db, llm, limits })）
// ============================================================

export interface DbInput {
  /**
   * 数据库类型：
   * - 'sqlserver'（默认）：SQL Server，走 ODBC / T-SQL
   * - 'kingbase'：人大金仓 PG 模式，走 pg / PostgreSQL 语法
   */
  type?: DbType;

  // ---- 通用连接字段 ----
  /**
   * 统一地址，SQL Server 与 Kingbase 都写 "host,port"。
   * 示例：'220.179.227.4,60001'（SQL Server）、'220.179.227.4,20036'（金仓）
   */
  server?: string;
  /** 数据库名，例如 WebWMS_CS / OLD.WMS.HF2Q.UAT */
  database?: string;
  /** 登录账号 */
  user?: string;
  /** 登录密码 */
  password?: string;

  // ---- SQL Server 专用 ----
  /** 直接给完整 ODBC 连接串；给了它则忽略 server/database/user/password 等字段 */
  connectionString?: string;
  /** true = Windows 集成认证（Trusted_Connection=Yes），此时不用 user/password */
  trusted?: boolean;
  /** ODBC 是否启用 Encrypt；不传则不写该参数 */
  encrypt?: boolean;
  /** ODBC 驱动名，默认 'ODBC Driver 17 for SQL Server' */
  driver?: string;

  // ---- Kingbase 兼容字段 ----
  /** 兼容写法：不传 server 时可用 host + port；推荐统一用 server */
  host?: string;
  /** 兼容写法：金仓端口，默认 54321；推荐写在 server 里 */
  port?: number;
  /** 金仓是否启用 SSL，默认 false */
  ssl?: boolean;

  // ---- 两种数据库通用：展示 / 业务配置 ----
  /**
   * 只展示这些 schema 的表：
   * - SQL Server：默认 [] 表示全部 schema；可传 ['dbo']
   * - Kingbase：默认 ['public']
   */
  schemas?: string[];
  /**
   * 不在 list_tables 里显示的表名；支持尾部 * 通配。
   * 示例：['WMS_StockHistorys_2026*', 'WMS_StockHistorys_backup']
   */
  hiddenTables?: string[];
  /**
   * 拒绝查询/拒绝查看结构的表名，默认 []。
   * 适合拦截用户表、接口配置、连接串等敏感表。
   */
  blockedTables?: string[];
  /** @deprecated 业务知识请放 knowledge/；仅为旧页面兼容保留，核心不注入 */
  profile?: string;
  /** @deprecated 业务知识请放 knowledge/；仅为旧页面兼容保留，核心不注入 */
  businessPrompt?: string;
}

export interface LlmInput {
  /** 大模型 API Key（必填） */
  apiKey?: string;
  /** 大模型地址，默认 https://api.deepseek.com/v1 */
  baseUrl?: string;
  /** 模型名，默认 deepseek-chat */
  model?: string;
}

export interface LimitsInput {
  /** 单次查询返回行数上限（默认 200） */
  maxRows?: number;
  /** 仅 SQL Server：QUERY_GOVERNOR_COST_LIMIT 预估代价上限（默认 30） */
  costLimit?: number;
  /** 数据库查询超时（秒，默认 15；金仓报表建议 30） */
  commandTimeoutSec?: number;
  /** 大模型调用超时（秒，默认 60） */
  llmTimeoutSec?: number;
  /** 采样温度（默认 0.3）：越大报告结构与视觉风格越多变，SQL 稳定性略降 */
  temperature?: number;
  /** 核采样（默认 0.9） */
  topP?: number;
  recursionLimit?: number;
  turnTimeoutSec?: number;
  maxConcurrent?: number;
  summaryTriggerTokens?: number;
  summaryKeepMessages?: number;
  /** 单轮 SQL 查询次数上限（默认 6） */
  maxSqlQueries?: number;
  /** 单轮表结构查询次数上限（list_tables + get_table_schema，默认 6） */
  maxSchemaCalls?: number;
  /** 单次工具结果字符数上限（默认 8000） */
  maxResultChars?: number;
  /** 单轮所有工具结果字符数上限（默认 40000） */
  maxTotalToolChars?: number;
  /** 单次大模型输出 token 上限（默认 20000） */
  maxOutputTokens?: number;
  /** 普通轮总 token 上限（input+output，默认 150000） */
  maxTurnTokens?: number;
  /** 报告轮总 token 上限（input+output，默认 200000） */
  maxReportTurnTokens?: number;
  /** 每个 conversationId 的每日 token 上限（默认 2000000，内存账本） */
  maxDailyTokens?: number;
  /** 普通轮模型调用次数上限（默认 12） */
  maxModelCalls?: number;
  /** 报告轮模型调用次数上限（默认 16） */
  maxReportModelCalls?: number;
  /** 是否启用 /chat/suggest 追问建议（默认 true） */
  enableSuggestions?: boolean;
  /** 是否允许 agent 调用 ask_clarification 请求用户补充条件（默认 true） */
  enableClarify?: boolean;
  /** true = 报告数值对账不通过时拒绝出报告（默认 false，只告警） */
  strictNumberCheck?: boolean;
  /** token 单价（每 100 万 token），默认按 deepseek-chat */
  tokenPrices?: Partial<TokenPrices>;
  /** true = 每次 run_sql 前通过 LangChain HITL 等待前端确认（默认 false） */
  requireSqlApproval?: boolean;
}

export interface RequestConfigInput {
  db?: DbInput;
  llm?: LlmInput;
  limits?: LimitsInput;
}

interface DbRuntimeBase {
  type: DbType;
  requestTimeoutMs: number;
  costLimit: number;
  maxRows: number;
  /** 只展示这些 schema 的表；SQL Server 为空表示全部 */
  schemas: string[];
  /** 不在 list_tables 中展示的表；支持尾部 * */
  hiddenTables: string[];
  /** 拒绝查询/查看结构的表 */
  blockedTables: string[];
  /** @deprecated 业务知识请放 knowledge/；核心不再注入 */
  profile?: string;
  /** @deprecated 业务知识请放 knowledge/；核心不再注入 */
  businessPrompt?: string;
}

type DbCommonRuntime = Omit<DbRuntimeBase, 'type'>;

/** SQL Server 运行时参数 */
export interface SqlServerDbRuntime extends DbRuntimeBase {
  type: 'sqlserver';
  connectionString: string;
}

/** KingbaseES（PG 模式）运行时参数 */
export interface KingbaseDbRuntime extends DbRuntimeBase {
  type: 'kingbase';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

/** 单次请求实际使用的数据库运行时参数 */
export type DbRuntime = SqlServerDbRuntime | KingbaseDbRuntime;

/** 单次请求实际使用的大模型运行时参数 */
export interface LlmRuntime {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  topP: number;
}

/** 归一化后的完整配置（每次请求一份） */
export interface ResolvedConfig {
  db: DbRuntime;
  llm: LlmRuntime;
  recursionLimit: number;
  turnTimeoutMs: number;
  maxConcurrent: number;
  summaryTriggerTokens: number;
  summaryKeepMessages: number;
  maxSqlQueries: number;
  maxSchemaCalls: number;
  maxResultChars: number;
  maxTotalToolChars: number;
  maxOutputTokens: number;
  maxTurnTokens: number;
  maxReportTurnTokens: number;
  maxDailyTokens: number;
  maxModelCalls: number;
  maxReportModelCalls: number;
  enableSuggestions: boolean;
  enableClarify: boolean;
  strictNumberCheck: boolean;
  tokenPrices: TokenPrices;
  /** 每次 run_sql 前是否需要人工确认（LangChain HITL） */
  requireSqlApproval: boolean;
  /** 供运行时缓存的键（哈希，不含明文密钥） */
  key: string;
}

/** 配置错误：消息面向用户、不含密码等敏感信息 */
export class ConfigError extends Error {}

function num(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizePrices(input?: Partial<TokenPrices>): TokenPrices {
  const pick = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
  return {
    inputMissPerMillion: pick(input?.inputMissPerMillion, DEFAULT_TOKEN_PRICES.inputMissPerMillion),
    inputHitPerMillion: pick(input?.inputHitPerMillion, DEFAULT_TOKEN_PRICES.inputHitPerMillion),
    outputPerMillion: pick(input?.outputPerMillion, DEFAULT_TOKEN_PRICES.outputPerMillion),
  };
}

/** ODBC 值转义：含 ; { } 等字符时用大括号包裹 */
function odbcValue(value: string): string {
  return '{' + value.replace(/\}/g, '}}') + '}';
}

/** 由离散字段拼出 ODBC 连接串 */
function buildOdbcString(db: DbInput): string {
  const driver = (db.driver ?? 'ODBC Driver 17 for SQL Server').trim();
  const parts: string[] = [`Driver={${driver}}`];
  if (db.server) parts.push(`Server=${odbcValue(db.server)}`);
  if (db.database) parts.push(`Database=${odbcValue(db.database)}`);
  if (db.trusted) {
    parts.push('Trusted_Connection=Yes');
  } else {
    if (db.user) parts.push(`Uid=${odbcValue(db.user)}`);
    if (db.password !== undefined) parts.push(`Pwd=${odbcValue(db.password)}`);
  }
  if (typeof db.encrypt === 'boolean') parts.push(`Encrypt=${db.encrypt ? 'Yes' : 'No'}`);
  parts.push('TrustServerCertificate=Yes');
  return parts.join(';') + ';';
}

function hasAnyDbField(db: DbInput): boolean {
  return Boolean(
    db.connectionString ||
    db.server ||
    db.host ||
    db.port ||
    db.database ||
    db.user ||
    db.password ||
    db.trusted,
  );
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const list = value.map((item) => String(item).trim()).filter(Boolean);
  return list.length ? Array.from(new Set(list)) : fallback;
}

function hashKey(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

function resolveSqlServerDb(dbInput: DbInput, common: DbCommonRuntime): SqlServerDbRuntime {
  let connectionString: string;
  if (dbInput.connectionString && dbInput.connectionString.trim()) {
    connectionString = dbInput.connectionString.trim();
  } else if (hasAnyDbField(dbInput)) {
    if (!dbInput.server || !dbInput.database) {
      throw new ConfigError('数据库配置不完整：至少需要 server（地址）和 database（库名）');
    }
    if (!dbInput.trusted && !dbInput.user) {
      throw new ConfigError(
        '数据库配置不完整：非集成认证时需提供 user（用户名）和 password（密码）',
      );
    }
    if (!/^[\x21-\x7E]+$/.test(dbInput.server.trim())) {
      throw new ConfigError('数据库地址格式不正确（server 不能含中文/全角字符/空格）');
    }
    connectionString = buildOdbcString(dbInput);
  } else {
    throw new ConfigError(
      '缺少数据库配置：请在注册组件时传入 db（server/database/user/password 或 connectionString）',
    );
  }

  return {
    type: 'sqlserver',
    connectionString,
    ...common,
  };
}

function resolveKingbaseDb(dbInput: DbInput, common: DbCommonRuntime): KingbaseDbRuntime {
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
    if (!Number.isFinite(port)) port = Number(hostPort[2]);
  }
  if (!Number.isFinite(port) || port <= 0) port = DEFAULTS.dbKingbasePort;
  port = Math.min(65535, Math.max(1, Math.floor(port)));

  if (!/^[\x21-\x7E]+$/.test(host)) {
    throw new ConfigError('数据库地址格式不正确（host 不能含中文/全角字符/空格）');
  }

  const database = (dbInput.database ?? '').trim();
  const user = (dbInput.user ?? '').trim();
  const password = dbInput.password ?? '';
  if (!database) throw new ConfigError('金仓数据库配置不完整：需要 database（库名）');
  if (!user) throw new ConfigError('金仓数据库配置不完整：需要 user（用户名）');
  if (!password) throw new ConfigError('金仓数据库配置不完整：需要 password（密码）');

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
export function resolveRequestConfig(raw?: RequestConfigInput | null): ResolvedConfig {
  const input = raw ?? {};
  const dbInput = input.db ?? {};
  const llmInput = input.llm ?? {};
  const lim = input.limits ?? {};

  const dbType: DbType = dbInput.type === 'kingbase' ? 'kingbase' : 'sqlserver';
  if (dbInput.type && dbInput.type !== 'sqlserver' && dbInput.type !== 'kingbase') {
    throw new ConfigError(
      `不支持的数据库类型：${String(dbInput.type)}（仅支持 sqlserver / kingbase）`,
    );
  }

  const requestTimeoutMs =
    Math.max(1, num(lim.commandTimeoutSec, DEFAULTS.dbCommandTimeoutSec)) * 1000;
  const costLimit = Math.max(0, num(lim.costLimit, DEFAULTS.dbCostLimit));
  const maxRows = Math.max(1, num(lim.maxRows, DEFAULTS.dbMaxRows));

  // ---- 数据库（必填，前端下发）----
  // 这些字段 SQL Server / Kingbase 通用：展示范围、隐藏表、拦截表、业务提示词
  const common: DbCommonRuntime = {
    requestTimeoutMs,
    costLimit,
    maxRows,
    schemas: normalizeStringList(dbInput.schemas, dbType === 'kingbase' ? ['public'] : []),
    hiddenTables: normalizeStringList(dbInput.hiddenTables, []),
    blockedTables: normalizeStringList(dbInput.blockedTables, []),
    // 兼容旧页面；核心不再读取，业务知识改走 knowledge/
    profile: typeof dbInput.profile === 'string' ? dbInput.profile : 'generic',
    businessPrompt:
      typeof dbInput.businessPrompt === 'string'
        ? dbInput.businessPrompt.trim().slice(0, 8000)
        : '',
  };
  const db: DbRuntime =
    dbType === 'kingbase'
      ? resolveKingbaseDb(dbInput, common)
      : resolveSqlServerDb(dbInput, common);

  // ---- 大模型（必填 apiKey，前端下发）----
  const apiKey = (llmInput.apiKey && llmInput.apiKey.trim()) || '';
  if (!apiKey) {
    throw new ConfigError('缺少大模型密钥：请在注册组件时传入 llm.apiKey');
  }
  if (!/^[\x21-\x7E]+$/.test(apiKey)) {
    throw new ConfigError(
      '大模型密钥格式不正确（含非 ASCII 字符，请检查 llm.apiKey，勿含中文/空格）',
    );
  }
  const baseUrl = (llmInput.baseUrl && llmInput.baseUrl.trim()) || DEFAULTS.llmBaseUrl;
  const model = (llmInput.model && llmInput.model.trim()) || DEFAULTS.llmModel;

  const llm: LlmRuntime = {
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
  const summaryTriggerTokens = Math.max(
    20000,
    num(lim.summaryTriggerTokens, DEFAULTS.summaryTriggerTokens),
  );
  const summaryKeepMessages = Math.max(
    1,
    num(lim.summaryKeepMessages, DEFAULTS.summaryKeepMessages),
  );

  const maxSqlQueries = Math.max(1, num(lim.maxSqlQueries, DEFAULTS.maxSqlQueries));
  const maxSchemaCalls = Math.max(1, num(lim.maxSchemaCalls, DEFAULTS.maxSchemaCalls));
  const maxResultChars = Math.max(1000, num(lim.maxResultChars, DEFAULTS.maxResultChars));
  const maxTotalToolChars = Math.max(2000, num(lim.maxTotalToolChars, DEFAULTS.maxTotalToolChars));
  const maxOutputTokens = Math.max(500, num(lim.maxOutputTokens, DEFAULTS.maxOutputTokens));
  const maxTurnTokens = Math.max(1000, num(lim.maxTurnTokens, DEFAULTS.maxTurnTokens));
  const maxReportTurnTokens = Math.max(
    maxTurnTokens,
    num(lim.maxReportTurnTokens, DEFAULTS.maxReportTurnTokens),
  );
  const maxDailyTokens = Math.max(0, num(lim.maxDailyTokens, DEFAULTS.maxDailyTokens));
  const maxModelCalls = Math.max(1, num(lim.maxModelCalls, DEFAULTS.maxModelCalls));
  const maxReportModelCalls = Math.max(
    maxModelCalls,
    num(lim.maxReportModelCalls, DEFAULTS.maxReportModelCalls),
  );
  const enableSuggestions = lim.enableSuggestions !== false;
  const enableClarify = lim.enableClarify !== false;
  const strictNumberCheck = lim.strictNumberCheck === true;
  const tokenPrices = normalizePrices(lim.tokenPrices);
  const requireSqlApproval = lim.requireSqlApproval === true;

  const key = hashKey(
    JSON.stringify({
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
      enableSuggestions,
      enableClarify,
      strictNumberCheck,
      requireSqlApproval,
    }),
  );

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
    enableSuggestions,
    enableClarify,
    strictNumberCheck,
    tokenPrices,
    requireSqlApproval,
    key,
  };
}

/** 描述某个库连接（脱敏）：只给地址/库名/用户，绝不输出密码 */
export function describeDb(db: DbRuntime): string {
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
