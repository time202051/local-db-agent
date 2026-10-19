import sql from 'mssql/msnodesqlv8.js';
import fs from 'node:fs';

const connectionString =
  process.env.DB_CONNECTION_STRING ??
  'Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=AgentKit;Trusted_Connection=Yes;TrustServerCertificate=Yes';

try {
  const pool = await sql.connect({ connectionString } as any);
  const result = await pool.request().query('SELECT TOP 3 Name, City FROM Customers');
  fs.writeFileSync(
    'scripts/db-check.out.txt',
    'OK\n' + JSON.stringify(result.recordset, null, 2),
    'utf8',
  );
  await pool.close();
} catch (err: any) {
  fs.writeFileSync(
    'scripts/db-check.out.txt',
    'ERROR\n' +
      (err && err.stack ? err.stack : String(err)) +
      '\n\nmessage: ' +
      (err && err.message),
    'utf8',
  );
}
