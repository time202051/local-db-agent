import fs from 'node:fs';
import type { DbRuntime } from '../src/config.js';
import { runQuery, closeAllPools } from '../src/db.js';

const connectionString = process.env.DB_CONNECTION_STRING;
if (!connectionString) {
  console.error('请先设置环境变量 DB_CONNECTION_STRING 再运行本脚本');
  process.exit(1);
}
const db: DbRuntime = {
  type: 'sqlserver',
  connectionString,
  requestTimeoutMs: 15000,
  costLimit: 30,
  maxRows: 200,
  schemas: [],
  hiddenTables: [],
  blockedTables: [],
  profile: 'wms',
  businessPrompt: '',
};

const sql =
  process.argv[2] ?? 'SELECT COUNT(*) AS c FROM CORE_TaskList a CROSS JOIN CORE_TaskList b';
const r = await runQuery(db, sql);
fs.writeFileSync('scripts/guard.out.txt', JSON.stringify(r, null, 2).slice(0, 900), 'utf8');
await closeAllPools();
