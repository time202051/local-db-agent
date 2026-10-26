import type { TurnBudget } from './budget.js';

/**
 * 报告数值对账：
 * 只校验 coverage 里明确写了 value 的 ok 项，且只认“直接出现在本轮 SQL 结果里”的数值。
 * 百分比/比率等派生值先跳过，避免误报。
 */

export interface CoverageEntryLike {
  item?: string;
  status?: string;
  source?: string | string[];
  note?: string;
  value?: number | string;
  unit?: string;
}

export interface NumberCheckResult {
  checked: number;
  matched: number;
  skipped: number;
  mismatches: string[];
  warnings: string[];
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** 把 “1,234.5 万” / “98.5%” / “12.3亿” 归一化成数值；百分比返回 null。 */
export function normalizeNumber(value: unknown, unit?: string): number | null {
  const unitText = String(unit || '');
  if (unitText.includes('%')) return null;

  let text = '';
  let multiplier = 1;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
    if (!text || text.includes('%')) return null;
    if (text.includes('亿')) multiplier *= 1e8;
    else if (text.includes('万')) multiplier *= 1e4;
    else if (text.includes('千')) multiplier *= 1e3;
  } else {
    return null;
  }

  if (unitText.includes('亿')) multiplier *= 1e8;
  else if (unitText.includes('万')) multiplier *= 1e4;
  else if (unitText.includes('千')) multiplier *= 1e3;

  const cleaned = text.replace(/[,，\s]/g, '').replace(/[^\d.+-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return round(parsed * multiplier);
}

function addNumber(index: Set<number>, value: number): void {
  if (!Number.isFinite(value)) return;
  index.add(round(value));
  index.add(round(Math.abs(value)));
}

function collectFromCell(index: Set<number>, cell: unknown): void {
  if (typeof cell === 'number') {
    addNumber(index, cell);
    return;
  }
  if (typeof cell === 'string') {
    const normalized = normalizeNumber(cell);
    if (normalized !== null) addNumber(index, normalized);
    return;
  }
  if (Array.isArray(cell)) {
    for (const item of cell) collectFromCell(index, item);
    return;
  }
  if (cell && typeof cell === 'object') {
    for (const item of Object.values(cell as Record<string, unknown>)) {
      collectFromCell(index, item);
    }
  }
}

/** 从本轮所有 SQL 结果里收集数值索引。 */
export function buildNumberIndex(budget: TurnBudget): Set<number> {
  const index = new Set<number>();
  for (const result of budget.queryResults.values()) {
    for (const row of result.rows) {
      if (Array.isArray(row)) {
        for (const cell of row) collectFromCell(index, cell);
      } else {
        collectFromCell(index, row);
      }
    }
  }
  return index;
}

function matches(index: Set<number>, value: number): boolean {
  const tolerance = Math.max(0.01, Math.abs(value) * 0.001);
  for (const candidate of index) {
    if (Math.abs(candidate - value) <= tolerance) return true;
  }
  return false;
}

function sourceText(source: string | string[] | undefined): string {
  if (Array.isArray(source)) return source.join(' ');
  return source || '';
}

/**
 * 校验 coverage 中 ok 项的 value 是否来自本轮查询结果。
 * @param strict 仅用于返回结果；是否阻断由调用方决定。
 */
export function validateCoverageNumbers(
  coverage: CoverageEntryLike[] | undefined,
  budget: TurnBudget,
  strict = false,
): NumberCheckResult {
  const result: NumberCheckResult = {
    checked: 0,
    matched: 0,
    skipped: 0,
    mismatches: [],
    warnings: [],
  };
  if (!coverage?.length) return result;

  const index = buildNumberIndex(budget);
  for (const entry of coverage) {
    if (entry.status !== 'ok') continue;
    const source = sourceText(entry.source);
    if (!source) {
      result.warnings.push(`${entry.item || '未命名指标'} 缺少数据来源`);
    } else if (!/(q-|saved-|WMS_|SAP_|SRM_|MES_|public\.)/i.test(source)) {
      result.warnings.push(`${entry.item || '未命名指标'} 的来源未包含 queryId 或表名`);
    }

    if (entry.value === undefined || entry.value === null) continue;
    if (String(entry.unit || '').includes('%') || String(entry.value).includes('%')) {
      result.skipped += 1;
      continue;
    }

    const normalized = normalizeNumber(entry.value, entry.unit);
    if (normalized === null) {
      result.skipped += 1;
      continue;
    }
    result.checked += 1;
    if (matches(index, normalized)) {
      result.matched += 1;
    } else {
      result.mismatches.push(
        `${entry.item || '未命名指标'}：${String(entry.value)}${entry.unit || ''} 未在本轮查询结果中找到`,
      );
    }
  }

  if (strict && result.mismatches.length) {
    // strict 只作为调用方判断依据，这里不抛错。
  }
  return result;
}

export function formatNumberCheck(result: NumberCheckResult): string {
  return (
    `numberCheck checked=${result.checked} matched=${result.matched} ` +
    `skipped=${result.skipped} mismatches=${result.mismatches.length}`
  );
}
