import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import {
  ClearToolUsesEdit,
  contextEditingMiddleware,
  createAgent,
  humanInTheLoopMiddleware,
  summarizationMiddleware,
} from 'langchain';
import type { ContextEdit } from 'langchain';
import type { LlmRuntime, ResolvedConfig } from './config.js';
import { costGuardMiddleware } from './cost-guard.js';
import { getKnowledgePack } from './knowledge.js';
import { getSkillPack } from './skills.js';
import { CHART_RECIPE_PROMPT } from './visual-spec.js';
import { createTools } from './tools.js';

const BASE_SYSTEM_PROMPT = `你是一个通用数据库查询与可视化分析助手，帮助用户用自然语言查询、分析数据并输出结论或报告。

输出总原则：
- 始终用中文回答；只给最终结论，不写"我来帮您看看/我正在查询/我调用了什么工具"这类过程旁白。
- 每次只回答最新一条用户消息，不要复述历史任务或工具调用过程。
- 用户没有明确要求"回顾/总结前面"时，禁止输出"已完成任务""分析中已取得的关键统计""当前任务（新问题）"等章节。
- 优先用可视化报表表达分析结果。

工作方式：
1. 系统会在本轮提供【相关表】候选。优先使用候选表，不要默认全量 list_tables。
2. 需要更多表时用 search_tables；知识包相关工具按附加说明使用。
3. 需要字段时用 get_table_schema，多张表用 tables 数组一次查，不要臆造表名或列名。
4. 用 run_sql 执行只读查询；能一次取回的口径合并到 queries 数组（2~10 条独立 SQL），减少模型往返。
5. 数据库可能很大：优先聚合（GROUP BY / SUM / COUNT），带时间/仓库/状态过滤，禁止 SELECT *；行数限制用 LIMIT（金仓）或 TOP（SQL Server）。
6. 不要编造数据，一切结论必须基于工具返回的真实结果；结果为空时明确说明。
7. 工具返回 complete=false / truncated=true 时，不能当作完整数据；应改用聚合或补充查询，并在报告中说明数据缺口。
8. 问题含糊时先提出澄清；工具返回权限/语法错误时用一句人话说明，不要反复重试。
9. 如某条结论直接来自本轮某次 run_sql 结果，可在句末用 [n] 标注来源，n 为本轮 run_sql 调用顺序（从 1 开始，最多 9）；没有对应查询时不要编号。
10. 用户上传图片时，先识别图片中的表格/截图/报错信息，再结合数据库回答；识别不清时直接说明，不要猜测图片内容。

报告规则：
- 用户提到"报告 / 日报 / 周报 / 月报 / 年报 / 汇报 / 大屏 / 完整分析 / 分析报告"等，使用 render_html_report；轻量卡片场景用 render_report；单图用 render_chart。
- 如果命中报告类 skill，先 read_skill 读取报告结构和指标；没有 skill 时按通用结构组织；不要凭空套固定模板。
- 报告必须提供 coverage：逐项标注 ok / missing / needs_review / pending。
  · pending：还没查，禁止出报告；
  · ok：必须有数据来源；
  · missing：字段/数据确实缺失，写清原因；
  · needs_review：口径待确认，不输出数值，只写说明。
- 结构由内容决定，不要每份都套固定章节顺序；完整报告的数据型元素至少 2 个、叙事型至少 2 个，轻量分析不要硬凑。
- CSS 建议 3~8KB（最多 40KB）；章节编号 .section-no 只放 1~2 位数字；禁止 position:fixed 或用 absolute 覆盖标题/数字/表格。
- 明细表最多 10 行；正文只回一句"报告已生成"。
- HTML / CSS / ECharts 源码只能放在工具参数里，严禁输出到聊天正文或让用户自己保存运行。
- 结果只有一行汇总值且用户只问一个数时，可以直接用简短文字回答。

可视化自由组合：
- render_report 只是组件画布：按数据选择 kpi / chart / table / insights / risk / notice 等组件，可重复、可省略、可调整顺序。
- 需要并排时用 row + columns(span) 做分栏；不要每份都排成单列长报表，也不要把所有组件都堆上去。
- 轻量分析优先 1~3 个最有效的组件，布局随数据决定；连续对话中主动换一种组织方式。`;

