import { describe, expect, it } from 'vitest';
import { chatReply, isChatQuestion, routeExecutionMode } from './intent-router.js';

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
