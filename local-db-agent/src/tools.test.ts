import { describe, it, expect } from 'vitest';
import { TurnBudget } from './budget.js';
import {
  analyzeReportRichness,
  extractChartIds,
  extractChartTypes,
  extractReportElements,
  normalizeHtmlReportInput,
  normalizeLayout,
  normalizeVisualStyle,
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

describe('analyzeReportRichness', () => {
  it('区分数据型与叙事型元素', () => {
    const html =
      '<section class="section"><div class="hero-kpi"></div><div class="heat-table"></div>' +
      '<div class="report-cover"></div><div class="finding-list"></div><div class="timeline"></div>' +
      '<table></table></section>';
    const r = analyzeReportRichness(html, { c1: { series: [{ type: 'line', data: [1] }] } });
    expect(r.dataElements).toEqual(['hero-kpi', 'heat-table']);
    expect(r.narrativeElements).toEqual(['report-cover', 'finding-list', 'timeline']);
    expect(r.sections).toBe(1);
    expect(r.tables).toBe(1);
    expect(r.chartTypes).toEqual(['line']);
  });
});

describe('extractChartTypes', () => {
  it('统计图表 series 类型并去重', () => {
    expect(
      extractChartTypes({
        c1: { series: [{ type: 'line', data: [1] }] },
        c2: { series: [{ type: 'bar', data: [1] }, { type: 'line', data: [2] }] },
      }),
    ).toEqual(['line', 'bar']);
  });
});

describe('extractReportElements', () => {
  it('从 HTML class 中提取已知元素', () => {
    const html =
      '<div class="report-cover"><div class="timeline"></div></div>' +
      '<div class="risk-matrix"></div><div class="custom-class"></div>';
    expect(extractReportElements(html)).toEqual(['report-cover', 'timeline', 'risk-matrix']);
  });

  it('忽略未知 class 与重复项', () => {
    expect(extractReportElements('<div class="timeline timeline custom"></div>')).toEqual([
      'timeline',
    ]);
  });
});

describe('normalizeLayout', () => {
  it('兼容英文 key 与中文别名', () => {
    expect(normalizeLayout('timeline')).toBe('timeline');
    expect(normalizeLayout('时间轴复盘')).toBe('timeline');
    expect(normalizeLayout('给领导看的高层摘要')).toBe('executive');
    expect(normalizeLayout('多仓横向对比')).toBe('comparison');
  });

  it('未知值回落到 auto', () => {
    expect(normalizeLayout('随便')).toBe('auto');
    expect(normalizeLayout(undefined)).toBe('auto');
  });
});

describe('normalizeVisualStyle', () => {
  it('去空格并限制长度', () => {
    expect(normalizeVisualStyle('  深色驾驶舱  ')).toBe('深色驾驶舱');
    expect(normalizeVisualStyle('x'.repeat(200)).length).toBe(120);
  });
});

describe('normalizeHtmlReportInput', () => {
  it('兼容中文模板 / 字符串数组 / 320px / JSON 字符串 charts', () => {
    const n = normalizeHtmlReportInput({
      title: '测试',
      template: '周报',
      layout: '看板',
      visualStyle: '深色驾驶舱',
      css: '  .report{background:#000}  ',
      sources: '表A,表B、表C',
      warnings: '结果被截断',
      height: '320px',
      charts: JSON.stringify({ c1: { series: [{ type: 'pie', data: [{ value: 1 }] }] } }),
      html: '<div class="ol-chart" data-id="c1"></div>',
    });
    expect(n.template).toBe('weekly');
    expect(n.layout).toBe('dashboard');
    expect(n.visualStyle).toBe('深色驾驶舱');
    expect(n.css).toBe('.report{background:#000}');
    expect(n.sources).toEqual(['表A', '表B', '表C']);
    expect(n.warnings).toEqual(['结果被截断']);
    expect(n.height).toBe(320);
    expect(n.charts).toEqual({ c1: { series: [{ type: 'pie', data: [{ value: 1 }] }] } });
  });

  it('合并声明元素与 HTML 中自动提取的元素', () => {
    const n = normalizeHtmlReportInput({
      html: '<div class="timeline"></div><div class="hero-kpi"></div>',
      elements: ['action-list', 'unknown-element'],
    });
    expect(n.elements).toEqual(['action-list', 'timeline', 'hero-kpi']);
  });

  it('年度报告别名归一化为 annual', () => {
    expect(normalizeHtmlReportInput({ html: '<div></div>', template: '年度总结' }).template).toBe(
      'annual',
    );
    expect(normalizeHtmlReportInput({ html: '<div></div>', template: '年报' }).template).toBe(
      'annual',
    );
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
