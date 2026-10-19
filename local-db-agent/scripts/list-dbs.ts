import sql from 'mssql/msnodesqlv8.js';
import fs from 'node:fs';

const cs = process.env.DB_CONNECTION_STRING ?? '';
const out = 'scripts/dbs.out.txt';

try {
  const pool = await sql.connect({ connectionString: cs } as any);
  const r = await pool
    .request()
    .query('SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name');
  fs.writeFileSync(
    out,
    'OK\n' +
      JSON.stringify(
        r.recordset.map((x: any) => x.name),
        null,
        2,
      ),
    'utf8',
  );
  await pool.close();
} catch (e: any) {
  fs.writeFileSync(out, 'ERROR\n' + (e?.stack ?? String(e)), 'utf8');
}