/** 金仓（PostgreSQL 兼容模式）方言与安全提示。 */
const KINGBASE_PROMPT = `【当前数据库：KingbaseES（PostgreSQL 兼容模式，只读）】
- 只允许 SELECT / WITH 查询，禁止任何写操作、DDL、存储过程调用。
- 标识符区分大小写：表名、列名必须使用双引号，并原样使用工具返回的带引号名称，例如 public."YourTable"、"YourColumn"。
- 行数限制用 LIMIT，不要使用 TOP；字符串不需要 N 前缀。
- 日期/时间用 now()、current_date、date_trunc()、to_char()、interval，不要使用 GETDATE/DATEADD/ISNULL。
- 表/列注释含业务含义；不确定字段时先调用 get_table_schema，不要臆造。`;

const NO_KNOWLEDGE_PROMPT = `【当前没有业务知识包】
- 先用 search_tables / list_tables / get_table_schema 了解有哪些表和字段；
- 业务口径不明确时向用户澄清，或把指标标为 needs_review / missing；
- 不要猜业务规则、不要编造指标口径。`;

const CLARIFY_PROMPT = `【澄清规则】
- 用户问题缺少关键条件（时间范围、仓库/组织、指标口径、统计维度等）且无法从上下文推断时，先调用 ask_clarification 让用户补充；
- 一次最多问 5 个字段，只问真正影响结果的条件；能从上下文推断的不要问；
- 用户补充后再继续查询或出报告。`;

const SKILL_RULES_PROMPT = `【技能使用规则】
- 用户任务与技能目录中的描述匹配时，先 read_skill(name) 读取完整步骤，再按步骤执行。
- 不要凭技能标题猜流程；技能里的 SQL/表名只是示例，执行前确认当前库的表和字段。
- 需要技能内参考文件时用 read_skill_file(name, path)。`;

const REPORT_PLAN_PROMPT = `【报告轮执行计划】
- 先 get_table_schema(detail="profile") 看 1~2 张核心表，确认日期范围和状态枚举；
- SQL 按 KPI、趋势/排名、质量/异常三组组织，尽量一次 8~10 条，不要逐表重复查询；
- 数据不足时用 coverage 标 missing/needs_review，不要为了补全反复探索；
- 最后必须调用 render_html_report；禁止只输出“现在生成报告”这类文字。`;

const REPORT_SKILL_HINT =
  '- 命中报告类或业务类技能时，先 read_skill(name)，章节结构、指标和查询顺序以技能为准；下面的默认计划仅作兜底；';

export function buildSystemPrompt(cfg: ResolvedConfig, reportMode = false): string {
  const parts = [BASE_SYSTEM_PROMPT];
  if (cfg.enableClarify) parts.push(CLARIFY_PROMPT);
  if (cfg.db.type === 'kingbase') parts.push(KINGBASE_PROMPT);
  const knowledge = getKnowledgePack();
  if (knowledge) {
    parts.push(knowledge.indexText);
    const rules: string[] = [];
    if (knowledge.docs.length || knowledge.reports.length) {
      rules.push(
        '需要业务口径、表说明、数据质量说明时，用 search_knowledge / read_knowledge，不要凭空猜测。',
      );
    }
    if (knowledge.queries.length) {
      rules.push('常用指标优先用 run_saved_query；需要改口径时再用 run_sql。');
    }
    if (rules.length) parts.push(`【知识包使用规则】\n${rules.join('\n')}`);
  } else {
    parts.push(NO_KNOWLEDGE_PROMPT);
  }
  const skills = getSkillPack();
  const hasSkills = Boolean(skills && skills.skills.length);
  if (hasSkills && skills) {
    parts.push(skills.catalogText);
    parts.push(SKILL_RULES_PROMPT);
  }
  if (reportMode) {
    parts.push(
      hasSkills
        ? REPORT_PLAN_PROMPT.replace(
            '【报告轮执行计划】',
            `【报告轮执行计划】\n${REPORT_SKILL_HINT}`,
          )
        : REPORT_PLAN_PROMPT,
    );
  }
  parts.push(CHART_RECIPE_PROMPT);
  return parts.join('\n\n');
}

type Agent = ReturnType<typeof createAgent>;

interface RuntimeEntry {
  agent: Agent;
  lastUsed: number;
}

// 按配置键缓存 agent（不同请求可能指向不同的库/模型）
const runtimes = new Map<string, RuntimeEntry>();
const RUNTIME_TTL_MS = 30 * 60 * 1000;
const MAX_RUNTIMES = 8;

