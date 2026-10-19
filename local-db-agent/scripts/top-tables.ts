import sql from 'mssql/msnodesqlv8.js';
import fs from 'node:fs';

const cs = process.env.DB_CONNECTION_STRING ?? '';
const db = process.env.TARGET_DB ?? 'master';
const pool = await sql.connect({ connectionString: cs, requestTimeout: 120000 } as any);
const r = await pool.request().query(
  `SELECT TOP 8 t.name AS n, SUM(p.rows) AS rowsCnt
   FROM [${db}].sys.tables t
   JOIN [${db}].sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1)
   GROUP BY t.name ORDER BY SUM(p.rows) DESC`
);
fs.writeFileSync(
  'scripts/toptables.out.txt',
  (r.recordset as Array<{ n: string; rowsCnt: number }>).map((x) => `${x.n}\t${x.rowsCnt}`).join('\n'),
  'utf8'
);
await pool.close();
