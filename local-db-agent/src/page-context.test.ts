import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  clearPageContextCache,
  formatPageContextAnswer,
  isPageContextRelevant,
  isTableIdentificationQuestion,
  resolvePageContext,
} from './page-context.js';

const dir = mkdtempSync(join(tmpdir(), 'agent-page-context-'));
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, 'api-map.json'),
  JSON.stringify({
    endpoints: {
      'POST /api/app/product/product-pages': {
        method: 'POST',
        path: '/api/app/product/product-pages',
        summary: '获取产品分页信息数据',
        tables: ['WMS_Products'],
        confidence: 0.99,
      },
      'GET /api/app/product/product/{productId}': {
        method: 'GET',
        path: '/api/app/product/product/{productId}',
        summary: '根据 ID 获取产品',
        tables: ['WMS_Products'],
        confidence: 0.8,
      },
      'POST /api/app/stock-out/stock-out-pages': {
        method: 'POST',
        path: '/api/app/stock-out/stock-out-pages',
        summary: '获取出库订单分页数据',
        tables: ['WMS_StockOuts', 'WMS_StockOutDetails'],
        confidence: 0.9,
      },
    },
  }),
  'utf8',
);
writeFileSync(
  join(dir, 'manifest.json'),
  JSON.stringify({
    name: 'test',
    tables: {
      WMS_Products: { aliases: ['Product', '物料'] },
      WMS_StockOuts: { aliases: ['StockOut', '出库单'] },
    },
  }),
  'utf8',
);

afterAll(() => {
  clearPageContextCache();
  rmSync(dir, { recursive: true, force: true });
});

describe('resolvePageContext', () => {
  it('支持相对 URL、完整 URL 和 query，并默认 POST', () => {
    const relative = resolvePageContext(
      { apiUrl: 'api/app/product/product-pages' },
      { knowledgeDir: dir },
    );
    expect(relative?.primaryTable).toBe('WMS_Products');
    expect(relative?.method).toBe('POST');
    expect(relative?.source).toBe('api-map');

    const full = resolvePageContext(
      { apiUrl: 'https://wms.example.com/prod-api/api/app/product/product-pages?page=1' },
      { knowledgeDir: dir },
    );
    expect(full?.apiUrl).toBe('/api/app/product/product-pages');
    expect(full?.primaryTable).toBe('WMS_Products');
  });

  it('支持显式 GET 和 Swagger 模板路径', () => {
    const result = resolvePageContext(
      { apiUrl: '/api/app/product/product/abc', method: 'GET' },
      { knowledgeDir: dir },
    );
    expect(result?.method).toBe('GET');
    expect(result?.tables).toEqual(['WMS_Products']);
  });

  it('多表接口保留完整候选，主表排第一', () => {
    const result = resolvePageContext(
      { apiUrl: '/api/app/stock-out/stock-out-pages' },
      { knowledgeDir: dir },
    );
    expect(result?.tables).toEqual(['WMS_StockOuts', 'WMS_StockOutDetails']);
    expect(result?.primaryTable).toBe('WMS_StockOuts');
  });

  it('未映射时按 URL 关键词兜底', () => {
    const result = resolvePageContext(
      { apiUrl: '/api/app/custom/product-list' },
      { knowledgeDir: dir },
    );
    expect(result?.source).toBe('path-tokens');
    expect(result?.primaryTable).toBe('WMS_Products');
  });

  it('完全无法识别时返回原因，不编造表', () => {
    const result = resolvePageContext(
      { apiUrl: '/api/app/custom/unknown' },
      { knowledgeDir: dir },
    );
    expect(result?.source).toBe('unresolved');
    expect(result?.tables).toEqual([]);
    expect(result?.reason).toContain('无法匹配');
  });

  it('空 URL 返回 null', () => {
    expect(resolvePageContext({ apiUrl: '' }, { knowledgeDir: dir })).toBeNull();
    expect(resolvePageContext(null, { knowledgeDir: dir })).toBeNull();
  });
});

describe('table identification fast path', () => {
  it('识别只问表的问题', () => {
    expect(isTableIdentificationQuestion('当前页面的分页接口查的是哪张表')).toBe(true);
    expect(isTableIdentificationQuestion('当前页面对应哪张表')).toBe(true);
    expect(isTableIdentificationQuestion('这个接口用的是哪个表')).toBe(true);
  });

  it('不拦截数据分析问题', () => {
    expect(isTableIdentificationQuestion('分析当前页面表格数据')).toBe(false);
    expect(isTableIdentificationQuestion('当前页面表格数据')).toBe(false);
    expect(isTableIdentificationQuestion('统计当前页面库存')).toBe(false);
    expect(isTableIdentificationQuestion('生成当前页面报告')).toBe(false);
  });

  it('直接回答不执行 SQL，并保留多表候选', () => {
    const context = resolvePageContext(
      { apiUrl: '/api/app/stock-out/stock-out-pages' },
      { knowledgeDir: dir },
    );
    const answer = formatPageContextAnswer(context);
    expect(answer).toContain('WMS_StockOuts');
    expect(answer).toContain('WMS_StockOutDetails');
    expect(answer).toContain('没有执行 SQL');
  });

  it('只有明确指代当前页面时才使用 pageContext', () => {
    expect(isPageContextRelevant('你好')).toBe(false);
    expect(isPageContextRelevant('本月出库单量')).toBe(false);
    expect(isPageContextRelevant('当前页面有多少库存')).toBe(true);
    expect(isPageContextRelevant('这个接口对应哪张表')).toBe(true);
  });
});
