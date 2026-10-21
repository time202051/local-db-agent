import { describe, it, expect } from 'vitest';
import {
  buildVariantHint,
  guessTemplateFromText,
  pickReportVariant,
} from './report-variant.js';
import { reportElementCategory } from './visual-spec.js';

describe('guessTemplateFromText', () => {
  it('识别年度/月报/库存等类型', () => {
    expect(guessTemplateFromText('出一份年度报告')).toBe('annual');
    expect(guessTemplateFromText('本月运营月报')).toBe('monthly');
    expect(guessTemplateFromText('库存呆滞分析')).toBe('inventory');
    expect(guessTemplateFromText('今天随便聊聊')).toBe('auto');
  });
});

describe('pickReportVariant', () => {
  it('年度报告只从时间轴/高层/叙事里选', () => {
    const v = pickReportVariant({
      template: 'annual',
      userText: '出一份年度报告',
      seed: 'conv-1|1',
    });
    expect(['timeline', 'executive', 'narrative']).toContain(v.layout);
    expect(v.visualStyle.length).toBeGreaterThan(0);
    expect(v.featureElements.length).toBeGreaterThanOrEqual(3);
  });

  it('避开上一份的 layout 和 visualStyle', () => {
    const first = pickReportVariant({
      template: 'annual',
      userText: '年度报告',
      seed: 'conv-2|1',
    });
    const second = pickReportVariant({
      template: 'annual',
      userText: '年度报告',
      lastLayout: first.layout,
      lastVisualStyle: first.visualStyle,
      lastElements: first.featureElements,
      seed: 'conv-2|2',
    });
    expect(second.layout).not.toBe(first.layout);
    expect(second.visualStyle).not.toBe(first.visualStyle);
    const overlap = second.featureElements.filter(item => first.featureElements.includes(item));
    expect(overlap.length).toBeLessThanOrEqual(2);
  });

  it('年度特色元素组始终包含数据型与叙事型', () => {
    for (let i = 0; i < 12; i++) {
      const v = pickReportVariant({
        template: 'annual',
        userText: '年度报告',
        seed: `balance-${i}`,
      });
      const data = v.featureElements.filter(
        key => reportElementCategory(key) === 'data',
      ).length;
      const narrative = v.featureElements.filter(
        key => reportElementCategory(key) === 'narrative',
      ).length;
      expect(data).toBeGreaterThanOrEqual(2);
      expect(narrative).toBeGreaterThanOrEqual(2);
    }
  });

  it('相同种子结果稳定', () => {
    const a = pickReportVariant({ template: 'weekly', userText: '周报', seed: 'same|1' });
    const b = pickReportVariant({ template: 'weekly', userText: '周报', seed: 'same|1' });
    expect(a).toEqual(b);
  });
});

describe('buildVariantHint', () => {
  it('包含本轮版式与上一份差异提示', () => {
    const hint = buildVariantHint(
      {
        layout: 'timeline',
        visualStyle: '杂志编辑风',
        featureElements: ['timeline', 'action-list'],
        reason: '',
      },
      {
        layout: 'executive',
        visualStyle: '深色驾驶舱',
        elements: ['report-cover', 'risk-matrix'],
      },
    );
    expect(hint).toContain('layout=timeline');
    expect(hint).toContain('visualStyle=杂志编辑风');
    expect(hint).toContain('本轮报告元素');
    expect(hint).toContain('上一份报告');
    expect(hint).toContain('明显不同');
  });
});
