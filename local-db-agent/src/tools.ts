import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { DbRuntime } from './config.js';
import { getSchema, getTableSchema, runQuery } from './db.js';

/**
 * 为某次请求的数据库配置构造一组工具（工具需要闭包持有该库的连接信息）。
 */
export function createTools(db: DbRuntime) {
  const getSchemaTool = tool(
    async () => {
      const schema = await getSchema(db);
      return JSON.stringify(schema);
    },
    {
      name: 'list_tables',
      description:
        '列出数据库中所有可用的表（表名 + 字段数量）。生成 SQL 之前先调用本工具了解有哪些表，' +
        '再用 get_table_schema 查看具体表的字段。',
      schema: z.object({}),
    },
  );

  const getTableSchemaTool = tool(
    async ({ table }) => {
      const schema = await getTableSchema(db, table);
      return JSON.stringify(schema);
    },
    {
      name: 'get_table_schema',
      description: '查看指定表的字段（列名/类型/是否可空）。确定要查询某张表后调用。',
      schema: z.object({
        table: z.string().describe('表名'),
      }),
    },
  );

  const runQueryTool = tool(
    async ({ sql: sqlText }) => {
      const result = await runQuery(db, sqlText);
      return JSON.stringify(result);
    },
    {
      name: 'run_sql',
      description:
        '执行一条只读查询并返回 JSON 结果（columns/rows/rowCount/truncated）。返回行数有上限。',
      schema: z.object({
        sql: z.string().describe('要执行的 SQL 查询语句'),
      }),
    },
  );

  return [getSchemaTool, getTableSchemaTool, runQueryTool];
}
