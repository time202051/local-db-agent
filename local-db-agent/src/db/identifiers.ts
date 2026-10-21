/** 表名通配匹配：pattern 支持尾部 *，可写 table 或 schema.table。 */
export function matchesTablePattern(name: string, schema: string, pattern: string): boolean {
  const target = pattern.includes('.') ? `${schema}.${name}` : name;
  const lowerTarget = target.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  if (lowerPattern.endsWith('*')) {
    return lowerTarget.startsWith(lowerPattern.slice(0, -1));
  }
  return lowerTarget === lowerPattern;
}

export function isHiddenTable(
  table: string,
  schema: string,
  patterns: string[] | undefined,
): boolean {
  if (!patterns || !patterns.length) return false;
  return patterns.some((pattern) => matchesTablePattern(table, schema, pattern));
}

/**
 * 解析 public."WMS_Stocks" / "WMS_Stocks" / WMS_Stocks / dbo.CORE_Stock 之类的入参。
 * 引号内的点不当作分隔符。
 */
export function parseTableName(
  input: string,
  defaultSchema: string,
): { schema: string; table: string } {
  const text = input.trim();
  if (!text) throw new Error('表名不能为空');

  const parts: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === '.' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);

  // SQL Server 也常用 [dbo].[Table] 写法，这里顺手去掉方括号
  const cleaned = parts
    .map((part) => part.trim().replace(/^\[(.*)\]$/, '$1'))
    .filter(Boolean);
  if (!cleaned.length) throw new Error('表名不能为空');
  if (cleaned.length === 1) return { schema: defaultSchema, table: cleaned[0] };
  // 兼容 db.schema.table 的写法，只取最后两段
  return { schema: cleaned[cleaned.length - 2], table: cleaned[cleaned.length - 1] };
}
