import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getKnowledgeStatus, loadKnowledgePack, reloadKnowledgePack } from './knowledge.js';

const dir = mkdtempSync(join(tmpdir(), 'agent-knowledge-'));

mkdirSync(join(dir, 'docs'), { recursive: true });
mkdirSync(join(dir, 'queries'), { recursive: true });
mkdirSync(join(dir, 'reports'), { recursive: true });

writeFileSync(
  join(dir, 'manifest.json'),
  JSON.stringify({
    name: 'demo',
    description: '测试知识包',
    priorityTables: ['CORE_Order'],
    tables: {
      CORE_Order: {
        comment: '单据主表',
        aliases: ['出库单'],
        keyColumns: ['OrderName', 'AddTime'],
        relationships: [{ to: 'CORE_OrderDetail', on: 'ID = OrderID' }],
        doc: 'docs/order.md',
      },
    },
  }),
  'utf8',
);
writeFileSync(
  join(dir, 'docs', 'order.md'),
  '# 单据表\n\n## 口径\n出库单用 OrderType = 0。\n',
  'utf8',
);
writeFileSync(
  join(dir, 'reports', 'weekly.md'),
  '# 周报\n\n## 结构\n核心结论 → 趋势 → 风险。\n',
  'utf8',
);
writeFileSync(
  join(dir, 'queries', 'outbound.json'),
  JSON.stringify({
    key: 'outbound_orders',
    label: '出库单量',
    sql: { sqlserver: 'SELECT COUNT(*) AS value FROM CORE_Order', kingbase: 'SELECT 1 AS value' },
    params: [],
    tables: ['CORE_Order'],
  }),
  'utf8',
);

const emptyDir = mkdtempSync(join(tmpdir(), 'agent-knowledge-empty-'));
const emptyPackDir = mkdtempSync(join(tmpdir(), 'agent-knowledge-emptypack-'));
writeFileSync(
  join(emptyPackDir, 'manifest.json'),
  JSON.stringify({ name: 'empty', description: '空包' }),
  'utf8',
);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(emptyDir, { recursive: true, force: true });
  rmSync(emptyPackDir, { recursive: true, force: true });
  reloadKnowledgePack();
});

describe('knowledge pack', () => {
  it('加载 manifest/docs/queries/reports 并生成索引', () => {
    const pack = loadKnowledgePack(dir);
    expect(pack).not.toBeNull();
    expect(pack?.manifest.name).toBe('demo');
    expect(pack?.docs).toHaveLength(1);
    expect(pack?.reports).toHaveLength(1);
    expect(pack?.queries).toHaveLength(1);
    expect(pack?.indexText).toContain('单据表');
    expect(pack?.indexText).toContain('outbound_orders');
    expect(getKnowledgeStatus()).toMatchObject({ loaded: true, name: 'demo' });
  });

  it('search/read/getQuery 可用', () => {
    const pack = loadKnowledgePack(dir);
    const hits = pack?.search('出库', 5) || [];
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].path).toBe('docs/order.md');
    expect(pack?.read('docs/order.md')).toContain('出库单');
    expect(pack?.getQuery('outbound_orders')?.label).toBe('出库单量');
    expect(pack?.getQuery('missing')).toBeUndefined();
  });

  it('拒绝路径穿越', () => {
    const pack = loadKnowledgePack(dir);
    expect(pack?.read('../manifest.json')).toBeNull();
    expect(pack?.read('/etc/passwd')).toBeNull();
  });

  it('没有 manifest 时降级为无知识包', () => {
    const pack = loadKnowledgePack(emptyDir);
    expect(pack).toBeNull();
    expect(getKnowledgeStatus().loaded).toBe(false);
  });

  it('空知识包视为无包，不注入占位提示', () => {
    const pack = loadKnowledgePack(emptyPackDir);
    expect(pack).toBeNull();
    expect(getKnowledgeStatus()).toMatchObject({
      loaded: false,
      name: 'empty',
    });
  });
});
