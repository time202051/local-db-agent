/**
 * Generic SQL Server missing-index advisor.
 *
 * Read-only: queries the DMVs and prints CREATE INDEX drafts.
 * It does not create indexes. DBA should review before executing.
 *
 * Usage:
 *   $env:DB_CONNECTION_STRING='Driver={ODBC Driver 17 for SQL Server};Server=...;Database=...;Uid=...;Pwd=...;TrustServerCertificate=Yes'
 *   npm run index-advisor
 */
import { writeFileSync } from 'node:fs';

interface MissingIndexRow {
  table_name: string;
  schema_name: string;
  equality_columns: string | null;
  inequality_columns: string | null;
  included_columns: string | null;
  score: number;
}

function columns(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.replace(/\[|\]/g, '').trim())
    .filter(Boolean);
}

function quote(name: string): string {
  return `[${name.replace(/\]/g, ']]')}]`;
}

async function main() {
  const connectionString = process.env.DB_CONNECTION_STRING;
  if (!connectionString) {
    console.error('缺少 DB_CONNECTION_STRING');
    process.exit(1);
  }
  const m = (await import('mssql/msnodesqlv8.js')) as unknown as {
    default?: unknown;
  } & Record<string, unknown>;
  const sql = (m.default ?? m) as {
    ConnectionPool: new (config: { connectionString: string }) => {
      connect: () => Promise<unknown>;
      request: () => { query: (text: string) => Promise<{ recordset: MissingIndexRow[] }> };
      close: () => Promise<void>;
    };
  };
  const pool = new sql.ConnectionPool({ connectionString });
  await pool.connect();
  try {
    const result = await pool.request().query(`
      SELECT TOP 50
        OBJECT_SCHEMA_NAME(d.object_id) AS schema_name,
        OBJECT_NAME(d.object_id) AS table_name,
        d.equality_columns,
        d.inequality_columns,
        d.included_columns,
        CAST(gs.avg_total_user_cost * gs.avg_user_impact *
             (gs.user_seeks + gs.user_scans) AS decimal(18,2)) AS score
      FROM sys.dm_db_missing_index_details d
      JOIN sys.dm_db_missing_index_groups g
        ON g.index_handle = d.index_handle
      JOIN sys.dm_db_missing_index_group_stats gs
        ON gs.group_handle = g.index_group_handle
      WHERE d.database_id = DB_ID()
      ORDER BY score DESC
    `);
    const lines: string[] = [
      `-- Missing index suggestions (${new Date().toISOString()})`,
      '-- Review with DBA before executing. Do not run blindly on production.',
    ];
    for (const row of result.recordset) {
      const eq = columns(row.equality_columns);
      const ineq = columns(row.inequality_columns);
      const include = columns(row.included_columns);
      const key = [...eq, ...ineq];
      if (!key.length) continue;
      const name = `IX_${row.table_name}_${key.slice(0, 3).join('_')}`.replace(
        /[^A-Za-z0-9_]/g,
        '_',
      );
      lines.push(
        `\n-- score=${row.score} table=${row.schema_name}.${row.table_name}` +
          (eq.length ? ` equality=${eq.join(',')}` : '') +
          (ineq.length ? ` inequality=${ineq.join(',')}` : ''),
      );
      lines.push(
        `CREATE NONCLUSTERED INDEX ${quote(name)} ON ${quote(row.schema_name)}.${quote(
          row.table_name,
        )} (${key.map(quote).join(', ')})` +
          (include.length ? ` INCLUDE (${include.map(quote).join(', ')})` : '') +
          ';',
      );
    }
    const output = lines.join('\n');
    console.log(output);
    writeFileSync('scripts/index-advisor.out.sql', output, 'utf8');
    console.log('\n[written] scripts/index-advisor.out.sql');
  } finally {
    await pool.close();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
