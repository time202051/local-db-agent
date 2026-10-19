// @types/mssql 未包含 msnodesqlv8 子路径的类型，这里补一份：
// 它复用 'mssql' 的类型定义。（注意：运行时需带 .js 后缀，Node ESM 才能解析 CJS 子路径）
declare module 'mssql/msnodesqlv8.js' {
  import mssql = require('mssql');
  export = mssql;
}
