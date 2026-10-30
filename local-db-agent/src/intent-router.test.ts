import { describe, expect, it, vi } from 'vitest';
import {
  chatReply,
  isChatQuestion,
  routeExecutionMode,
  routeIntentByModel,
} from './intent-router.js';
import type { IntentGateInvoke } from './intent-router.js';

describe('routeExecutionMode', () => {
  it('报告类问题走报告模式', () => {
    const route = routeExecutionMode('分析库存并生成 HTML 报告');
    expect(route.mode).toBe('report');
    expect(route.needsReport).toBe(true);
    expect(route.needsCritic).toBe(true);
  });

  it('趋势/对比/多维问题走分析模式', () => {
    expect(routeExecutionMode('分析最近三个月的库存趋势').mode).toBe('analyze');
    expect(routeExecutionMode('按仓库对比库存分布').mode).toBe('analyze');
  });

  it('单指标问题走快速模式，但仍保留反思', () => {
    const route = routeExecutionMode('当前页面有多少库存');
    expect(route.mode).toBe('quick');
    expect(route.needsPlan).toBe(false);
    expect(route.needsReflection).toBe(true);
    expect(route.needsCritic).toBe(false);
    expect(route.maxSteps).toBe(1);
  });

  it('简单列表/明细走快速模式', () => {
    expect(routeExecutionMode('列出最近 10 条出库明细').mode).toBe('quick');
  });

  it('无法判断时保守走分析模式', () => {
    const route = routeExecutionMode('你看看这个情况');
    expect(route.mode).toBe('analyze');
    expect(route.confidence).toBeLessThan(0.7);
  });

  it('用户明确要报告时优先报告模式', () => {
    expect(routeExecutionMode('统计库存', { wantsReport: true }).mode).toBe('report');
  });
});

describe('chat intent', () => {
  it('问候和感谢不进入数据分析路线', () => {
    expect(isChatQuestion('你好')).toBe(true);
    expect(isChatQuestion('谢谢')).toBe(true);
    expect(isChatQuestion('你好，库存有多少')).toBe(false);
    expect(chatReply('你好')).toContain('数据库分析助手');
  });
});

describe('routeIntentByModel（意图门）', () => {
  function jsonModel(content: string, usage?: unknown): IntentGateInvoke {
    return async () => ({
      content,
      usage_metadata:
        usage ?? { input_tokens: 120, output_tokens: 8, input_token_details: { cache_read: 60 } },
    });
  }

  it('chat 判定返回模型现场生成的回复', async () => {
    const result = await routeIntentByModel(
      jsonModel(
        '{"mode":"chat","reply":"我是数据库分析助手，可以帮你查数据、做分析和生成报告。","confidence":0.9}',
      ),
      { question: '你好，请自我介绍下', timeoutMs: 1000 },
    );
    expect(result.mode).toBe('chat');
    expect(result.byFallback).toBe(false);
    expect(result.reply).toContain('数据库分析助手');
    expect(result.usage.inputTokens).toBe(120);
    expect(result.usage.cacheReadTokens).toBe(60);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('数据问题走 quick / analyze 且不携带回复', async () => {
    const quick = await routeIntentByModel(
      jsonModel('{"mode":"quick","reply":"","confidence":0.85}'),
      { question: '本月入库单量', timeoutMs: 1000 },
    );
    expect(quick.mode).toBe('quick');
    expect(quick.reply).toBe('');

    const analyze = await routeIntentByModel(
      jsonModel('```json\n{"mode":"analyze","reply":"","confidence":0.7}\n```'),
      { question: '对比各仓库存分布并出报告', timeoutMs: 1000 },
    );
    expect(analyze.mode).toBe('analyze');
    expect(analyze.reply).toBe('');
  });

  it('无效输出/异常调用回落 analyze（byFallback=true）', async () => {
    const invalid = await routeIntentByModel(jsonModel('抱歉我无法回答'), {
      question: '随便说说',
      timeoutMs: 1000,
    });
    expect(invalid.mode).toBe('analyze');
    expect(invalid.byFallback).toBe(true);
    expect(invalid.reply).toBe('');

    const thrown = await routeIntentByModel(
      async () => {
        throw new Error('network down');
      },
      { question: '你好', timeoutMs: 1000 },
    );
    expect(thrown.mode).toBe('analyze');
    expect(thrown.byFallback).toBe(true);
  });

  it('超时会中止调用并回落 analyze', async () => {
    const abortSpy = vi.fn();
    const slow: IntentGateInvoke = (messages, options) =>
      new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          abortSpy();
          reject(new Error('aborted'));
        });
      });
    const result = await routeIntentByModel(slow, { question: '你好', timeoutMs: 50 });
    expect(result.mode).toBe('analyze');
    expect(result.byFallback).toBe(true);
    expect(abortSpy).toHaveBeenCalled();
  });
});
