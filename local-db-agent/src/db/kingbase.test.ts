import { describe, it, expect } from 'vitest';
import { parseTableName } from './kingbase.js';

describe('parseTableName', () => {
  it('解析未加引号的表名并使用默认 schema', () => {
    expect(parseTableName('WMS_Stocks', 'public')).toEqual({
      schema: 'public',
      table: 'WMS_Stocks',
    });
  });

  it('解析 schema.table 与带引号写法', () => {
    expect(parseTableName('public."WMS_Stocks"', 'public')).toEqual({
      schema: 'public',
      table: 'WMS_Stocks',
    });
    expect(parseTableName('"public"."WMS_Stocks"', 'public')).toEqual({
      schema: 'public',
      table: 'WMS_Stocks',
    });
  });

  it('兼容 SQL Server 的 [schema].[table] 写法', () => {
    expect(parseTableName('[dbo].[CORE_Stock]', 'dbo')).toEqual({
      schema: 'dbo',
      table: 'CORE_Stock',
    });
  });

  it('只取最后两段，兼容 db.schema.table', () => {
    expect(parseTableName('OLD.WMS.HF2Q.UAT.public.WMS_Stocks', 'public')).toEqual({
      schema: 'public',
      table: 'WMS_Stocks',
    });
  });

  it('引号内的点不当作分隔符', () => {
    expect(parseTableName('public."a.b"', 'public')).toEqual({
      schema: 'public',
      table: 'a.b',
    });
  });

  it('空表名抛错', () => {
    expect(() => parseTableName('   ', 'public')).toThrow();
  });
});
