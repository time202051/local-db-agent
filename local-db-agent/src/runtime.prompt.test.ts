import { describe, it, expect } from 'vitest';
import type { ResolvedConfig } from './config.js';
import { buildSystemPrompt } from './runtime.js';

function config(db: Record<string, unknown>): ResolvedConfig {
  return { db } as unknown as ResolvedConfig;
}

describe('buildSystemPrompt', () => {
  it('金仓包含方言、相关表和无知识包降级规则', () => {
    const prompt = buildSystemPrompt(config({ type: 'kingbase' }));
    expect(prompt).toContain('KingbaseES');
    expect(prompt).toContain('双引号');
    expect(prompt).toContain('LIMIT');
    expect(prompt).toContain('【相关表');
    expect(prompt).toContain('search_tables');
    expect(prompt).toContain('没有业务知识包');
    expect(prompt).toContain('coverage');
    expect(prompt).not.toContain('search_knowledge');
  });

  it('SQL Server 不注入金仓方言提示', () => {
    const prompt = buildSystemPrompt(config({ type: 'sqlserver' }));
    expect(prompt).not.toContain('KingbaseES');
    expect(prompt).toContain('get_table_schema');
  });

  it('核心 prompt 不含 WMS 业务表/指标硬编码', () => {
    const prompt = buildSystemPrompt(config({ type: 'sqlserver' }));
    expect(prompt).not.toContain('WMS 指标口径');
    expect(prompt).not.toContain('WMS_StockHistorys');
    expect(prompt).not.toContain('CORE_Order');
  });

  it('禁止复述历史任务，并要求覆盖率门禁', () => {
    const prompt = buildSystemPrompt(config({ type: 'sqlserver' }));
    expect(prompt).toContain('每次只回答最新一条用户消息');
    expect(prompt).toContain('禁止输出');
    expect(prompt).toContain('pending');
    expect(prompt).toContain('missing');
    expect(prompt).toContain('needs_review');
  });

  it('报告轮注入技能目录和报告执行计划', () => {
    const prompt = buildSystemPrompt(config({ type: 'sqlserver' }), true);
    expect(prompt).toContain('【报告轮执行计划】');
    expect(prompt).toContain('render_html_report');
    expect(prompt).toContain('【可用技能');
    expect(prompt).toContain('read_skill');
  });
});
