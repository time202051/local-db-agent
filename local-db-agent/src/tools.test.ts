import { describe, it, expect } from 'vitest';
import { TurnBudget } from './budget.js';
import {
  extractChartIds,
  normalizeHtmlReportInput,
  validateChartOption,
  validateHtmlTables,
  validateReportCharts,
} from './tools.js';

const TH6 =
  '<th>月份</th><th class="num">入库</th><th class="num">出库</th>' +
  '<th class="num">合计</th><th class="num">完成率</th><th class="txt">状态</th>';

describe('validateHtmlTables', () => {
  it('放行列数一致的表', () => {
    const html =
      '<table><thead><tr>' +
      TH6 +
      '</tr></thead><tbody><tr><td>2024-01</td><td class="num">1</td><td class="num">2</td>' +
      '<td class="num">3</td><td class="num">90%</td><td class="txt">达标</td></tr></tbody></table>';
    expect(validateHtmlTables(html)).toBeNull();
  });

  it('拦住缺单元格的行（状态徽章会错位）', () => {
    const html =
      '<table><thead><tr>' +
      TH6 +
      '</tr></thead><tbody><tr><td>2024-08</td><td class="num">19780</td>' +
      '<td class="num">40240</td><td class="num">88.3%</td><td class="txt">预警</td></tr></tbody></table>';
    expect(validateHtmlTables(html)).toContain('只有 5 个单元格');
  });

  it('正确计算 colspan', () => {
    const html =
      '<table><thead><tr><th>a</th><th>b</th><th>c</th></tr></thead>' +
      '<tbody><tr><td colspan="2">x</td><td>y</td></tr></tbody></table>';
    expect(validateHtmlTables(html)).toBeNull();
  });
});

describe('extractChartIds', () => {
  it('按任意属性顺序提取 data-id', () => {
    const html =
      '<div data-id="c1" class="ol-chart" style="height:300px"></div>' +
      '<div class="card"><div class="ol-chart" data-id="c2"></div></div>';
    expect(extractChartIds(html)).toEqual(['c1', 'c2']);
  });
});

describe('validateChartOption', () => {
  it('放行有 series + data 的直角坐标图', () => {
    expect(
      validateChartOption({
        xAxis: { type: 'category', data: ['a'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [1] }],
      }),
    ).toBeNull();
  });

  it('缺少 series / data / 坐标轴都要报错', () => {
    expect(validateChartOption({})).toContain('series');
    expect(validateChartOption({ series: [{ type: 'bar', data: [] }] })).toContain('没有数据');
    expect(validateChartOption({ series: [{ type: 'bar', data: [1] }] })).toContain('xAxis');
  });

  it('饼图不需要坐标轴', () => {
    expect(
      validateChartOption({ series: [{ type: 'pie', data: [{ name: 'A', value: 1 }] }] }),
    ).toBeNull();
  });
});

describe('validateReportCharts', () => {
  const html =
    '<div class="ol-chart" data-id="c1"></div><div class="ol-chart" data-id="c2"></div>';

  it('缺少 option 时报错', () => {
    expect(validateReportCharts(html, { c1: { series: [{ data: [1] }] } })).toContain('c2');
  });

  it('option 都合法时通过', () => {
    expect(
      validateReportCharts(html, {
        c1: { series: [{ type: 'pie', data: [{ value: 1 }] }] },
        c2: { series: [{ type: 'pie', data: [{ value: 2 }] }] },
      }),
    ).toBeNull();
  });
});

describe('normalizeHtmlReportInput', () => {
  it('兼容中文模板 / 字符串数组 / 320px / JSON 字符串 charts', () => {
    const n = normalizeHtmlReportInput({
      title: '测试',
      template: '周报',
      sources: '表A,表B、表C',
      warnings: '结果被截断',
      height: '320px',
      charts: JSON.stringify({ c1: { series: [{ type: 'pie', data: [{ value: 1 }] }] } }),
      html: '<div class="ol-chart" data-id="c1"></div>',
    });
    expect(n.template).toBe('weekly');
    expect(n.sources).toEqual(['表A', '表B', '表C']);
    expect(n.warnings).toEqual(['结果被截断']);
    expect(n.height).toBe(320);
    expect(n.charts).toEqual({ c1: { series: [{ type: 'pie', data: [{ value: 1 }] }] } });
  });

  it('格式问题只进 warnings，绝不抛错', () => {
    const n = normalizeHtmlReportInput({
      html:
        '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>' +
        '<div class="ol-chart" data-id="c9"></div>',
      charts: {},
    });
    expect(n.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('TurnBudget', () => {
  it('SQL 次数超限后返回提示而不是抛错', () => {
    const b = new TurnBudget({
      maxSqlQueries: 1,
      maxSchemaCalls: 1,
      maxResultChars: 1000,
      maxTotalToolChars: 2000,
    });
    expect(b.takeSqlQuery()).toBeNull();
    expect(b.takeSqlQuery()).toContain('上限');
    expect(b.usage.sqlQueries).toBe(1);
    expect(b.usage.exceeded.length).toBe(1);
  });

  it('输出字符总量超限时拦截', () => {
    const b = new TurnBudget({
      maxSqlQueries: 3,
      maxSchemaCalls: 3,
      maxResultChars: 1000,
      maxTotalToolChars: 100,
    });
    expect(b.takeChars(60)).toBeNull();
    expect(b.takeChars(60)).toContain('上限');
    expect(b.usage.totalChars).toBe(60);
  });
});
