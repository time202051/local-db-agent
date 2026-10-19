import { ChatOpenAI } from '@langchain/openai';
import { createAgent, summarizationMiddleware } from 'langchain';
import type { LlmRuntime, ResolvedConfig } from './config.js';
import { createTools } from './tools.js';

export const SYSTEM_PROMPT = `你是一个数据库查询与分析助手，帮助用户用自然语言查询数据库。

输出要求：
- 始终用中文回答。
- 只输出最终结论，直接回答用户的问题；不要写"我来帮您看看/我正在查询/我调用了什么工具"这类过程旁白。
- 结构：先给结论，再给必要的数据支撑（可用 Markdown 表格），最后给一两句简短分析。不要客套话。

工作规则：
1. 先用 list_tables 了解有哪些表；需要某张表的字段时，用 get_table_schema 查看，不要臆造表名或列名。
2. 使用 run_sql 执行查询。
3. 查询结果为空时，明确说明"没有查询到数据"。
4. 不要编造数据，一切结论都必须基于工具返回的真实结果。
5. 如果用户的问题含糊，先提出澄清问题。
6. 如果工具返回权限或语法错误，用一句人话向用户说明，不要反复重试。`;

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
    temperature: 0,
    timeout: cfg.llm.timeoutMs,
    maxRetries: 1,
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