function compactSchemaContent(content: string): string | null {
  if (!content.trim().startsWith('{')) return null;
  if (content.startsWith('[已压缩')) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
  const rawSchemas = Array.isArray(parsed.schemas)
    ? (parsed.schemas as Array<Record<string, unknown>>)
    : parsed.table
      ? [parsed]
      : [];
  const lines: string[] = [];
  for (const entry of rawSchemas) {
    const columns = Array.isArray(entry.columns) ? entry.columns : [];
    const compact = columns
      .map((column) => String(column).split(' — ')[0].trim())
      .filter(Boolean)
      .join(', ');
    if (compact) lines.push(`${String(entry.table || '?')}: ${compact}`);
  }
  if (!lines.length) return null;
  return (
    '[已压缩表结构；需要注释/完整字段请重新 get_table_schema(detail=full)]\n' + lines.join('\n')
  );
}

/**
 * 旧 SQL 结果无损压缩：保留所有列和值，只去掉重复键/运行元数据。
 * 最近 2 批 SQL 保持原始 JSON，避免报告生成时缺上下文。
 */
function compactSqlResultContent(content: string): string | null {
  if (content.startsWith('[SQL 结果已压缩')) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
  const head = '[SQL 结果已压缩；所有列和值保留]';
  if (Array.isArray(parsed.results)) {
    const results = parsed.results as Array<Record<string, unknown>>;
    const lines = results.map((item, index) => {
      const columns = JSON.stringify(Array.isArray(item.columns) ? item.columns : []);
      const rows = JSON.stringify(Array.isArray(item.rows) ? item.rows : []);
      const error = item.error ? ` error=${JSON.stringify(item.error)}` : '';
      return (
        `${index + 1}) ok=${item.success !== false} ` +
        `cols=${columns} rows=${rows} n=${Number(item.rowCount ?? 0)}` +
        `${item.truncated === true ? ' truncated=true' : ''}${error}`
      );
    });
    return [
      head,
      `queryId=${String(parsed.queryId || '')} complete=${parsed.complete !== false}`,
      ...lines,
    ].join('\n');
  }
  if (Array.isArray(parsed.rows)) {
    return [
      head,
      `queryId=${String(parsed.queryId || '')} complete=${parsed.complete !== false}`,
      `cols=${JSON.stringify(Array.isArray(parsed.columns) ? parsed.columns : [])}`,
      `rows=${JSON.stringify(parsed.rows)}`,
      `n=${Number(parsed.rowCount ?? 0)}${parsed.truncated === true ? ' truncated=true' : ''}`,
    ].join('\n');
  }
  return null;
}

/**
 * 只压缩“已经用过”的元数据和旧 SQL 结果：
 * - list_tables 在 2 批 SQL 之后压成一行提示；
 * - get_table_schema 在 2 批 SQL 之后压成“表: 列名/类型”账本；
 * - 较早的 run_sql 结果保留所有列和值，只去掉重复键（最近 2 批保持原始 JSON）；
 * - HTML 内容完全不改。
 */
export const compactMetadataEdit: ContextEdit = {
  async apply({ messages }: { messages: BaseMessage[] }): Promise<void> {
    const toolMessages: Array<{ index: number; name: string; message: ToolMessage }> = [];
    messages.forEach((message, index) => {
      if (!ToolMessage.isInstance(message)) return;
      toolMessages.push({ index, name: message.name || '', message });
    });
    const sqlIndices = toolMessages
      .filter((item) => item.name === 'run_sql' || item.name === 'run_saved_query')
      .map((item) => item.index);
    if (sqlIndices.length < 2) return;
    const cutoff = sqlIndices[sqlIndices.length - 2];

    for (const item of toolMessages) {
      if (item.index >= cutoff) continue;
      const content = item.message.content;
      if (typeof content !== 'string') continue;
      if (item.name === 'list_tables') {
        if (content.startsWith('[已压缩')) continue;
        item.message.content =
          '[已压缩表清单] 本轮已提供相关表候选；需要更多表请 search_tables(keyword) 或 list_tables(keyword)。';
      } else if (item.name === 'get_table_schema') {
        const compacted = compactSchemaContent(content);
        if (compacted) item.message.content = compacted;
      } else if (item.name === 'run_sql' || item.name === 'run_saved_query') {
        const compacted = compactSqlResultContent(content);
        if (compacted) item.message.content = compacted;
      }
    }
  },
};

