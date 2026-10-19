import sql from 'mssql/msnodesqlv8.js';
import fs from 'node:fs';

const cs = process.env.DB_CONNECTION_STRING ?? '';
const out = 'scripts/stats.out.txt';

try {
  const pool = await sql.connect({ connectionString: cs } as any);
  const dbs = (
    await pool
      .request()
      .query('SELECT name FROM sys.databases WHERE database_id > 4 AND state = 0 ORDER BY name')
  ).recordset.map((x: any) => x.name as string);

  const unions = dbs
    .map(
      (d: string) =>
        `SELECT '${d.replace(/'/g, "''")}' AS Db, COUNT(*) AS Tbl FROM [${d}].sys.tables`,
    )
    .join(' UNION ALL ');

  const r = await pool.request().query(unions + ' ORDER BY Db');
  const rows = (r.recordset as Array<{ Db: string; Tbl: number }>).map((x) => `${x.Db}\t${x.Tbl}`);
  fs.writeFileSync(out, 'OK\n' + rows.join('\n'), 'utf8');
  await pool.close();
} catch (e: any) {
  fs.writeFileSync(out, 'ERROR\n' + (e?.stack ?? String(e)), 'utf8');
}
