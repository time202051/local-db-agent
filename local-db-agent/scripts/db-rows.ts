import sql from 'mssql/msnodesqlv8.js';
import fs from 'node:fs';

const cs = process.env.DB_CONNECTION_STRING ?? '';
const out = 'scripts/rows.out.txt';

try {
  const pool = await sql.connect({ connectionString: cs, requestTimeout: 180000 } as any);
  const dbs = (
    await pool
      .request()
      .query('SELECT name FROM sys.databases WHERE database_id > 4 AND state = 0 ORDER BY name')
  ).recordset.map((x: any) => x.name as string);

  const unions = dbs
    .map(
      (d: string) =>
        `SELECT '${d.replace(/'/g, "''")}' AS Db, ` +
        `(SELECT COUNT(*) FROM [${d}].sys.tables) AS TblCnt, ` +
        `(SELECT ISNULL(SUM(p.rows),0) FROM [${d}].sys.partitions p JOIN [${d}].sys.tables t ON t.object_id=p.object_id WHERE p.index_id IN (0,1)) AS RowsCnt`,
    )
    .join(' UNION ALL ');

  const r = await pool.request().query(unions + ' ORDER BY RowsCnt DESC');
  const rows = (r.recordset as Array<{ Db: string; TblCnt: number; RowsCnt: number }>).map(
    (x) => `${x.Db}\t${x.TblCnt}\t${x.RowsCnt}`,
  );
  fs.writeFileSync(out, 'Db\tTbl\tRows\n' + rows.join('\n'), 'utf8');
  await pool.close();
} catch (e: any) {
  fs.writeFileSync(out, 'ERROR\n' + (e?.stack ?? String(e)), 'utf8');
}
