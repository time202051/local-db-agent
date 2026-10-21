import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { budgetMessage, currentBudget } from './budget.js';
import type { DbRuntime } from './config.js';
import { getSchema, getTableSchema, runQuery } from './db.js';
import { logLine } from './log.js';
import {
  HTML_REPORT_COMPONENT,
  HTML_REPORT_TOOL_DESCRIPTION,
  HTML_REPORT_TOOL_NAME,
  LEGACY_CHART_COMPONENT,
  LEGACY_CHART_TOOL_NAME,
  REPORT_ELEMENT_KEYS,
  REPORT_LAYOUT_KEYS,
  REPORT_TOOL_DESCRIPTION,
  reportElementCategory,
  REPORT_TOOL_NAME,
  htmlReportSchema,
  reportSchema,
} from './visual-spec.js';

/** 所有会触发前端 visual 渲染的工具名（index.ts 据此把工具结果转成 visual 事件）。 */
export { VISUAL_TOOL_NAMES } from './visual-spec.js';

/** 前端默认的可视化组件名（ECharts 图表，旧协议）。 */
export const DEFAULT_VISUAL_COMPONENT = LEGACY_CHART_COMPONENT;

/** 统计一行里的单元格数（td/th，含 colspan）。 */
function cellSpan(rowHtml: string): number {
  const re = /<(td|th)\b([^>]*)>/gi;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml))) {
    const attrs = m[2] || '';
    const cs = attrs.match(/colspan\s*=\s*["']?(\d+)/i);
    n += cs ? Math.max(1, parseInt(cs[1], 10) || 1) : 1;
  }
  return n;
}

/** 从 HTML 里取出所有 .ol-chart 容器的 data-id。 */
export function extractChartIds(html: string): string[] {
  const ids: string[] = [];
  const tagRe = /<[a-z][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    if (!/class\s*=\s*["'][^"']*\bol-chart\b/i.test(tag)) continue;
    const idm = tag.match(/data-id\s*=\s*["']([^"']+)["']/i);
    if (idm) ids.push(idm[1]);
  }
  return ids;
}

/** 校验单个 ECharts option 是否能画出东西。 */
export function validateChartOption(opt: unknown): string | null {
  if (!opt || typeof opt !== 'object') return 'option 为空';
  const o = opt as Record<string, unknown>;
  const raw = o.series;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (!arr.length) return '缺少 series';
  const hasData = arr.some(s => {
    if (!s || typeof s !== 'object') return false;
    const series = s as Record<string, unknown>;
    if (Array.isArray(series.data)) return series.data.length > 0;
    if (series.data && typeof series.data === 'object') return true;
    return Boolean(o.dataset);
  });
  if (!hasData) return '没有数据（series[].data 为空）';
  const needsAxis = arr.some(s => {
    if (!s || typeof s !== 'object') return false;
    const t = (s as Record<string, unknown>).type;
    return t === 'line' || t === 'bar' || t === 'scatter' || t === 'heatmap' || t === 'candlestick';
  });
  if (needsAxis && !o.xAxis) return '直角坐标图缺少 xAxis';
  if (needsAxis && !o.yAxis) return '直角坐标图缺少 yAxis';
  return null;
}

/**
 * 校验报告图表：HTML 里每个 .ol-chart 都要在 charts 里有可用 option。
 * 只返回提示文本，不抛错（避免触发模型重试）。
 */
export function validateReportCharts(
  html: string,
  charts: Record<string, unknown> | undefined,
): string | null {
  const ids = extractChartIds(html);
  const map = charts || {};
  for (const id of ids) {
    const opt = map[id];
    if (opt === undefined || opt === null) {
      return `图表容器 data-id="${id}" 在 charts 里没有对应的 option`;
    }
    const problem = validateChartOption(opt);
    if (problem) return `图表 ${id}：${problem}`;
  }
  return null;
}

/**
 * 校验 HTML 报告里的表格结构：每行单元格数必须与表头列数一致。
 * 列数不足会导致整行左移（状态徽章跑到别的列）。
 */
export function validateHtmlTables(html: string): string | null {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const headBlock = t.match(/<thead\b[\s\S]*?<\/thead>/i);
    const headRow = headBlock ? (headBlock[0].match(/<tr\b[\s\S]*?<\/tr>/i) || [''])[0] : '';
    let cols = headRow ? cellSpan(headRow) : 0;

    const bodyBlock = (t.match(/<tbody\b[\s\S]*?<\/tbody>/i) || [t])[0];
    const rows = bodyBlock.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    if (!cols) {
      const withTh = rows.find(r => /<th\b/i.test(r));
      cols = withTh ? cellSpan(withTh) : rows[0] ? cellSpan(rows[0]) : 0;
    }
    if (!cols) continue;

    let index = 0;
    for (const row of rows) {
      if (/<th\b/i.test(row) && !/<td\b/i.test(row)) continue;
      index++;
      const n = cellSpan(row);
      if (n !== cols) {
        return `第 ${i + 1} 张表格第 ${index} 个数据行只有 ${n} 个单元格，但表头有 ${cols} 列`;
      }
    }
  }
  return null;
}

// ============================================================
// 入参归一化：模型经常把数组写成字符串、把模板写成中文，这里全部兼容
// ============================================================

export function toStringArray(value: unknown, max = 8): string[] {
  if (Array.isArray(value)) {
    return value
      .map(v => String(v == null ? '' : v).trim())
      .filter(Boolean)
      .slice(0, max);
  }
  if (typeof value === 'string') {
    return value
      .split(/[、,，;；\n]/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, max);
  }
  return [];
}

const TEMPLATE_ALIASES: Record<string, string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  annual: 'annual',
  inventory: 'inventory',
  exception: 'exception',
  compare: 'compare',
  日报: 'daily',
  作业日报: 'daily',
  日报告: 'daily',
  周报: 'weekly',
  运营周报: 'weekly',
  周报告: 'weekly',
  月报: 'monthly',
  运营月报: 'monthly',
  月报告: 'monthly',
  年度: 'annual',
  年报: 'annual',
  年度报告: 'annual',
  年度总结: 'annual',
  年度经营分析: 'annual',
  年度复盘: 'annual',
  库存: 'inventory',
  库存快照: 'inventory',
  库存报表: 'inventory',
  异常: 'exception',
  异常专报: 'exception',
  异常报告: 'exception',
  对比: 'compare',
  多仓对比: 'compare',
  仓库对比: 'compare',
};

const LAYOUT_ALIASES: Record<string, string> = {
  executive: 'executive',
  高层: 'executive',
  高层摘要: 'executive',
  摘要: 'executive',
  汇报: 'executive',
  领导: 'executive',
  老板: 'executive',
  dashboard: 'dashboard',
  看板: 'dashboard',
  仪表盘: 'dashboard',
  监控: 'dashboard',
  运营看板: 'dashboard',
  narrative: 'narrative',
  叙事: 'narrative',
  叙事分析: 'narrative',
  专题: 'narrative',
  分析报告: 'narrative',
  comparison: 'comparison',
  对比: 'comparison',
  横向对比: 'comparison',
  比较: 'comparison',
  多仓: 'comparison',
  timeline: 'timeline',
  时间轴: 'timeline',
  年度: 'timeline',
  季度: 'timeline',
  复盘: 'timeline',
  里程碑: 'timeline',
  auto: 'auto',
  自动: 'auto',
};

const MAX_CSS_CHARS = 60 * 1000;

export function normalizeTemplate(value: unknown): string {
  if (typeof value !== 'string') return 'auto';
  const key = value.trim().toLowerCase();
  if (!key || key === 'auto') return 'auto';
  return TEMPLATE_ALIASES[key] || TEMPLATE_ALIASES[value.trim()] || 'auto';
}

/** 结构蓝图归一化：支持英文 key、中文别名，未知值回落到 auto。 */
export function normalizeLayout(value: unknown): string {
  if (typeof value !== 'string') return 'auto';
  const raw = value.trim();
  if (!raw) return 'auto';
  const key = raw.toLowerCase();
  const hit = LAYOUT_ALIASES[key] || LAYOUT_ALIASES[raw];
  if (hit) return hit;
  const lowered = raw.toLowerCase();
  const alias = Object.keys(LAYOUT_ALIASES).find(
    name => name !== 'auto' && lowered.includes(name.toLowerCase()),
  );
  if (alias) return LAYOUT_ALIASES[alias];
  const matched = REPORT_LAYOUT_KEYS.find(k => lowered.includes(k));
  return matched || 'auto';
}

/** 视觉风格是自由文本，只做去空格和长度保护。 */
export function normalizeVisualStyle(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 120);
}

