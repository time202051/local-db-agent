import fs from 'node:fs';
import type { DbRuntime } from '../src/config.js';
import { getSchema, runQuery, closeAllPools } from '../src/db.js';

const connectionString = process.env.DB_CONNECTION_STRING;
if (!connectionString) {
  console.error('请先设置环境变量 DB_CONNECTION_STRING 再运行本脚本');
  process.exit(1);
}
const db: DbRuntime = { connectionString, requestTimeoutMs: 15000, costLimit: 30, maxRows: 200 };

const schema = await getSchema(db);
const output: Record<string, unknown> = {
  database: schema.database,
  tableCount: schema.tables.length,
  tables: schema.tables.map((t) => t.name),
};

output.aggregateQuery = await runQuery(
  db,
  'SELECT City, COUNT(*) AS CustomerCount FROM Customers GROUP BY City ORDER BY CustomerCount DESC',
);
output.chineseFilter = await runQuery(db, "SELECT Name, City FROM Customers WHERE City = '北京'");
output.blockedWrite = await runQuery(db, 'DELETE FROM Customers');

fs.writeFileSync('scripts/smoke.out.txt', JSON.stringify(output, null, 2), 'utf8');
await closeAllPools();
