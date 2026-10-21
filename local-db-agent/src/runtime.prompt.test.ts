import { describe, it, expect } from 'vitest';
import type { ResolvedConfig } from './config.js';
import { buildSystemPrompt } from './runtime.js';

function config(db: Record<string, unknown>): ResolvedConfig {
  return { db } as unknown as ResolvedConfig;
}

describe('buildSystemPrompt', () => {
  it('金仓 wms 档位包含方言、WMS 口径和宿主业务提示', () => {
    const prompt = buildSystemPrompt(
      config({
        type: 'kingbase',
        profile: 'wms',
        businessPrompt: '库存流水查父表',
      }),
    );
    expect(prompt).toContain('KingbaseES');
    expect(prompt).toContain('双引号');
    expect(prompt).toContain('LIMIT');
    expect(prompt).toContain('WMS 指标口径');
    expect(prompt).toContain('WMS_StockHistorys');
    expect(prompt).toContain('库存流水查父表');
  });

  it('generic 档位不注入 WMS 指标和 WMS 业务提示', () => {
    const prompt = buildSystemPrompt(
      config({ type: 'kingbase', profile: 'generic', businessPrompt: '' }),
    );
    expect(prompt).toContain('KingbaseES');
    expect(prompt).not.toContain('WMS 指标口径');
    expect(prompt).not.toContain('WMS_StockHistorys');
  });

  it('SQL Server 不注入金仓方言提示', () => {
    const prompt = buildSystemPrompt(config({ type: 'sqlserver' }));
    expect(prompt).toContain('WMS 指标口径');
    expect(prompt).not.toContain('KingbaseES');
  });

  it('SQL Server 也支持 profile=generic 和 businessPrompt', () => {
    const prompt = buildSystemPrompt(
      config({ type: 'sqlserver', profile: 'generic', businessPrompt: 'SQL 业务说明' }),
    );
    expect(prompt).not.toContain('WMS 指标口径');
    expect(prompt).toContain('SQL 业务说明');
    expect(prompt).not.toContain('KingbaseES');
  });

  it('禁止复述历史任务，但允许用户明确要求回顾', () => {
    const prompt = buildSystemPrompt(config({ type: 'sqlserver' }));
    expect(prompt).toContain('每次只回答最新一条用户消息');
    expect(prompt).toContain('禁止输出"已完成任务"');
    expect(prompt).toContain('用户明确说"总结一下前面');
  });
});