/** CSS 只做字符串归一化；真正的安全过滤在前端注入时完成。 */
export function normalizeCss(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

const ELEMENT_KEY_SET = new Set<string>(REPORT_ELEMENT_KEYS as readonly string[]);

function normalizeElementName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const name = value.trim().replace(/^\./, '').toLowerCase();
  return ELEMENT_KEY_SET.has(name) ? name : '';
}

/** 统计图表类型，用于日志观察模型是否只用 line/bar/pie。 */
export function extractChartTypes(charts: Record<string, unknown> | undefined): string[] {
  const types = new Set<string>();
  Object.values(charts || {}).forEach(option => {
    if (!option || typeof option !== 'object') return;
    const raw = (option as Record<string, unknown>).series;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    list.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const type = (item as Record<string, unknown>).type;
      if (typeof type === 'string' && type.trim()) types.add(type.trim());
    });
  });
  return Array.from(types);
}

/** 从 HTML 里自动提取实际使用的报告元素 class。 */
export function extractReportElements(html: string): string[] {
  const found = new Set<string>();
  const classRe = /class\s*=\s*["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = classRe.exec(html || ''))) {
    const tokens = match[1].split(/\s+/);
    for (const token of tokens) {
      const name = normalizeElementName(token);
      if (name) found.add(name);
    }
  }
  return Array.from(found);
}

