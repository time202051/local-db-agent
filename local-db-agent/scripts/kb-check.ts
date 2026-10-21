import { describeDb, resolveRequestConfig } from '../src/config.js';
import {
  closeAllPools,
  getSchema,
  getTableSchema,
  pingDatabase,
  runQuery,
} from '../src/db.js';

const host = process.env.KB_HOST;
const database = process.env.KB_DATABASE;
const user = process.env.KB_USER;
const password = process.env.KB_PASSWORD;
if (!host || !database || !user || !password) {
  console.error(
    '请先设置环境变量 KB_HOST / KB_PORT / KB_DATABASE / KB_USER / KB_PASSWORD 再运行本脚本',
  );
  process.exit(1);
}

const cfg = resolveRequestConfig({
  db: {
    type: 'kingbase',
    server: `${host},${process.env.KB_PORT ?? 54321}`,
    database,
    user,
    password,
    schemas: ['public'],
    blockedTables: ['ID_Users'],
    profile: 'wms',
  },
  llm: { apiKey: 'sk-test' },
  limits: { commandTimeoutSec: 30, maxRows: 200 },
});

console.log('[kb] target:', describeDb(cfg.db));
console.log('[kb] ping:', await pingDatabase(cfg.db));

const schema = await getSchema(cfg.db, { keyword: '库存' });
console.log('[kb] tables:', schema.tableCount, schema.tables.slice(0, 8));

const table = await getTableSchema(cfg.db, 'public."WMS_Stocks"');
console.log(
  '[kb] table:',
  table.table,
  table.comment,
  table.columns.slice(0, 5).map((column) => column.name),
);

const unquoted = await getTableSchema(cfg.db, 'WMS_Stocks');
console.log('[kb] table unquoted:', unquoted.table);

const stats = await runQuery(
  cfg.db,
  'SELECT "InventoryType", count(*) AS n, sum("TotalQty") AS qty ' +
    'FROM public."WMS_Stocks" WHERE "IsDeleted" = false GROUP BY 1 ORDER BY 2 DESC LIMIT 10',
);
console.log('[kb] aggregate:', stats.success, stats.rowCount, stats.rows);

const cte = await runQuery(cfg.db, 'WITH x AS (SELECT 1 AS a) SELECT * FROM x');
console.log('[kb] cte:', cte.success, cte.rows, cte.error);

const truncated = await runQuery(cfg.db, 'SELECT "Id" FROM public."WMS_Stocks"');
console.log('[kb] limit:', truncated.success, truncated.rowCount, 'truncated=', truncated.truncated);

const blocked = await runQuery(cfg.db, 'SELECT * FROM public."ID_Users"');
console.log('[kb] blocked table:', blocked.error);

const write = await runQuery(cfg.db, 'DELETE FROM public."WMS_Stocks"');
console.log('[kb] write blocked:', write.error);

await closeAllPools();
