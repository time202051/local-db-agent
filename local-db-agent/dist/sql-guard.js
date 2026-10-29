const SQLSERVER_FORBIDDEN_KEYWORDS = [
    'insert',
    'update',
    'delete',
    'drop',
    'alter',
    'create',
    'truncate',
    'merge',
    'exec',
    'execute',
    'grant',
    'revoke',
    'deny',
    'backup',
    'restore',
    'dbcc',
    'shutdown',
    'reconfigure',
    'waitfor',
    'openrowset',
    'opendatasource',
    'openquery',
    'openxml',
    'bulk',
    'set',
    'use',
    'declare',
    'cursor',
    'deallocate',
    'kill',
    'checkpoint',
    'readtext',
    'writetext',
    'updatetext',
    'updlock',
    'xlock',
    'tablockx',
    'holdlock',
    'xp_',
    'sp_',
    'into',
];
const KINGBASE_FORBIDDEN_KEYWORDS = [
    'insert',
    'update',
    'delete',
    'drop',
    'alter',
    'create',
    'truncate',
    'merge',
    'copy',
    'do',
    'call',
    'set',
    'reset',
    'discard',
    'grant',
    'revoke',
    'backup',
    'restore',
    'vacuum',
    'analyze',
    'cluster',
    'reindex',
    'refresh',
    'lock',
    'prepare',
    'execute',
    'deallocate',
    'declare',
    'fetch',
    'move',
    'listen',
    'notify',
    'unlisten',
    'begin',
    'commit',
    'rollback',
    'savepoint',
    'load',
    'comment',
    'security',
    'into',
];
const KINGBASE_FORBIDDEN_FUNCTIONS = [
    'set_config',
    'nextval',
    'setval',
    'pg_read_file',
    'pg_read_binary_file',
    'pg_ls_dir',
    'pg_stat_file',
    'pg_terminate_backend',
    'pg_cancel_backend',
    'pg_reload_conf',
    'pg_rotate_logfile',
    'pg_switch_wal',
    'pg_start_backup',
    'pg_stop_backup',
    'pg_promote',
    'pg_write_file',
    'pg_file_write',
    'pg_file_rename',
    'pg_file_unlink',
    'pg_logdir_ls',
    'pg_ls_logdir',
    'pg_ls_waldir',
    'pg_ls_tmpdir',
    'pg_ls_archive_statusdir',
    'pg_logical_emit_message',
    'pg_create_restore_point',
    'pg_replication_origin_create',
    'pg_replication_origin_drop',
    'pg_replication_origin_advance',
    'lo_import',
    'lo_export',
    'lo_unlink',
    'dblink',
    'dblink_exec',
    'pg_sleep',
    'pg_sleep_for',
    'pg_sleep_until',
    'pg_advisory_lock',
    'pg_advisory_xact_lock',
    'pg_try_advisory_lock',
    'pg_try_advisory_xact_lock',
];
/**
 * 把字符串字面量替换成空格，避免字段值里出现 "delete" 之类的词被误判；
 * 双引号标识符保留，便于识别 "set_config" 这类写法。
 * 支持普通单引号、E'...'、$tag$...$tag$。
 */
function codeOnly(sqlText) {
    let out = '';
    let i = 0;
    while (i < sqlText.length) {
        const ch = sqlText[i];
        if (ch === "'") {
            out += ' ';
            i++;
            while (i < sqlText.length) {
                if (sqlText[i] === "'" && sqlText[i + 1] === "'") {
                    i += 2;
                    continue;
                }
                if (sqlText[i] === "'") {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }
        if (ch === '$') {
            const matched = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sqlText.slice(i));
            if (matched) {
                const tag = matched[0];
                const end = sqlText.indexOf(tag, i + tag.length);
                out += ' ';
                i = end === -1 ? sqlText.length : end + tag.length;
                continue;
            }
        }
        out += ch;
        i++;
    }
    return out;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function keywordHit(lowered, word) {
    return word.endsWith('_')
        ? lowered.includes(word)
        : new RegExp(`(^|[^\\w])${escapeRegExp(word)}([^\\w]|$)`).test(lowered);
}
function blockedTableHit(lowered, blockedTables) {
    // 去掉 SQL Server 的 [ ] 和 Kingbase 的 " " 引号，统一按裸表名匹配
    const normalized = lowered.replace(/["`[\]]/g, '');
    for (const raw of blockedTables) {
        const name = raw.trim();
        if (!name)
            continue;
        const base = name.split('.').pop() ?? name;
        const re = new RegExp(`(^|[^a-z0-9_$])${escapeRegExp(base.toLowerCase())}($|[^a-z0-9_$])`);
        if (re.test(normalized))
            return name;
    }
    return null;
}
/** 只读守卫：仅放行单条 SELECT / WITH，其余一律拒绝。 */
export function assertReadOnly(sqlText, dialect = 'sqlserver', blockedTables = []) {
    const trimmed = sqlText.trim();
    if (!trimmed)
        return 'SQL 不能为空。';
    const code = codeOnly(trimmed);
    if (code.includes(';'))
        return '不允许多条语句或分号。';
    if (code.includes('--') || code.includes('/*') || code.includes('*/')) {
        return '不允许使用 SQL 注释。';
    }
    const first = (code.match(/^\s*([a-zA-Z]+)/)?.[1] ?? '').toLowerCase();
    if (first !== 'select' && first !== 'with')
        return '仅允许 SELECT / WITH 查询。';
    const lowered = code.toLowerCase();
    if (dialect === 'kingbase' &&
        /\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/.test(lowered)) {
        return '不允许使用 FOR UPDATE / FOR SHARE。';
    }
    const forbiddenKeywords = dialect === 'kingbase' ? KINGBASE_FORBIDDEN_KEYWORDS : SQLSERVER_FORBIDDEN_KEYWORDS;
    for (const word of forbiddenKeywords) {
        if (keywordHit(lowered, word))
            return `SQL 包含禁止的关键字：${word}`;
    }
    if (dialect === 'kingbase') {
        // U&"..." / U&'...' 可以绕过函数名黑名单
        if (/\bu\s*&/.test(lowered)) {
            return '不允许使用 U& 转义标识符。';
        }
        const functionRe = new RegExp(`["]?\\b(${KINGBASE_FORBIDDEN_FUNCTIONS.map(escapeRegExp).join('|')})\\b["]?\\s*\\(`, 'i');
        const fn = functionRe.exec(lowered);
        if (fn)
            return `SQL 包含禁止的函数：${fn[1]}`;
        if (/\bselect\s+(distinct\s+)?top\b/.test(lowered)) {
            return '金仓不支持 TOP，请改用 LIMIT。';
        }
        if (/\b(getdate|isnull|dateadd|datediff)\s*\(/.test(lowered)) {
            return '检测到 SQL Server 函数，金仓请改用 now() / COALESCE / interval。';
        }
    }
    // 两种数据库都生效：拒绝查询敏感/指定表
    const blocked = blockedTableHit(lowered, blockedTables);
    if (blocked)
        return `不允许查询表：${blocked}`;
    return null;
}
/** 给含非 ASCII 的字符串字面量补 N 前缀，否则 SQL Server 会按库代码页把中文转成 '?'。 */
export function normalizeUnicodeLiterals(sqlText, dialect = 'sqlserver') {
    if (dialect === 'kingbase')
        return sqlText;
    return sqlText.replace(/(?<n>N)?'(?<body>(?:[^']|'')*)'/gi, (whole, n, body) => {
        if (n || /^[\x00-\x7F]*$/.test(body))
            return whole;
        return `N'${body}'`;
    });
}
