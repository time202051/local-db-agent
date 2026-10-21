import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { assertReadOnly } from '../sql-guard.js';
import { isHiddenTable as isHidden, parseTableName } from './identifiers.js';
// 连接池按"连接信息"缓存：不同请求可能指向不同的库（前端下发）
const pools = new Map();
const POOL_TTL_MS = 30 * 60 * 1000;
const MAX_POOLS = 8;
function quoteIdent(value) {
    return `"${value.replace(/"/g, '""')}"`;
}
function qualifiedName(schema, table) {
    return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}
function poolKey(db) {
    const passwordHash = createHash('sha1').update(db.password).digest('hex').slice(0, 12);
    return `${db.host}:${db.port}/${db.database}/${db.user}/${passwordHash}`;
}
function closeEntry(entry) {
    entry.promise
        .then((pool) => pool.end())
        .catch(() => {
        /* ignore */
    });
}
function evictStale() {
    const now = Date.now();
    for (const [key, entry] of pools) {
        if (now - entry.lastUsed > POOL_TTL_MS) {
            pools.delete(key);
            closeEntry(entry);
        }
    }
}
function evictOldest() {
    let oldestKey = null;
    let oldest = Infinity;
    for (const [key, entry] of pools) {
        if (entry.lastUsed < oldest) {
            oldest = entry.lastUsed;
            oldestKey = key;
        }
    }
    if (oldestKey !== null) {
        const entry = pools.get(oldestKey);
        pools.delete(oldestKey);
        if (entry)
            closeEntry(entry);
    }
}
function serverOptions(db) {
    const schemas = (db.schemas.length ? db.schemas : ['public'])
        .map((schema) => quoteIdent(schema))
        .join(',');
    return [
        '-c default_transaction_read_only=on',
        `-c statement_timeout=${db.requestTimeoutMs}`,
        '-c lock_timeout=5000',
        '-c idle_in_transaction_session_timeout=60000',
        '-c client_encoding=UTF8',
        `-c search_path=${schemas}`,
        '-c application_name=agent-local',
    ].join(' ');
}
async function createPool(db) {
    const pool = new Pool({
        host: db.host,
        port: db.port,
        database: db.database,
        user: db.user,
        password: db.password,
        ssl: db.ssl ? { rejectUnauthorized: false } : false,
        max: 3,
        idleTimeoutMillis: 5 * 60 * 1000,
        connectionTimeoutMillis: 12000,
        keepAlive: true,
        options: serverOptions(db),
    });
    const check = await pool.query("SELECT current_setting('default_transaction_read_only') AS ro, " +
        "current_setting('transaction_read_only') AS tro, " +
        'current_database() AS db, current_setting(\'server_version\') AS version');
    const ro = String(check.rows[0]?.ro ?? '');
    if (ro !== 'on') {
        await pool.end().catch(() => { });
        throw new Error('金仓只读会话未生效（default_transaction_read_only != on），已拒绝服务');
    }
    pool.on('error', (err) => {
        console.error('[db:kingbase] pool error:', err.message);
    });
    return pool;
}
async function getPool(db) {
    const key = poolKey(db);
    evictStale();
    let entry = pools.get(key);
    if (!entry) {
        const promise = createPool(db).catch((err) => {
            // 失败后清空缓存，避免后续永远复用失败的 Promise
            pools.delete(key);
            throw err;
        });
        entry = { promise, lastUsed: Date.now() };
        pools.set(key, entry);
        if (pools.size > MAX_POOLS)
            evictOldest();
    }
    entry.lastUsed = Date.now();
    return entry.promise;
}
function oneLine(sqlText) {
    return sqlText.replace(/\s+/g, ' ').slice(0, 200);
}
function friendlyError(message) {
    if (/read-only transaction|cannot execute .* in a read-only transaction/i.test(message)) {
        return '只读模式已阻止写操作。当前 agent 只允许查询数据。';
    }
    if (/relation .* does not exist/i.test(message)) {
        return '表名不存在。金仓表名区分大小写，请使用双引号，例如 public."WMS_Stocks"。';
    }
    if (/column .* does not exist/i.test(message)) {
        return '字段不存在。请先调用 get_table_schema 查看真实字段名，并注意双引号。';
    }
    if (/statement timeout|canceling statement due to statement timeout/i.test(message)) {
        return '查询超时。请缩小时间范围，或先做 GROUP BY / LIMIT 聚合。';
    }
    if (/syntax error.*\btop\b|at or near "top"/i.test(message)) {
        return '金仓不支持 TOP，请改用 LIMIT。';
    }
    if (/function .* does not exist/i.test(message)) {
        return '函数不存在。金仓是 PostgreSQL 语法，日期函数请用 now()/date_trunc/to_char。';
    }
    return message;
}
/** 读取目标库的表清单（只展示 db.schemas 指定 schema 下的业务表）。 */
export async function getSchema(db, options = {}) {
    const pool = await getPool(db);
    const schemas = db.schemas.length ? db.schemas : ['public'];
    const keyword = (options.keyword ?? '').trim().toLowerCase();
    const dbNameResult = await pool.query('SELECT current_database() AS db');
    const database = String(dbNameResult.rows[0]?.db ?? '');
    const result = await pool.query(`SELECT t.table_schema,
            t.table_name,
            COUNT(c.column_name)::int AS column_count,
            obj_description(pc.oid) AS comment
     FROM information_schema.tables t
     LEFT JOIN information_schema.columns c
       ON c.table_schema = t.table_schema AND c.table_name = t.table_name
     LEFT JOIN pg_namespace n ON n.nspname = t.table_schema
     LEFT JOIN pg_class pc ON pc.relnamespace = n.oid AND pc.relname = t.table_name
     WHERE t.table_type = 'BASE TABLE' AND t.table_schema = ANY($1::text[])
     GROUP BY t.table_schema, t.table_name, pc.oid
     ORDER BY t.table_schema, t.table_name`, [schemas]);
    const tables = [];
    for (const row of result.rows) {
        const schema = String(row.table_schema);
        const table = String(row.table_name);
        const comment = row.comment == null ? null : String(row.comment);
        if (isHidden(table, schema, db.hiddenTables))
            continue;
        if (isHidden(table, schema, db.blockedTables))
            continue;
        if (keyword && !`${table} ${comment ?? ''}`.toLowerCase().includes(keyword))
            continue;
        tables.push({
            name: qualifiedName(schema, table),
            schema,
            columnCount: Number(row.column_count ?? 0),
            comment,
        });
    }
    return { database, tableCount: tables.length, tables };
}
export { parseTableName } from './identifiers.js';
/** 取单张表的字段（按需调用，避免一次性拉全库字段）。 */
export async function getTableSchema(db, tableName) {
    const pool = await getPool(db);
    const schemas = db.schemas.length ? db.schemas : ['public'];
    const parsed = parseTableName(tableName, schemas[0] ?? 'public');
    if (!schemas.includes(parsed.schema)) {
        throw new Error(`表不在允许的 schema 中：${parsed.schema}（允许：${schemas.join(', ')}）`);
    }
    const dbNameResult = await pool.query('SELECT current_database() AS db');
    const database = String(dbNameResult.rows[0]?.db ?? '');
    const found = await pool.query(`SELECT c.relname AS table_name, obj_description(c.oid) AS comment
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND lower(c.relname) = lower($2) AND c.relkind IN ('r', 'p')
     ORDER BY c.relname
     LIMIT 1`, [parsed.schema, parsed.table]);
    if (!found.rows.length) {
        throw new Error(`表不存在：${parsed.schema}.${parsed.table}`);
    }
    const actualTable = String(found.rows[0].table_name);
    if (isHidden(actualTable, parsed.schema, db.blockedTables)) {
        throw new Error(`不允许查看表：${parsed.schema}.${actualTable}`);
    }
    const tableComment = found.rows[0].comment == null ? null : String(found.rows[0].comment);
    const result = await pool.query(`SELECT a.attname AS column_name,
            format_type(a.atttypid, a.atttypmod) AS data_type,
            (NOT a.attnotnull) AS nullable,
            col_description(a.attrelid, a.attnum) AS comment
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum`, [parsed.schema, actualTable]);
    const columns = result.rows.map((row) => ({
        name: quoteIdent(String(row.column_name)),
        type: String(row.data_type),
        nullable: row.nullable === true,
        comment: row.comment == null ? null : String(row.comment),
    }));
    return {
        database,
        table: qualifiedName(parsed.schema, actualTable),
        comment: tableComment,
        columns,
    };
}
export async function runQuery(db, sqlText) {
    const started = Date.now();
    try {
        const guardError = assertReadOnly(sqlText, 'kingbase', db.blockedTables);
        if (guardError) {
            return {
                success: false,
                error: guardError,
                columns: [],
                rows: [],
                rowCount: 0,
                truncated: false,
                elapsedMs: Date.now() - started,
            };
        }
        const pool = await getPool(db);
        // 用外层 LIMIT 限制返回行数：兼容 SELECT / WITH / UNION，不需要改原 SQL 语义。
        const wrapped = `SELECT * FROM (${sqlText}) AS _agent_q LIMIT ${db.maxRows + 1}`;
        const result = await pool.query(wrapped);
        const rows = result.rows;
        const truncated = rows.length > db.maxRows;
        const outputRows = truncated ? rows.slice(0, db.maxRows) : rows;
        const columns = (result.fields ?? []).map((field) => field.name);
        console.log(`[db:kingbase] ok rows=${outputRows.length}${truncated ? '+' : ''} elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)}`);
        return {
            success: true,
            error: null,
            columns,
            rows: outputRows,
            rowCount: outputRows.length,
            truncated,
            elapsedMs: Date.now() - started,
        };
    }
    catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const message = friendlyError(rawMessage);
        console.error(`[db:kingbase] fail elapsed=${Date.now() - started}ms sql=${oneLine(sqlText)} err=${rawMessage}`);
        return {
            success: false,
            error: message,
            columns: [],
            rows: [],
            rowCount: 0,
            truncated: false,
            elapsedMs: Date.now() - started,
        };
    }
}
/** 轻量连接探测：建池、确认只读会话，并取库名/表数/版本（供 /config/check 用） */
export async function pingDatabase(db) {
    const pool = await getPool(db);
    const schemas = db.schemas.length ? db.schemas : ['public'];
    const info = await pool.query("SELECT current_database() AS db, current_setting('server_version') AS version, " +
        "current_setting('default_transaction_read_only') AS ro");
    const database = String(info.rows[0]?.db ?? '');
    const version = String(info.rows[0]?.version ?? '');
    const readOnly = String(info.rows[0]?.ro ?? '') === 'on';
    if (!readOnly) {
        throw new Error('金仓只读会话未生效（default_transaction_read_only != on），已拒绝服务');
    }
    const count = await pool.query(`SELECT COUNT(*)::int AS c
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema = ANY($1::text[])`, [schemas]);
    const tableCount = Number(count.rows[0]?.c ?? 0);
    return { database, tableCount, version, readOnly };
}
export async function closeAllPools() {
    const entries = [...pools.values()];
    pools.clear();
    await Promise.all(entries.map(async (entry) => {
        try {
            const pool = await entry.promise;
            await pool.end();
        }
        catch {
            /* ignore */
        }
    }));
}
