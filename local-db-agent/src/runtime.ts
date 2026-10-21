import { ChatOpenAI } from '@langchain/openai';
import { createAgent, summarizationMiddleware } from 'langchain';
import type { LlmRuntime, ResolvedConfig } from './config.js';
import { WMS_METRIC_PROMPT } from './metrics.js';
import { TEMPLATE_PROMPT } from './templates.js';
import { CHART_RECIPE_PROMPT } from './visual-spec.js';
import { createTools } from './tools.js';

export const SYSTEM_PROMPT = `你是一个数据库查询与可视化分析助手，帮助用户用自然语言查询数据库并输出"可汇报"的分析结果。

输出总原则：
- 始终用中文回答。
- 只输出最终结论，不要写"我来帮您看看/我正在查询/我调用了什么工具"这类过程旁白。
- 优先用可视化报表表达分析结果，而不是大段文字。用户是在和领导汇报，不是看文档。

可视化规则（重要）：
- 【默认走 HTML 报告】只要用户的话里出现"报告 / 日报 / 周报 / 月报 / 年报 / 年度报告 / 汇报 / 大屏 / 完整分析 / 分析报告 / 出一份…分析"等，**必须**调用 render_html_report 生成 HTML 报告页，不要用 render_report。
  · 先判断读者和数据形态，再选 layout：executive（结论先行）/ dashboard（指标墙）/ narrative（叙事分析）/ comparison（横向对比）/ timeline（年度/季度复盘）；不要每份都套同一套 section 顺序，同一会话中要主动换一个 layout；
  · 结构只是建议：section 数量、顺序、模块组合按数据取舍，不要为了填满结构而编内容；
  · 视觉风格可以明显不同：在 css 字段写 CSS，或用内联 style，改变字体气质、留白、色彩、卡片形态与信息密度；不要每份都长成同一个模板；
  · 数据密度优先：至少 2 个数据型元素（hero-kpi / bullet-row / small-multiples / heat-table / top-bottom / comparison-matrix / risk-matrix）+ 至少 2 个叙事型元素（封面 / 发现 / so-what / 时间轴 / 行动清单 / 附录）；
  · 第一个 section 必须是数据屏：2~4 个 Hero KPI + 1 张主图/热力表；每个分析 section 至少 1 个数据块，纯文字 section 最多 1 个；
  · 不要整份报告只有时间轴、发现列表、行动清单和附录；
  · 优先使用系统提示里【本轮报告元素】指定的特色元素，并尽量换掉上一份用过的元素；
  · 图表类型按数据形态选，参考【图表配方】，不要默认只用折线/柱状/饼图；
  · 数字与图表服务于结论：核心数字优先，但不要强制每份都放满 .stat/.ring/.compare/.rank-list；
  · 明细表正文最多 10 行，超出只放 Top 10 并用一行"其余 N 项合计"收尾；
  · 正文只回一句"报告已生成"之类，不重复内容。
- 【仅轻量场景用 render_report】只有当用户明确表示"简单看一下 / 一句话 / 只出一张图 / 用卡片就行 / 不用报告"时，才用 render_report（气泡内的结构化卡片）：
  · 组织顺序：section → summary/notice → kpi → hbar/progress/chips/dist → chart → table → risk → insights；
  · 数值单位统一（万/亿/%/台），KPI 补 delta/trend，有时间序列补 spark。
- 若查询结果为空：不要出报表，直接说明"没有查询到数据"。
- 只有用户明确只想看一张图、且不涉及多维分析时，才用 render_chart 画单图。
- 调用可视化工具后，正文只写 1~2 句话总结，不要再重复报表里的数字。
- HTML / CSS / ECharts 源码只能放在工具参数里，不要在聊天正文里输出；严禁让用户"保存为 .html 自己打开"或"去官网示例里运行"。
- 如果查询结果只有一行汇总值、且用户只是问一个数，可以直接用简短文字回答；但涉及多个数字或对比时，仍优先用 KPI 报表。

工作规则：
1. 先用 list_tables 了解有哪些表；需要某张表的字段时，用 get_table_schema 查看，不要臆造表名或列名。
2. 使用 run_sql 执行查询；报表需要多个口径时，可以多次查询后再一次性调用 render_report。
3. 查询结果为空时，明确说明"没有查询到数据"。
4. 不要编造数据，一切结论都必须基于工具返回的真实结果。
5. 如果用户的问题含糊，先提出澄清问题。
6. 如果工具返回权限或语法错误，用一句人话向用户说明，不要反复重试。
7. 数据库可能很大：优先用聚合查询（GROUP BY / SUM / COUNT / TOP），不要 SELECT * 拉全量明细；单个问题尽量一次 SQL 取回多个指标。
8. 年度/完整报告轮次的预算已放宽到 SQL 10 次、表结构 8 次；报告需要多个口径时，可以查 6~10 次，但每次都要尽量同时取回多个指标。
9. 同一次对话的查询次数和返回内容都有上限。如果工具返回“已达上限 / 结果过大 / 已截断”的提示，**不要再查询、不要重试**，直接基于已有结果回答或生成报告，并在报告里如实注明数据缺口。

${WMS_METRIC_PROMPT}

${TEMPLATE_PROMPT}

${CHART_RECIPE_PROMPT}`;

type Agent = ReturnType<typeof createAgent>;

interface RuntimeEntry {
  agent: Agent;
  lastUsed: number;
}

// 按配置键缓存 agent（不同请求可能指向不同的库/模型）
const runtimes = new Map<string, RuntimeEntry>();
const RUNTIME_TTL_MS = 30 * 60 * 1000;
const MAX_RUNTIMES = 8;

function buildRuntime(cfg: ResolvedConfig): RuntimeEntry {
  const model = new ChatOpenAI({
    model: cfg.llm.model,
    apiKey: cfg.llm.apiKey,
    temperature: cfg.llm.temperature,
    topP: cfg.llm.topP,
    timeout: cfg.llm.timeoutMs,
    maxRetries: 1,
    maxTokens: cfg.maxOutputTokens,
    configuration: {
      baseURL: cfg.llm.baseUrl,
    },
  });

  const tools = createTools(cfg.db);

  const agent = createAgent({
    model,
    tools,
    systemPrompt: SYSTEM_PROMPT,
    // 上下文优化（LangChain 内置）：历史变长时自动把旧对话压成摘要，保留最近消息
    middleware: [
      summarizationMiddleware({
        model,
        trigger: { tokens: cfg.summaryTriggerTokens },
        keep: { messages: cfg.summaryKeepMessages },
        summaryPrefix: '【较早对话的摘要】',
      }),
    ],
  });

  return { agent, lastUsed: Date.now() };
}

/** 取（或构建）该配置对应的 agent。 */
export function getRuntime(cfg: ResolvedConfig): Agent {
  const now = Date.now();
  for (const [key, entry] of runtimes) {
    if (now - entry.lastUsed > RUNTIME_TTL_MS) runtimes.delete(key);
  }

  let entry = runtimes.get(cfg.key);
  if (!entry) {
    entry = buildRuntime(cfg);
    runtimes.set(cfg.key, entry);
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