export function createChatModel(cfg: ResolvedConfig, options: { maxTokens?: number } = {}): ChatOpenAI {
  return new ChatOpenAI({
    model: cfg.llm.model,
    apiKey: cfg.llm.apiKey,
    temperature: cfg.llm.temperature,
    topP: cfg.llm.topP,
    timeout: cfg.llm.timeoutMs,
    maxRetries: 1,
    maxTokens: options.maxTokens ?? cfg.maxOutputTokens,
    configuration: {
      baseURL: cfg.llm.baseUrl,
    },
  });
}

function buildRuntime(cfg: ResolvedConfig, reportMode: boolean): RuntimeEntry {
  const model = createChatModel(cfg);

  // 审批模式只暴露单条 SQL，避免审批弹窗看不到批量参数
  const tools = createTools(cfg.db, {
    batchQueries: !cfg.requireSqlApproval,
    reportMode,
    clarify: cfg.enableClarify,
  });

  // 上下文优化（LangChain 内置）：
  // 1) 先清理较早的工具结果（不花模型调用），2) 仍超阈值时再压缩成摘要。
  const middleware: any[] = [
    // 成本兜底：每次模型调用前检查本轮预算，调用后记录真实 token/缓存用量。
    costGuardMiddleware(cfg.tokenPrices),
    contextEditingMiddleware({
      edits: [
        compactMetadataEdit,
        new ClearToolUsesEdit({
          trigger: { tokens: 40000 },
          keep: { messages: 5 },
          placeholder: '[较早的工具结果已清理，需要时请重新查询]',
        }),
      ],
    }),
    summarizationMiddleware({
      model,
      trigger: { tokens: cfg.summaryTriggerTokens },
      keep: { messages: cfg.summaryKeepMessages },
      summaryPrefix: '【较早对话的摘要】',
    }),
  ];

  // 可选：每次执行 SQL 前通过 LangChain 的 Human-in-the-Loop 中间件等待前端确认。
  // 只在宿主显式开启时启用，默认不影响普通对话。
  if (cfg.requireSqlApproval) {
    middleware.push(
      humanInTheLoopMiddleware({
        interruptOn: {
          run_sql: {
            allowedDecisions: ['approve', 'reject'],
            description: '执行 SQL 查询前需要确认',
          },
        },
        interruptMode: 'batched',
        descriptionPrefix: '查询确认',
      }),
    );
  }

  const agent = createAgent({
    model,
    tools,
    systemPrompt: buildSystemPrompt(cfg, reportMode),
    middleware,
    // HITL 需要 checkpointer 才能在中断后恢复执行
    ...(cfg.requireSqlApproval ? { checkpointer: new MemorySaver() } : {}),
  });

  return { agent, lastUsed: Date.now() };
}

/** 取（或构建）该配置对应的 agent。 */
export function getRuntime(cfg: ResolvedConfig, reportMode = false): Agent {
  const now = Date.now();
  for (const [key, entry] of runtimes) {
    if (now - entry.lastUsed > RUNTIME_TTL_MS) runtimes.delete(key);
  }

  const runtimeKey = `${cfg.key}|report=${reportMode ? 1 : 0}`;
  let entry = runtimes.get(runtimeKey);
  if (!entry) {
    entry = buildRuntime(cfg, reportMode);
    runtimes.set(runtimeKey, entry);
    if (runtimes.size > MAX_RUNTIMES) {
      let oldestKey: string | null = null;
      let oldest = Infinity;
      for (const [key, value] of runtimes) {
        if (value.lastUsed < oldest) {
          oldest = value.lastUsed;
          oldestKey = key;
        }
      }
      if (oldestKey !== null) runtimes.delete(oldestKey);
    }
  }
  entry.lastUsed = now;
  return entry.agent;
}

/** 轻量探测大模型是否可用（供 /config/check 用，只花极少 token）。 */
export async function pingModel(llm: LlmRuntime): Promise<void> {
  const model = new ChatOpenAI({
    model: llm.model,
    apiKey: llm.apiKey,
    timeout: llm.timeoutMs,
    maxRetries: 0,
    maxTokens: 1,
    configuration: {
      baseURL: llm.baseUrl,
    },
  });
  await model.invoke('ping');
}