/** 统计报告的数据密度，用于日志判断是否退化成“长文章”。 */
export function analyzeReportRichness(
  html: string,
  charts: Record<string, unknown> | undefined,
): {
  elements: string[];
  dataElements: string[];
  narrativeElements: string[];
  chartTypes: string[];
  sections: number;
  tables: number;
} {
  const elements = extractReportElements(html);
  return {
    elements,
    dataElements: elements.filter(key => reportElementCategory(key) === 'data'),
    narrativeElements: elements.filter(key => reportElementCategory(key) === 'narrative'),
    chartTypes: extractChartTypes(charts),
    sections: (html.match(/<section\b/gi) || []).length,
    tables: (html.match(/<table\b/gi) || []).length,
  };
}

export function normalizeHeight(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const m = value.match(/(\d+(?:\.\d+)?)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  return undefined;
}

export function normalizeCharts(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export interface NormalizedHtmlReport {
  component: string;
  title: string;
  subtitle: string;
  height?: number;
  template: string;
  layout: string;
  visualStyle: string;
  period: string;
  scope: string;
  sources: string[];
  warnings: string[];
  html: string;
  css?: string;
  elements: string[];
  charts?: Record<string, unknown>;
}

/**
 * 报告工具入参归一化 + 软校验。
 * 关键：**永不抛错**，格式问题降级为 warnings，交给前端兜底显示，
 * 从而避免 LangChain 把工具错误转成 ToolMessage 后触发无限重试。
 */
export function normalizeHtmlReportInput(input: Record<string, unknown>): NormalizedHtmlReport {
  const html = typeof input.html === 'string' ? input.html : '';
  const css = normalizeCss(input.css);
  const charts = normalizeCharts(input.charts);
  const warnings = toStringArray(input.warnings);
  const declaredElements = toStringArray(input.elements, 20)
    .map(normalizeElementName)
    .filter(Boolean);
  const elements = Array.from(new Set([...declaredElements, ...extractReportElements(html)]));

  if (!html.trim()) {
    warnings.push('报告正文为空（html 为空）');
  }
  if (css.length > MAX_CSS_CHARS) {
    warnings.push(`CSS 过大（${Math.round(css.length / 1024)}KB），前端会截断到 ${MAX_CSS_CHARS / 1024}KB`);
  }

  const tableProblem = validateHtmlTables(html);
  if (tableProblem) {
    warnings.push(`表格结构提示：${tableProblem}（前端会隐藏列数不一致的行）`);
  }
  const chartProblem = validateReportCharts(html, charts);
  if (chartProblem) {
    warnings.push(`图表结构提示：${chartProblem}（前端会显示“图表未生成”）`);
  }

  return {
    component: HTML_REPORT_COMPONENT,
    title: typeof input.title === 'string' ? input.title : '',
    subtitle: typeof input.subtitle === 'string' ? input.subtitle : '',
    height: normalizeHeight(input.height),
    template: normalizeTemplate(input.template),
    layout: normalizeLayout(input.layout),
    visualStyle: normalizeVisualStyle(input.visualStyle),
    period: typeof input.period === 'string' ? input.period : '',
    scope: typeof input.scope === 'string' ? input.scope : '',
    sources: toStringArray(input.sources),
    warnings: Array.from(new Set(warnings)),
    html,
    css: css || undefined,
    elements,
    charts,
  };
}

// ============================================================
// 结果截断：防止一次查询把上下文撑爆
// ============================================================

function fitJson(build: (keep: number) => Record<string, unknown>, total: number, maxChars: number): string {
  let lo = 0;
  let hi = total;
  let best = JSON.stringify(build(0));
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const text = JSON.stringify(build(mid));
    if (text.length <= maxChars) {
      best = text;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function trimQueryResult(
  result: Awaited<ReturnType<typeof runQuery>>,
  maxChars: number,
  limitWord: 'TOP' | 'LIMIT' = 'TOP',
): { json: string; trimmed: boolean } {
  const json = JSON.stringify(result);
  if (json.length <= maxChars) return { json, trimmed: false };
  const hint = `结果过大已截断，请改用聚合 SQL（GROUP BY / SUM / COUNT）或加 ${limitWord} 后再查询`;
  const text = fitJson(
    keep => ({
      ...result,
      rows: result.rows.slice(0, keep),
      rowCount: keep,
      truncated: true,
      hint,
    }),
    result.rows.length,
    maxChars,
  );
  return { json: text, trimmed: true };
}

// ============================================================
// 工具定义
// ============================================================

/** 为某次请求的数据库配置构造一组工具（工具需要闭包持有该库的连接信息）。 */
export function createTools(db: DbRuntime) {
  const isKingbase = db.type === 'kingbase';
  const limitWord = isKingbase ? 'LIMIT' : 'TOP';
  const dialectTip = isKingbase
    ? '金仓是 PostgreSQL 方言：表名/列名请使用双引号（如 public."WMS_Stocks"），行数限制用 LIMIT。'
    : '';

  const getSchemaTool = tool(
    async ({ keyword }) => {
      const budget = currentBudget();
      const blocked = budget ? budget.takeSchemaCall() : null;
      if (blocked) {
        logLine(`tool list_tables blocked: ${blocked}`);
        return budgetMessage('schema', blocked);
      }

      const schema = await getSchema(db, { keyword });
      const maxChars = budget ? budget.limits.maxResultChars : 8000;

      // 表很多时，完整 JSON（含注释/列数）会超预算。优先退化成“只给表名”，
      // 保证模型仍能看到全部业务表，而不是只看到前几十张。
      let json = JSON.stringify(schema);
      if (json.length > maxChars) {
        const compact = {
          database: schema.database,
          tableCount: schema.tableCount,
          tables: schema.tables.map((table) =>
            table.schema && !table.name.includes('.') ? `${table.schema}.${table.name}` : table.name,
          ),
          hint: '表较多，已只返回表名；可用 list_tables(keyword) 按表名/注释筛选，再用 get_table_schema 查看字段',
        };
        json = JSON.stringify(compact);
        if (json.length > maxChars) {
          json = fitJson(
            (keep) => ({
              ...compact,
              tables: compact.tables.slice(0, keep),
              truncated: keep < compact.tables.length,
            }),
            compact.tables.length,
            maxChars,
          );
        }
      }

      const deny = budget ? budget.takeChars(json.length) : null;
      if (deny) {
        logLine(`tool list_tables budget blocked: ${deny}`);
        return budgetMessage('chars', deny);
      }
      logLine(`tool list_tables ok tables=${schema.tables.length} chars=${json.length}`);
      return json;
    },
    {
      name: 'list_tables',
      description:
        '列出数据库中可用的表（表名 + 字段数量 + 表注释）。生成 SQL 之前先调用本工具了解有哪些表，' +
        '再用 get_table_schema 查看具体表的字段。表很多时用 keyword 按表名/注释筛选。' +
        (dialectTip ? ` ${dialectTip}` : ''),
      schema: z.object({
        keyword: z
          .string()
          .optional()
          .describe('可选：按表名或表注释模糊筛选，例如“库存”“MES”。'),
      }),
    },
  );

  const getTableSchemaTool = tool(
    async ({ table }) => {
      const budget = currentBudget();
      const blocked = budget ? budget.takeSchemaCall() : null;
      if (blocked) {
        logLine(`tool get_table_schema blocked: ${blocked}`);
        return budgetMessage('schema', blocked);
      }

      const schema = await getTableSchema(db, table);
      const maxChars = budget ? budget.limits.maxResultChars : 8000;
      const hint = '字段过多已截断，请优先使用与业务指标相关的字段';
      const json = fitJson(
        keep => ({
          ...schema,
          columns: schema.columns.slice(0, keep),
          truncated: keep < schema.columns.length,
          ...(keep < schema.columns.length ? { hint } : {}),
        }),
        schema.columns.length,
        maxChars,
      );

      const deny = budget ? budget.takeChars(json.length) : null;
      if (deny) {
        logLine(`tool get_table_schema budget blocked: ${deny}`);
        return budgetMessage('chars', deny);
      }
      logLine(`tool get_table_schema ok table=${table} columns=${schema.columns.length} chars=${json.length}`);
      return json;
    },
    {
      name: 'get_table_schema',
      description:
        '查看指定表的字段（列名/类型/是否可空/注释）。确定要查询某张表后调用。' +
        (isKingbase ? ' 可传 schema.table，例如 public."WMS_Stocks"；返回的列名已带双引号。' : ''),
      schema: z.object({
        table: z.string().describe('表名；金仓可传 schema.table，例如 public."WMS_Stocks"'),
      }),
    },
  );

  const runQueryTool = tool(
    async ({ sql: sqlText }) => {
      const budget = currentBudget();
      const blocked = budget ? budget.takeSqlQuery() : null;
      if (blocked) {
        logLine(`tool run_sql blocked: ${blocked}`);
        return budgetMessage('sqlQueries', blocked);
      }

      const started = Date.now();
      const result = await runQuery(db, sqlText);
      const maxChars = budget ? budget.limits.maxResultChars : 8000;
      const { json, trimmed } = trimQueryResult(result, maxChars, limitWord);

      const deny = budget ? budget.takeChars(json.length) : null;
      if (deny) {
        logLine(`tool run_sql budget blocked: ${deny}`);
        return budgetMessage('chars', deny);
      }
      logLine(
        `tool run_sql ${result.success ? 'ok' : 'error'} rows=${result.rowCount}` +
          `${trimmed ? '+' : ''} chars=${json.length} elapsed=${Date.now() - started}ms`,
      );
      return json;
    },
    {
      name: 'run_sql',
      description:
        '执行一条只读查询并返回 JSON 结果（columns/rows/rowCount/truncated）。' +
        `返回行数和结果大小都有上限；数据量大时请用 GROUP BY / ${limitWord} 聚合，不要拉全量明细。` +
        (dialectTip ? ` ${dialectTip}` : ''),
      schema: z.object({
        sql: z.string().describe('要执行的 SQL 查询语句'),
      }),
    },
  );

  const renderChartTool = tool(
    async (input) => JSON.stringify(input),
    {
      name: LEGACY_CHART_TOOL_NAME,
      description:
        '【仅单图场景】当用户只想要一张图（例如只看某条趋势），且不需要整份分析报表时调用。' +
        '如果用户的问题涉及多维分析、汇报报表或需要多个指标，请改用 render_report。' +
        '传入标准 ECharts option：数据必须内嵌在 option 中，坐标轴、系列、标题等一律用中文。' +
        '调用后请用一两句话给出结论。若查询结果为空，不要调用本工具。',
      schema: z.object({
        component: z
          .string()
          .default(DEFAULT_VISUAL_COMPONENT)
          .describe(`渲染组件名，固定用 ${DEFAULT_VISUAL_COMPONENT}`),
        title: z.string().optional().describe('图表标题（可选）'),
        height: z.number().optional().describe('图表高度，单位 px，默认 300（可选）'),
        props: z
          .object({
            option: z
              .record(z.string(), z.any())
              .describe('标准 ECharts option 对象，数据需内嵌其中，如 {xAxis, yAxis, series}'),
          })
          .describe('透传给图表组件的 props'),
      }),
    },
  );

  const renderReportTool = tool(
    async (input) => JSON.stringify(input),
    {
      name: REPORT_TOOL_NAME,
      description: REPORT_TOOL_DESCRIPTION,
      schema: reportSchema,
    },
  );

  const renderHtmlReportTool = tool(
    async (input) => {
      const normalized = normalizeHtmlReportInput(input as Record<string, unknown>);
      const elementInfo = normalized.elements.length ? normalized.elements.join(',') : '-';
      const richness = analyzeReportRichness(normalized.html, normalized.charts);
      const richnessInfo =
        `data=${richness.dataElements.length}(${richness.dataElements.join(',') || '-'}) ` +
        `narrative=${richness.narrativeElements.length}(${richness.narrativeElements.join(',') || '-'}) ` +
        `sections=${richness.sections} tables=${richness.tables} ` +
        `charts=${richness.chartTypes.join(',') || '-'}`;
      if (richness.dataElements.length < 2) {
        logLine('report richness warning: data elements too few');
      }
      if (normalized.warnings.length) {
        logLine(
          `tool render_html_report ok warnings=${normalized.warnings.length} elements=${elementInfo} ` +
            `${richnessInfo} ` +
            normalized.warnings.join(' | ').slice(0, 400),
        );
      } else {
        logLine(
          `tool render_html_report ok chars=${normalized.html.length} css=${normalized.css?.length || 0} ` +
            `elements=${elementInfo} ${richnessInfo}`,
        );
      }
      return JSON.stringify(normalized);
    },
    {
      name: HTML_REPORT_TOOL_NAME,
      description: HTML_REPORT_TOOL_DESCRIPTION,
      schema: htmlReportSchema,
    },
  );

  return [
    getSchemaTool,
    getTableSchemaTool,
    runQueryTool,
    renderReportTool,
    renderHtmlReportTool,
    renderChartTool,
  ];
}
