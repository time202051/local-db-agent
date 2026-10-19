const FORBIDDEN_KEYWORDS = [
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
    'openquery',
    'bulk',
    'xp_',
    'sp_',
    'into',
];
/** 只读守卫：仅放行单条 SELECT / WITH，其余一律拒绝（本地账号是管理员，必须自己拦）。 */
export function assertReadOnly(sqlText) {
    const trimmed = sqlText.trim();
    if (!trimmed)
        return 'SQL 不能为空。';
    if (trimmed.includes(';'))
        return '不允许多条语句或分号。';
    if (trimmed.includes('--') || trimmed.includes('/*') || trimmed.includes('*/')) {
        return '不允许使用 SQL 注释。';
    }
    const first = (trimmed.match(/^\s*([a-zA-Z]+)/)?.[1] ?? '').toLowerCase();
    if (first !== 'select' && first !== 'with')
        return '仅允许 SELECT / WITH 查询。';
    const lowered = trimmed.toLowerCase();
    for (const word of FORBIDDEN_KEYWORDS) {
        const hit = word.endsWith('_')
            ? lowered.includes(word)
            : new RegExp(`(^|[^\\w])${word}([^\\w]|$)`).test(lowered);
        if (hit)
            return `SQL 包含禁止的关键字：${word}`;
    }
    return null;
}
/** 给含非 ASCII 的字符串字面量补 N 前缀，否则 SQL Server 会按库代码页把中文转成 '?'。 */
export function normalizeUnicodeLiterals(sqlText) {
    return sqlText.replace(/(?<n>N)?'(?<body>(?:[^']|'')*)'/gi, (whole, n, body) => {
        if (n || /^[\x00-\x7F]*$/.test(body))
            return whole;
        return `N'${body}'`;
    });
}
