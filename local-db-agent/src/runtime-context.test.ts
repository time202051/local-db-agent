import { describe, expect, it } from 'vitest';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { compactMetadataEdit } from './runtime.js';

function tool(name: string, content: string): ToolMessage {
  return new ToolMessage({ content, name, tool_call_id: `${name}-1` });
}

describe('compactMetadataEdit', () => {
  it('2 批 SQL 后压缩表清单和旧表结构，不动 SQL 结果', async () => {
    const list = tool('list_tables', JSON.stringify({ tables: ['dbo.T'] }));
    const schema = tool(
      'get_table_schema',
      JSON.stringify({
        success: true,
        schemas: [
          {
            table: 'dbo.T',
            columns: ['Id:int NOT NULL', 'Name:varchar NULL — 名称'],
          },
        ],
      }),
    );
    const sql1 = tool('run_sql', JSON.stringify({ rows: [{ Id: 1 }] }));
    const sql2 = tool('run_sql', JSON.stringify({ rows: [{ Id: 2 }] }));
    const messages = [new HumanMessage('问题'), list, schema, sql1, sql2];

    await compactMetadataEdit.apply({
      messages,
      countTokens: async () => 0,
    });

    expect(String(list.content)).toContain('[已压缩表清单]');
    expect(String(schema.content)).toContain('[已压缩表结构');
    expect(String(schema.content)).toContain('Id:int NOT NULL');
    expect(String(schema.content)).not.toContain('名称');
    expect(String(sql1.content)).toContain('Id');
    expect(String(sql2.content)).toContain('Id');
  });

  it('只有 1 批 SQL 时不压缩', async () => {
    const list = tool('list_tables', JSON.stringify({ tables: ['dbo.T'] }));
    const sql = tool('run_sql', JSON.stringify({ rows: [] }));
    const messages = [new HumanMessage('问题'), list, sql];
    await compactMetadataEdit.apply({
      messages,
      countTokens: async () => 0,
    });
    expect(String(list.content)).toContain('tables');
  });

  it('超过 2 批 SQL 时压缩旧结果，但保留所有列和值', async () => {
    const sql1 = tool(
      'run_sql',
      JSON.stringify({
        success: true,
        queryId: 'q1',
        complete: true,
        columns: ['Id', 'Name'],
        rows: [
          { Id: 1, Name: 'A' },
          { Id: 2, Name: 'B' },
        ],
        rowCount: 2,
        truncated: false,
        elapsedMs: 12,
      }),
    );
    const sql2 = tool('run_sql', JSON.stringify({ queryId: 'q2', rows: [{ Id: 3 }] }));
    const sql3 = tool('run_sql', JSON.stringify({ queryId: 'q3', rows: [{ Id: 4 }] }));
    const messages = [new HumanMessage('问题'), sql1, sql2, sql3];

    await compactMetadataEdit.apply({
      messages,
      countTokens: async () => 0,
    });

    const compacted = String(sql1.content);
    expect(compacted).toContain('[SQL 结果已压缩');
    expect(compacted).toContain('q1');
    expect(compacted).toContain('"Id"');
    expect(compacted).toContain('"A"');
    expect(compacted).toContain('"B"');
    expect(compacted).not.toContain('elapsedMs');
    // 最近 2 批保持原始 JSON
    expect(String(sql2.content)).toContain('"queryId":"q2"');
    expect(String(sql3.content)).toContain('"queryId":"q3"');
  });
});
