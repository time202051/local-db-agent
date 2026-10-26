import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LlmRuntime } from './config.js';
import { extractUsage } from './usage.js';
import type { ModelUsage } from './usage.js';

export interface SuggestionMeta {
  queries?: number;
  rowCount?: number;
  tables?: string[];
  warnings?: string[];
  report?: {
    template?: string;
    layout?: string;
    title?: string;
    period?: string;
    scope?: string;
  } | null;
}

export interface SuggestionInput {
  question: string;
  answer: string;
  meta?: SuggestionMeta | null;
}

const SYSTEM_PROMPT = `你是数据库分析助手。请根据本轮用户问题和最终回答，给出用户可以继续追问的 3 个短问题。

要求：
- 中文，每条 4~18 个字。
- 必须具体到数据、指标、时间范围、业务对象、异常或下一步动作。
- 不要重复本轮问题。
- 不要输出编号、引号、解释或前后缀。
- 如果本轮没有数据、只是问候/澄清/错误说明，suggestions 返回空数组。
- 只输出一个 JSON 对象，格式：{"suggestions":["问题1","问题2","问题3"]}，不要代码块。`;

function formatMeta(meta?: SuggestionMeta | null): string {
  if (!meta) return '无';
  const report = meta.report || {};
  const parts = [
    `查询次数：${Number(meta.queries) || 0}`,
    `返回行数：${Number(meta.rowCount) || 0}`,
    `涉及表：${Array.isArray(meta.tables) && meta.tables.length ? meta.tables.join('、') : '无'}`,
    `数据质量提示：${Array.isArray(meta.warnings) && meta.warnings.length ? meta.warnings.join('；') : '无'}`,
    `报告类型：${report.template || '无'} / 结构：${report.layout || '无'} / 标题：${report.title || '无'} / 期间：${report.period || '无'} / 口径：${report.scope || '无'}`,
  ];
  return parts.join('\n');
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          return String((item as { text: unknown }).text || '');
        }
        return '';
      })
      .join('');
  }
  return '';
}

/**
 * 解析模型返回的追问建议。
 * 优先按 JSON 解析；失败时退化为按行提取，避免 DeepSeek 等模型不返回 JSON 时整段丢弃。
 */
export function parseSuggestionOutput(text: string): unknown[] {
  const cleaned = String(text || '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { suggestions?: unknown };
      if (Array.isArray(parsed.suggestions)) return parsed.suggestions;
    } catch {
      /* fall through */
    }
  }
  return cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-*•]+/, '').trim())
    .filter((line) => line && !/^[{}[\],]+$/.test(line));
}

/** 清理模型返回：去编号、去重、限长，最多 3 条。 */
export function normalizeSuggestions(raw: unknown, question = ''): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const questionText = String(question || '').trim();
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    const text = String(item || '')
      .replace(/^\s*\d+[.、)）]\s*/, '')
      .replace(/^["“”']+|["“”']+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    const length = Array.from(text).length;
    if (length < 4 || length > 20) continue;
    if (questionText && text === questionText) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= 3) break;
  }
  return result;
}

/** 用一次轻量调用生成追问建议；失败由调用方降级处理。 */
export async function generateSuggestions(
  llm: LlmRuntime,
  input: SuggestionInput,
): Promise<{ items: string[]; usage: ModelUsage }> {
  const emptyUsage: ModelUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  };
  const question = String(input.question || '').trim();
  const answer = String(input.answer || '').trim();
  if (!question || !answer) return { items: [], usage: emptyUsage };

  const model = new ChatOpenAI({
    model: llm.model,
    apiKey: llm.apiKey,
    temperature: 0.4,
    topP: 0.9,
    timeout: Math.min(Math.max(3000, llm.timeoutMs), 8000),
    maxRetries: 0,
    maxTokens: 180,
    configuration: {
      baseURL: llm.baseUrl,
    },
  });

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      [
        `本轮问题：${question}`,
        `本轮回答：${answer.slice(0, 1500)}`,
        `结果信息：\n${formatMeta(input.meta)}`,
      ].join('\n\n'),
    ),
  ]);

  const usage = extractUsage(response.usage_metadata, response.response_metadata);
  return {
    items: normalizeSuggestions(parseSuggestionOutput(contentToText(response.content)), question),
    usage,
  };
}
