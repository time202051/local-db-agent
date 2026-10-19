import { describe, it, expect } from 'vitest';
import { ConfigError, describeDb, resolveRequestConfig } from './config.js';

const KEY = { llm: { apiKey: 'sk-test' } };

describe('resolveRequestConfig', () => {
  it('由离散字段拼出 ODBC 连接串，且对 ; 做转义', () => {
    const cfg = resolveRequestConfig({
      ...KEY,
      db: { server: '10.0.0.5,1433', database: 'WebWMS_CS', user: 'ro', password: 'p;ss' },
    });
    expect(cfg.db.connectionString).toContain('Server={10.0.0.5,1433}');
    expect(cfg.db.connectionString).toContain('Database={WebWMS_CS}');
    expect(cfg.db.connectionString).toContain('Uid={ro}');
    expect(cfg.db.connectionString).toContain('Pwd={p;ss}');
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
    expect(cfg.db.connectionString).toContain('Trusted_Connection=Yes');
    expect(cfg.db.connectionString).not.toContain('Pwd=');
  });

  it('直接透传完整连接串', () => {
    const raw =
      'Driver={ODBC Driver 17 for SQL Server};Server=x;Database=y;Trusted_Connection=Yes;';
    const cfg = resolveRequestConfig({ ...KEY, db: { connectionString: raw } });
    expect(cfg.db.connectionString).toBe(raw);
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
});
