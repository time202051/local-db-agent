import { describe, expect, it } from 'vitest';
import { normalizeSuggestions, parseSuggestionOutput } from './suggest.js';

describe('normalizeSuggestions', () => {
  it('去掉编号、引号，并限制最多 3 条', () => {
    const items = normalizeSuggestions([
      '1. 只看异常仓库',
      '2、对比上月库存',
      '"生成整改清单"',
      '第四条不会被保留',
    ]);
    expect(items).toEqual(['只看异常仓库', '对比上月库存', '生成整改清单']);
  });

  it('过滤重复、过短和过长内容', () => {
    const items = normalizeSuggestions([
      '查看明细',
      '查看明细',
      '好的',
      '这是一条明显超过二十个字的追问建议内容不需要保留',
    ]);
    expect(items).toEqual(['查看明细']);
  });

  it('空结果返回空数组', () => {
    expect(normalizeSuggestions(null)).toEqual([]);
    expect(normalizeSuggestions([])).toEqual([]);
  });

  it('解析 JSON / 代码块 / 普通行', () => {
    expect(parseSuggestionOutput('{"suggestions":["查看明细","对比上月"]}')).toEqual([
      '查看明细',
      '对比上月',
    ]);
    expect(parseSuggestionOutput('```json\n{"suggestions":["查看明细"]}\n```')).toEqual([
      '查看明细',
    ]);
    expect(parseSuggestionOutput('- 查看明细\n- 对比上月')).toEqual(['查看明细', '对比上月']);
  });
});
