/**
 * 业务评测脚本。
 *
 * 用法：
 *   npm run eval:dry          # 只跑参考 SQL，验证用例和数据库连接
 *   npm run eval:smoke        # 跑 smoke 用例（需要 EVAL_LLM_API_KEY）
 *   npm run eval              # 跑全部用例
 *
 * 环境变量（数据库）：
 *   EVAL_DB_TYPE=kingbase|sqlserver
 *   EVAL_DB_SERVER=host,port
 *   EVAL_DB_DATABASE=库名
 *   EVAL_DB_USER=账号
 *   EVAL_DB_PASSWORD=密码
 *   或 EVAL_DB_CONNECTION_STRING（SQL Server）
 *
 * 环境变量（大模型）：
 *   EVAL_LLM_API_KEY / EVAL_LLM_BASE_URL / EVAL_LLM_MODEL
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage } from '@langchain/core/messages';
import { TurnBudget, runWithBudget } from '../src/budget.js';
import { resolveRequestConfig } from '../src/config.js';
import type { RequestConfigInput } from '../src/config.js';
import { closeAllPools, runQuery } from '../src/db.js';
import { normalizeNumber } from '../src/report-check.js';
import { getRuntime } from '../src/runtime.js';
import { analyzeReportRichness } from '../src/tools.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, '..');
const casesFile = join(appDir, 'eval', 'cases.json');
const resultsDir = join(appDir, 'eval', 'results');

interface ReportChecks {
  minSections?: number;
  maxCssKB?: number;
}

interface EvalCase {
  id: string;
  question: string;
  tags?: string[];
  report?: boolean;
  expectTables?: string[];
  forbidTables?: string[];
  limits?: { maxSql?: number; maxCalls?: number; maxTokens?: number };
  referenceSql?: string;
  tolerance?: number;
  reportChecks?: ReportChecks;
}

interface CaseResult {
  id: string;
  ok: boolean;
  reasons: string[];
  expected?: unknown;
  calls: number;
  sqlQueries: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  elapsedMs: number;
  toolNames: string[];
  finalText: string;
}

function env(name: string): string {
  return (process.env[name] || '').trim();
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

function buildConfig(dryRun: boolean): RequestConfigInput {
  const type = env('EVAL_DB_TYPE') || 'kingbase';
  const connectionString = env('EVAL_DB_CONNECTION_STRING');
  const db = connectionString
    ? { type: type as 'kingbase' | 'sqlserver', connectionString }
    : {
        type: type as 'kingbase' | 'sqlserver',
        server: env('EVAL_DB_SERVER') || `${env('EVAL_DB_HOST')},${env('EVAL_DB_PORT')}`,
        database: env('EVAL_DB_DATABASE') || env('EVAL_DB_NAME'),
        user: env('EVAL_DB_USER'),
        password: env('EVAL_DB_PASSWORD'),
        schemas: ['public'],
      };

  const apiKey = env('EVAL_LLM_API_KEY') || (dryRun ? 'sk-dry-run' : '');
  return {
    db,
    llm: {
      apiKey,
      baseUrl: env('EVAL_LLM_BASE_URL') || 'https://api.deepseek.com/v1',
      model: env('EVAL_LLM_MODEL') || 'deepseek-chat',
    },
    limits: {
      temperature: 0,
      maxRows: 500,
      commandTimeoutSec: 60,
      turnTimeoutSec: 180,
      maxConcurrent: 1,
      recursionLimit: 60,
      maxOutputTokens: 20000,
      maxTurnTokens: 200000,
      maxReportTurnTokens: 250000,
      maxModelCalls: 16,
      maxReportModelCalls: 20,
      enableSuggestions: false,
    },
  };
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractText).join('');
  if (value && typeof value === 'object' && 'content' in value) {
    return extractText((value as { content: unknown }).content);
  }
  return '';
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function textContainsNumber(text: string, expected: number, tolerance = 0.001): boolean {
  const re = /-?\d[\d,，]*(?:\.\d+)?\s*(?:亿|万|千)?/g;
  const limit = Math.max(0.01, Math.abs(expected) * tolerance);
  for (const match of text.matchAll(re)) {
    const value = normalizeNumber(match[0]);
    if (value !== null && Math.abs(value - expected) <= limit) return true;
  }
  return false;
}

async function expectedScalar(
  db: ReturnType<typeof resolveRequestConfig>['db'],
  sql: string,
): Promise<number | null> {
  const result = await runQuery(db, sql);
  if (!result.success || !result.rows.length) return null;
  const first = result.rows[0] as Record<string, unknown>;
  const value = Object.values(first)[0];
  const parsed = normalizeNumber(value);
  return parsed;
}

async function runCase(
  evalCase: EvalCase,
  cfg: ReturnType<typeof resolveRequestConfig>,
): Promise<CaseResult> {
  const reasons: string[] = [];
  const toolNames = new Set<string>();
  const sqlTexts: string[] = [];
  let finalText = '';
  let lastModelText = '';
  let visual: Record<string, unknown> | null = null;
  let numberCheck: Record<string, unknown> | null = null;

  let expected: number | null = null;
  if (evalCase.referenceSql) {
    expected = await expectedScalar(cfg.db, evalCase.referenceSql);
    if (expected === null) reasons.push('参考 SQL 没有返回数值');
  }

  const reportMode = evalCase.report === true;
  const budget = new TurnBudget(
    {
      maxSqlQueries: evalCase.limits?.maxSql ?? 6,
      maxSchemaCalls: 8,
      maxResultChars: reportMode ? 20000 : 8000,
      maxTotalToolChars: reportMode ? 120000 : 24000,
      maxTurnTokens: evalCase.limits?.maxTokens ?? (reportMode ? 250000 : 200000),
      maxModelCalls: evalCase.limits?.maxCalls ?? (reportMode ? 20 : 16),
      strictNumberCheck: true,
    },
    { unlimitedQueries: reportMode },
  );

  const started = Date.now();
  const agent = getRuntime(cfg, reportMode);
  try {
    await runWithBudget(budget, async () => {
      const stream = await agent.streamEvents(
        { messages: [new HumanMessage(evalCase.question)] },
        { version: 'v2', recursionLimit: cfg.recursionLimit },
        { excludeTags: ['nostream'] },
      );
      for await (const event of stream as AsyncIterable<Record<string, any>>) {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk as { content?: unknown } | undefined;
          finalText += extractText(chunk?.content);
        }
        if (event.event === 'on_chat_model_end') {
          const text = extractText(
            (event.data?.output as { content?: unknown } | undefined)?.content,
          );
          if (text) lastModelText = text;
        }
        if (event.event === 'on_tool_start') {
          const name = String(event.name || '');
          toolNames.add(name);
          if (name === 'run_sql') {
            const input = event.data?.input as { sql?: unknown; queries?: unknown } | undefined;
            const queries = Array.isArray(input?.queries)
              ? input.queries.map((item) => String(item || ''))
              : [];
            if (queries.length) sqlTexts.push(...queries);
            else if (typeof input?.sql === 'string') sqlTexts.push(input.sql);
          }
        }
        if (event.event === 'on_tool_end') {
          const name = String(event.name || '');
          const output = event.data?.output;
          const record = toRecord(output);
          const artifact = toRecord(record?.artifact);
          if (name === 'render_html_report' && artifact) {
            visual = artifact;
            const parsed = parseJsonObject(extractText(output));
            numberCheck = toRecord(parsed?.numberCheck);
          }
        }
      }
    });
  } catch (error) {
    reasons.push(`运行失败：${error instanceof Error ? error.message : String(error)}`);
  }

  const answer = lastModelText || finalText;
  if (evalCase.referenceSql && expected !== null) {
    if (!textContainsNumber(answer, expected, evalCase.tolerance ?? 0.001)) {
      reasons.push(`最终回答没有找到期望值 ${expected}`);
    }
  }

  const sqlJoined = sqlTexts.join(' ').toLowerCase();
  for (const table of evalCase.expectTables || []) {
    if (!sqlJoined.includes(table.toLowerCase())) {
      reasons.push(`SQL 未使用期望表 ${table}`);
    }
  }
  for (const table of evalCase.forbidTables || []) {
    if (sqlJoined.includes(table.toLowerCase())) {
      reasons.push(`SQL 使用了禁用表 ${table}`);
    }
  }

  const maxSql = evalCase.limits?.maxSql;
  if (typeof maxSql === 'number' && budget.usage.sqlQueries > maxSql) {
    reasons.push(`SQL 次数 ${budget.usage.sqlQueries} > ${maxSql}`);
  }
  const maxCalls = evalCase.limits?.maxCalls;
  if (typeof maxCalls === 'number' && budget.usage.modelCalls > maxCalls) {
    reasons.push(`模型调用 ${budget.usage.modelCalls} > ${maxCalls}`);
  }
  const totalTokens = budget.usage.inputTokens + budget.usage.outputTokens;
  const maxTokens = evalCase.limits?.maxTokens;
  if (typeof maxTokens === 'number' && totalTokens > maxTokens) {
    reasons.push(`token ${totalTokens} > ${maxTokens}`);
  }

  if (reportMode) {
    if (!visual) {
      reasons.push('没有生成报告');
    } else {
      const report = visual as Record<string, unknown>;
      const coverage = Array.isArray(report.coverage)
        ? (report.coverage as Array<Record<string, unknown>>)
        : [];
      if (coverage.some((entry) => entry.status === 'pending')) {
        reasons.push('报告仍有 pending 指标');
      }
      const html = typeof report.html === 'string' ? report.html : '';
      const charts = toRecord(report.charts) || {};
      const richness = analyzeReportRichness(html, charts);
      const minSections = evalCase.reportChecks?.minSections;
      if (typeof minSections === 'number' && richness.sections < minSections) {
        reasons.push(`报告 section ${richness.sections} < ${minSections}`);
      }
      const css = typeof report.css === 'string' ? report.css : '';
      const maxCssKB = evalCase.reportChecks?.maxCssKB;
      if (typeof maxCssKB === 'number' && css.length > maxCssKB * 1024) {
        reasons.push(`CSS ${Math.round(css.length / 1024)}KB > ${maxCssKB}KB`);
      }
      const check = numberCheck as Record<string, unknown> | null;
      const mismatches = Array.isArray(check?.mismatches) ? check.mismatches : [];
      if (mismatches.length > 0) {
        reasons.push(`报告数值对账有 ${mismatches.length} 处不一致`);
      }
    }
  }

  return {
    id: evalCase.id,
    ok: reasons.length === 0,
    reasons,
    expected,
    calls: budget.usage.modelCalls,
    sqlQueries: budget.usage.sqlQueries,
    inputTokens: budget.usage.inputTokens,
    outputTokens: budget.usage.outputTokens,
    cost: budget.usage.cost,
    elapsedMs: Date.now() - started,
    toolNames: Array.from(toolNames),
    finalText: answer.slice(0, 500),
  };
}

async function main(): Promise<void> {
  const cases = JSON.parse(readFileSync(casesFile, 'utf8')) as EvalCase[];
  const onlyId = arg('--id');
  const smoke = hasArg('--smoke');
  const dryRun = hasArg('--dry-run');
  const maxCases = Number(arg('--max-cases') || 0) || undefined;
  const maxTotalTokens = Number(arg('--max-tokens') || 0) || undefined;

  let selected = cases.filter((item) => {
    if (onlyId && item.id !== onlyId) return false;
    if (smoke && !(item.tags || []).includes('smoke')) return false;
    return true;
  });
  if (maxCases) selected = selected.slice(0, maxCases);

  if (!selected.length) {
    console.error('[eval] 没有匹配的用例');
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(`[eval] dry-run：${selected.length} 条用例（只跑参考 SQL）`);
    const dryCfg = resolveRequestConfig(buildConfig(true));
    for (const item of selected) {
      if (!item.referenceSql) {
        console.log(`- ${item.id}: 无参考 SQL`);
        continue;
      }
      try {
        const value = await expectedScalar(dryCfg.db, item.referenceSql);
        console.log(`- ${item.id}: expected=${value}`);
      } catch (error) {
        console.log(
          `- ${item.id}: ERROR ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    await closeAllPools();
    return;
  }

  if (!env('EVAL_LLM_API_KEY')) {
    console.error('[eval] 缺少 EVAL_LLM_API_KEY。设置后再跑；只验证 SQL 可以用 npm run eval:dry。');
    process.exitCode = 1;
    return;
  }

  const cfg = resolveRequestConfig(buildConfig(false));
  const results: CaseResult[] = [];
  let spentTokens = 0;

  for (const item of selected) {
    process.stdout.write(`\n[eval] ${item.id} ... `);
    try {
      const result = await runCase(item, cfg);
      results.push(result);
      spentTokens += result.inputTokens + result.outputTokens;
      console.log(result.ok ? 'PASS' : `FAIL (${result.reasons.join('；')})`);
      console.log(
        `  calls=${result.calls} sql=${result.sqlQueries} ` +
          `tokens=${result.inputTokens}+${result.outputTokens} cost=$${result.cost.toFixed(4)} ` +
          `${result.elapsedMs}ms`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`ERROR ${message}`);
      results.push({
        id: item.id,
        ok: false,
        reasons: [message],
        calls: 0,
        sqlQueries: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        elapsedMs: 0,
        toolNames: [],
        finalText: '',
      });
    }
    if (maxTotalTokens && spentTokens > maxTotalTokens) {
      console.log(`\n[eval] 已达到 --max-tokens ${maxTotalTokens}，停止。`);
      break;
    }
  }

  const passed = results.filter((item) => item.ok).length;
  console.log(
    `\n[eval] ${passed}/${results.length} passed，` +
      `tokens=${results.reduce((sum, item) => sum + item.inputTokens + item.outputTokens, 0)}，` +
      `cost=$${results.reduce((sum, item) => sum + item.cost, 0).toFixed(4)}`,
  );

  mkdirSync(resultsDir, { recursive: true });
  const outFile = join(resultsDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`[eval] 结果已写入 ${outFile}`);

  await closeAllPools();
  if (passed !== results.length) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error('[eval] failed:', error);
  await closeAllPools().catch(() => {});
  process.exitCode = 1;
});
