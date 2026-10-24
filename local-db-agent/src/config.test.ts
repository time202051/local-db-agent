import { describe, it, expect } from 'vitest';
import type { ResolvedConfig, SqlServerDbRuntime } from './config.js';
import { ConfigError, describeDb, resolveRequestConfig } from './config.js';

const KEY = { llm: { apiKey: 'sk-test' } };

function sqlServerDb(cfg: ResolvedConfig): SqlServerDbRuntime {
  if (cfg.db.type !== 'sqlserver') throw new Error('expected sqlserver db');
  return cfg.db;
}

describe('resolveRequestConfig', () => {
  it('由离散字段拼出 ODBC 连接串，且对 ; 做转义', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: { server: '10.0.0.5,1433', database: 'WebWMS_CS', user: 'ro', password: 'p;ss' },
    });
    expect(sqlServerDb(cfg).connectionString).toContain('Server={10.0.0.5,1433}');
    expect(sqlServerDb(cfg).connectionString).toContain('Database={WebWMS_CS}');
    expect(sqlServerDb(cfg).connectionString).toContain('Uid={ro}');
    expect(sqlServerDb(cfg).connectionString).toContain('Pwd={p;ss}');
  });

  it('describeDb 不泄露密码', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: { server: 'db', database: 'D', user: 'u', password: 'secret' },
    });
    const desc = describeDb(cfg.db);
    expect(desc).not.toContain('secret');
    expect(desc).toContain('db');
  });

  it('支持 Windows 集成认证（无 user/password）', () => {
    const cfg = resolveRequestConfig({ ...KEY, db: { server: 'db', database: 'D', trusted: true } });
    expect(sqlServerDb(cfg).connectionString).toContain('Trusted_Connection=Yes');
    expect(sqlServerDb(cfg).connectionString).not.toContain('Pwd=');
  });

  it('直接透传完整连接串', () => {
    const raw =
      'Driver={ODBC Driver 17 for SQL Server};Server=x;Database=y;Trusted_Connection=Yes;';
    const cfg = resolveRequestConfig({ ...KEY, db: { connectionString: raw } });
    expect(sqlServerDb(cfg).connectionString).toBe(raw);
  });

  it('db 字段不完整时抛 ConfigError', () => {
    expect(() => resolveRequestConfig({ ...KEY, db: { server: 'db' } })).toThrow(ConfigError);
  });

  it('limits 覆盖生效', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: { server: 'db', database: 'D', trusted: true },
      limits: { maxRows: 5, costLimit: 7 },
    });
    expect(cfg.db.maxRows).toBe(5);
    expect(cfg.db.costLimit).toBe(7);
  });

  it('llm 覆盖生效', () => {
    const cfg = resolveRequestConfig({
      db: { server: 'db', database: 'D', trusted: true },
      llm: { apiKey: 'sk-x', model: 'my-model', baseUrl: 'https://x/v1' },
    });
    expect(cfg.llm.apiKey).toBe('sk-x');
    expect(cfg.llm.model).toBe('my-model');
    expect(cfg.llm.baseUrl).toBe('https://x/v1');
  });

  it('不同配置产生不同的缓存键', () => {
    const a = resolveRequestConfig({ ...KEY, db: { server: 'a', database: 'D', trusted: true } });
    const b = resolveRequestConfig({ ...KEY, db: { server: 'b', database: 'D', trusted: true } });
    expect(a.key).not.toBe(b.key);
  });

  it('拒绝含非 ASCII 的密钥/地址', () => {
    expect(() =>
      resolveRequestConfig({
        db: { server: 'db', database: 'D', trusted: true },
        llm: { apiKey: 'sk-你的密钥' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      resolveRequestConfig({
        ...KEY,
        db: { server: '１９２．１６８．１．１', database: 'D', trusted: true },
      }),
    ).toThrow(ConfigError);
  });

  it('缺少数据库/密钥时抛 ConfigError', () => {
    expect(() => resolveRequestConfig({ llm: { apiKey: 'sk-x' } })).toThrow(ConfigError);
    expect(() =>
      resolveRequestConfig({ db: { server: 'db', database: 'D', trusted: true } }),
    ).toThrow(ConfigError);
  });

  it('解析金仓配置并补齐默认值', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: {
        type: 'kingbase',
        host: '10.0.0.8',
        port: 20036,
        database: 'OLD.WMS.HF2Q.UAT',
        user: 'sa',
        password: 'secret',
      },
    });
    expect(cfg.db.type).toBe('kingbase');
    if (cfg.db.type !== 'kingbase') throw new Error('expected kingbase db');
    expect(cfg.db.port).toBe(20036);
    expect(cfg.db.schemas).toEqual(['public']);
    expect(cfg.db.hiddenTables).toEqual([]);
    expect(cfg.db.blockedTables).toEqual([]);
    expect(cfg.db.profile).toBe('generic');
    expect(cfg.db.businessPrompt).toBe('');
    expect(cfg.db.ssl).toBe(false);
    expect(describeDb(cfg.db)).not.toContain('secret');
  });

  it('金仓支持 server: "host,port"、profile 与 businessPrompt', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: {
        type: 'kingbase',
        server: 'db.local,20036',
        database: 'D',
        user: 'u',
        password: 'p',
        schemas: ['public', 'biz'],
        profile: 'generic',
        businessPrompt: '  库存口径  ',
      },
    });
    if (cfg.db.type !== 'kingbase') throw new Error('expected kingbase db');
    expect(cfg.db.host).toBe('db.local');
    expect(cfg.db.port).toBe(20036);
    expect(cfg.db.schemas).toEqual(['public', 'biz']);
    expect(cfg.db.profile).toBe('generic');
    expect(cfg.db.businessPrompt).toBe('库存口径');
  });

  it('金仓缺少必要字段时抛 ConfigError', () => {
    expect(() =>
      resolveRequestConfig({
        ...KEY,
        db: { type: 'kingbase', host: 'h', database: 'D', user: 'u' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      resolveRequestConfig({
        ...KEY,
        db: { type: 'kingbase', host: 'h', database: 'D', password: 'p' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      resolveRequestConfig({
        ...KEY,
        db: { type: 'kingbase', database: 'D', user: 'u', password: 'p' },
      }),
    ).toThrow(ConfigError);
  });

  it('SQL Server 也支持 schemas/hiddenTables/blockedTables/profile/businessPrompt', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: {
        server: 'db',
        database: 'D',
        trusted: true,
        schemas: ['dbo'],
        hiddenTables: ['tmp_*'],
        blockedTables: ['ID_Users'],
        profile: 'generic',
        businessPrompt: '  业务说明  ',
      },
    });
    expect(cfg.db.schemas).toEqual(['dbo']);
    expect(cfg.db.hiddenTables).toEqual(['tmp_*']);
    expect(cfg.db.blockedTables).toEqual(['ID_Users']);
    expect(cfg.db.profile).toBe('generic');
    expect(cfg.db.businessPrompt).toBe('业务说明');
  });

  it('SQL Server 不传 schemas 时默认展示全部 schema', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: { server: 'db', database: 'D', trusted: true },
    });
    expect(cfg.db.schemas).toEqual([]);
    expect(cfg.db.hiddenTables).toEqual([]);
    expect(cfg.db.blockedTables).toEqual([]);
  });

  it('拒绝不支持的数据库类型', () => {
    expect(() =>
      resolveRequestConfig({
        ...KEY,
        db: { type: 'mysql' as never, host: 'h', database: 'D', user: 'u', password: 'p' },
      }),
    ).toThrow(ConfigError);
  });
});
