# agent-local

本地 NL→SQL 查询 agent：**直连 SQL Server / KingbaseES + SSE 流式返回**。用户用自然语言提问，服务调用大模型生成只读 SQL、查询数据库并返回分析结论。数据库与大模型配置全部由前端页面在注册组件时下发，服务端不保存任何库/模型凭据。

---

## 一、它解决什么问题

- 浏览器页面要能"用自然语言查数据库"，但直接把数据库密码、大模型 Key 放到前端又不安全。
- 做法：在**用户本机**跑一个轻量服务（本 agent），页面只跟 `127.0.0.1` 通信，凭据不出本机。
- 页面把配置（库连接 + 大模型 Key）通过**加密**传给本机 agent，agent 用它连库、调模型。
- 想换库 / 换模型，只改页面配置即可，**不用重新打包 agent**。

---

## 二、工作原理

```
浏览器页面 (Vue 组件)
   │  1) GET /handshake          → 拿服务端一次性公钥
   │  2) POST /chat/stream       → 用公钥加密 configEnc(库/模型) + messages
   ▼
agent-local (本机 Fastify 服务, 默认 127.0.0.1:52310)
   │  RSA 解出 AES 密钥 → 解出 config 明文（仅内存）
   │  3) 按 config 取/建 LangChain agent（带缓存）
   │     ├─ list_tables        看有哪些表
   │     ├─ get_table_schema   看某张表的字段
   │     └─ run_sql            执行只读 SQL（经 sql-guard 校验 + 代价/行数限制）
   ▼
SQL Server / KingbaseES（建议只读账号）
   │
   └─ 4) SSE 流式回传：token / tool_start / tool_result / status / done / error
```

### 关键设计

| 关注点 | 实现 | 代码位置 |
| --- | --- | --- |
| HTTP 服务 / 流式接口 | Fastify + SSE（`reply.hijack` 直接写 `reply.raw`） | `src/index.ts` |
| 配置解析与校验 | 前端下发 `db`/`llm`/`limits`，每次请求归一化成一份 `ResolvedConfig` | `src/config.ts` |
| 传输加密 | 启动时生成**一次性 RSA 密钥对**（仅内存），前端用公钥加密 `configEnc` | `src/crypto.ts` |
| 只读守卫 | 仅放行单条 `SELECT`/`WITH`，拦截写操作、DDL、分号、注释；金仓额外拦截危险函数 | `src/sql-guard.ts` |
| 方言处理 | SQL Server 自动补 `N'...'`；金仓使用 PG 语法、双引号标识符、`LIMIT` | `src/sql-guard.ts` / `src/db/` |
| 数据库访问 | SQL Server：`mssql` + `msnodesqlv8`；金仓：`pg`（纯 JS） | `src/db/sqlserver.ts` / `src/db/kingbase.ts` |
| Agent 编排 | `langchain` 的 `createAgent`，带上下文摘要中间件 | `src/runtime.ts` |
| 工具定义 | `list_tables` / `get_table_schema` / `run_sql` | `src/tools.ts` |
| 运行时缓存 | agent 按配置哈希缓存（TTL 30min，最多 8 个） | `src/runtime.ts` |
| 连接池缓存 | 按连接串缓存（TTL 30min，最多 8 个） | `src/db.ts` |

### 并发与超时保护

- `activeStreams` 超过 `maxConcurrent`（默认 3）→ 返回 429。
- 单轮对话有 `turnTimeoutMs`（默认 120s）总时长限制；客户端断开即 `AbortController.abort()`，避免挂起烧 token / 占着数据库。
- 数据库侧限制：SQL Server 用 `SET QUERY_GOVERNOR_COST_LIMIT` + `SET ROWCOUNT`；金仓用只读会话 + `statement_timeout` + 外层 `LIMIT`，JS 侧再兜一层 `slice`。

### 上下文优化

历史变长时由 LangChain 内置的 `summarizationMiddleware` 自动把旧对话压成摘要（默认 6000 tokens 触发，保留最近 12 条），无需手动裁剪。

摘要调用只作为内部上下文：`streamEvents` 使用 LangChain 自带的 `excludeTags: ['nostream']` 过滤，不会把摘要内容流给前端。本轮预计触发摘要时，前端只会收到一条 `status` 轻提示（“上下文较长，正在压缩…”），提示不会写入回答正文，也不会被复制/导出。

---

## 三、HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 存活检查，仅返回 `{status:'ok'}`，不含任何配置/密钥 |
| GET | `/handshake` | 返回传输加密公钥（`v/alg/publicKey`） |
| POST | `/chat/stream` | 主对话接口，SSE 流式返回 |
| POST | `/chat/resume` | 恢复被 SQL 审批中断的对话（LangChain HITL） |
| POST | `/config/check` | 连接自检：真实连库 + 轻量探模型，返回人话结果 |

### SQL 审批（LangChain HITL）

在 `limits` 里设置 `requireSqlApproval: true` 后：

1. `run_sql` 执行前，LangChain `humanInTheLoopMiddleware` 会中断并把待确认 SQL 作为 `interrupt` 事件下发；
2. 前端展示 SQL 并让用户选择「执行 / 取消」；
3. 前端调用 `POST /chat/resume`，请求体：
   ```jsonc
   {
     "threadId": "上一次 interrupt 事件里的 threadId",
     "decisions": [{ "type": "approve" }],   // 或 { "type": "reject", "message": "…" }
     "configEnc": { … }                       // 与 /chat/stream 相同
   }
   ```
4. 服务端用 `Command({ resume })` 继续执行同一 thread；恢复时再次触发审批会继续下发新的 `interrupt`。

> 审批模式使用内存 checkpointer（`MemorySaver`），服务重启后未完成的审批无法恢复；不开启该配置时不会创建 checkpointer，行为与旧版一致。

### `/chat/stream` 请求体

```jsonc
{
  "messages": [ { "role": "user", "content": "上月销售额前三的产品" } ],
  "conversationId": "可选",
  "configEnc": { "key": "…", "iv": "…", "data": "…" },  // 优先
  "config":     { "db": {…}, "llm": {…}, "limits": {…} } // 明文回落（开发用）
}
```

### SSE 事件格式（每行 `data: <json>\n\n`）

```jsonc
{ "type": "token",       "content": "文本增量" }
{ "type": "status",      "message": "上下文较长，正在压缩…" }
{ "type": "tool_start",  "id": "run-…", "name": "run_sql", "label": "执行查询", "input": { "sql": "…" } }
{ "type": "tool_end",    "id": "run-…", "name": "run_sql", "label": "执行查询", "ok": true,
  "durationMs": 1200, "summary": { "rowCount": 1204, "truncated": false } }
{ "type": "tool_result", "id": "run-…", "name": "run_sql", "output": "JSON 字符串" }
{ "type": "visual",      "component": "ol-html-report", "…": "报告 spec", "toolId": "run-…" }
{ "type": "usage",       "model": "deepseek-chat", "inputTokens": 3200, "outputTokens": 800, "elapsedMs": 6800 }
{ "type": "meta",        "queries": 3, "rowCount": 1204, "tables": ["…"], "warnings": [], "report": {…} }
{ "type": "heartbeat",   "ts": 1760000000000 }
{ "type": "interrupt",   "threadId": "conv-…:…", "interrupts": [{ "id": "…", "value": { "actionRequests": […] } }] }
{ "type": "done" }
{ "type": "error",       "message": "人话错误信息" }
```

> `tool_end` / `usage` / `meta` 是 1.2 新增的增强事件；旧前端忽略即可。
> 触发 SQL 审批时服务端会先发 `meta`，再发 `interrupt`，最后结束本次 SSE；前端调用 `/chat/resume` 继续。

---

## 四、目录结构

```
local-db-agent/
├─ src/                     服务源码
│  ├─ index.ts              Fastify 入口 + 4 个接口 + SSE
│  ├─ config.ts             .env 加载 + 前端配置归一化
│  ├─ crypto.ts             一次性 RSA 密钥对 + configEnc 解密
│  ├─ db.ts                 方言门面：schema/查询/ping
│  ├─ db/sqlserver.ts       SQL Server 连接池与查询
│  ├─ db/kingbase.ts        KingbaseES（pg）连接池与查询
│  ├─ sql-guard.ts          只读守卫 + 方言处理
│  ├─ tools.ts              3 个 LangChain 工具
│  ├─ runtime.ts            agent 构建/缓存 + 系统提示词
│  ├─ *.test.ts             vitest 单测
│  └─ mssql-msnodesqlv8.d.ts 类型补充
├─ scripts/                 构建与调试脚本
│  ├─ build-release.ps1     一键打包发布（release 脚本调用）
│  ├─ bundle.mjs            esbuild 打单文件 dist/app.mjs
│  ├─ seed.sql / db-*.ts    连库调试与造数脚本（见第九节）
├─ packaging/               发布包里的部署脚本（被拷进 release）
│  ├─ install.bat           一键安装（提权 + 注册自启 + 启动）
│  ├─ start-agent.bat/.vbs  前台/后台启动
│  ├─ restart-agent.bat     重启
│  ├─ install/uninstall-autostart.ps1  注册/取消开机自启
│  ├─ uninstall.bat         卸载
│  └─ README-deploy.txt     面向部署用户的中文说明
├─ .env.example             端口/监听地址模板
├─ package.json             脚本与依赖
└─ tsconfig*.json           TS 配置
```

---

## 五、环境要求

- Windows x64（发布包内置 `node.exe`，最终用户无需装 Node）
- 开发机：Node.js 22+、npm
- SQL Server：需要 **ODBC Driver 17 for SQL Server**（随 SQL Server/Office 常已安装）
   - 验证：控制面板 → ODBC 数据源 → 驱动程序，能看到即可。
- KingbaseES（PG 模式）：**不需要 ODBC**，只需能连通数据库端口（如 20036）。

---

## 六、本地开发

```powershell
cd local-db-agent
npm install          # 首次必须执行，否则 tsc/esbuild 缺失
npm run dev          # tsx watch 热重载
# 或
npm run start        # 跑一次
```

### 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发模式（热重载） |
| `npm run start` | 直接运行 `src/index.ts` |
| `npm test` | vitest 单测 |
| `npm run lint` | eslint |
| `npm run typecheck` | `tsc --noEmit` 类型检查 |
| `npm run format` | prettier 格式化 |
| `npm run build` | `tsc` 编译到 `dist/` |
| `npm run release` | 一键打包发布包 + zip（见第七节） |
| `npm run dbcheck` | 跑 `scripts/db-check.ts` 冒烟连库（SQL Server） |
| `npm run kbcheck` | 跑 `scripts/kb-check.ts` 冒烟连库（Kingbase，需 `KB_*` 环境变量） |

### `.env`（只需端口和监听地址）

```env
PORT=52310
HOST=127.0.0.1   # 127.0.0.1=仅本机（推荐）；0.0.0.0=局域网可访问
```

> 数据库与大模型**不在这里配**，由前端页面下发。

---

## 七、发布打包

```powershell
npm run release
```

脚本 `scripts/build-release.ps1` 的 8 个步骤：

1. 若缺 `typescript`/`esbuild` 先自动 `npm install`，然后 `tsc` 编译到 `dist/`。
2. `esbuild`（`scripts/bundle.mjs`）把纯 JS 依赖全部内联，产出单文件 `dist/app.mjs`（`msnodesqlv8` 原生模块保持 external）。
3. 准备输出目录（备份旧 `.env` → 清空 → 重建）。
4. 拷贝 `app.mjs`、`.env.example`、部署说明。
5. 生成**最小 package.json**（只含 `msnodesqlv8`），`npm install` 安装运行时原生依赖。
6. 拷贝便携版 `node.exe`。
7. 拷贝 `packaging/` 下的部署脚本。
8. 打 zip（**不含用户自己的 `.env`**）。

产物（在仓库上级，即 `D:\ljp-github\local-db-agent\release\`）：

```
release/
├─ agent-local/           ← 可直接运行的目录
│  ├─ node.exe
│  ├─ dist/app.mjs
│  ├─ node_modules/msnodesqlv8/…（仅原生模块）
│  ├─ .env                 （首次由 install.bat 从 .env.example 生成）
│  ├─ install.bat / start-agent.* / …
└─ agent-local.zip        ← 分发用压缩包
```

> 为什么能瘦身：所有纯 JS 依赖都被 esbuild 内联进 `app.mjs`，运行时只需一个 `msnodesqlv8` 原生模块，`node_modules` 从几万个文件降到约 230 个。

---

## 八、部署与安装（方案A：装在每台用户电脑）

最终用户操作（详见发布包内 `README-deploy.txt`）：

1. 下载 `agent-local.zip` → 解压到任意目录。
2. 双击 **`install.bat`**（会自动请求管理员权限）：注册开机自启 + 立即后台启动。
3. 打开页面，组件会自动检测本机服务；用 `start-agent.bat` 可前台看日志，`restart-agent.bat` 重启，`uninstall.bat` 卸载自启。

前端组件配置（关键：`agentBaseUrl` 必须指向**用户本机**）：

```js
Vue.use(OlCom, {
  agentChat: {
    agentBaseUrl: 'http://127.0.0.1:52310',   // 不要用 location.hostname 拼
    downloadUrl: '/download/agent-local.zip',  // 可选：一键下载安装包
    // 金仓（SQL Server 也一样用 server: 'IP,端口'）
    db: {
      type: 'kingbase',              // 数据库类型：sqlserver（默认）| kingbase
      server: 'IP,20036',            // 统一地址："host,port"
      database: '库名',              // 数据库名
      user: '账号',                  // 登录账号
      password: '密码',              // 登录密码
      schemas: ['public'],           // 只展示这些 schema；SQL Server 默认全部
      hiddenTables: [],              // 不在 list_tables 显示的表，支持尾部 *
      blockedTables: [],             // 拒绝查询/查看结构的表
      profile: 'wms',                // 'wms' 注入 WMS 指标 | 'generic' 不注入
      businessPrompt: '',            // 追加业务口径/表说明
    },
    llm: { apiKey: '密钥', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    limits: { maxRows: 200, commandTimeoutSec: 30 },
  },
})
```

- 切回 SQL Server：`db: { type: 'sqlserver', server: 'IP,60001', database: '库名', user: '账号', password: '密码' }`。
- 集成认证：改用 `db: { server, database, trusted: true }`，不填 user/password。
- 库/模型配置会随请求加密下发；组件打开时自动 `POST /config/check` 自检并在面板顶部提示结果。
- **强烈建议用只读账号**，并把 `HOST` 设为 `127.0.0.1`（凭据不出本机）。

### `db` 字段说明（SQL Server / Kingbase 通用）

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `type` | 否 | `'sqlserver'`（默认）或 `'kingbase'`，决定驱动和 SQL 方言 |
| `server` | 是 | 地址，统一写 `'host,port'`，两种库写法一致 |
| `database` | 是 | 数据库名 |
| `user` / `password` | 是 | 登录账号/密码；SQL Server 集成认证时可改 `trusted: true` |
| `schemas` | 否 | 只展示这些 schema 的表；SQL Server 默认 `[]`（全部），金仓默认 `['public']` |
| `hiddenTables` | 否 | 不在 `list_tables` 中显示的表，支持尾部 `*`，如 `WMS_StockHistorys_2026*` |
| `blockedTables` | 否 | 拒绝查询/查看结构的表，默认 `[]` |
| `profile` | 否 | `'wms'` 注入 WMS 指标口径；`'generic'` 不注入业务指标 |
| `businessPrompt` | 否 | 追加到系统提示的业务说明，如软删除、日期字段、表含义 |
| `connectionString` | 否 | 仅 SQL Server：完整 ODBC 连接串，给了它则忽略 `server/database/user/password` |
| `trusted` | 否 | 仅 SQL Server：`true` = Windows 集成认证 |
| `encrypt` / `driver` | 否 | 仅 SQL Server：ODBC Encrypt 开关 / 驱动名 |
| `host` / `port` | 否 | 仅金仓兼容写法；推荐统一用 `server` |
| `ssl` | 否 | 仅金仓：是否启用 SSL，默认 `false` |
- 若后台站点是 https，浏览器可能拦截到 `http://127.0.0.1` 的混合内容请求，可让后台走 http 或给 agent 配 https。

### 配置项与默认值（`src/config.ts` 的 `DEFAULTS`）

| 字段 | 默认 | 含义 |
| --- | --- | --- |
| `maxRows` | 200 | 单次返回行数上限 |
| `commandTimeoutSec` | 15 | 数据库命令超时 |
| `costLimit` | 30 | SQL Server `QUERY_GOVERNOR_COST_LIMIT` 预估代价上限（金仓不适用） |
| `llmBaseUrl` | `https://api.deepseek.com/v1` | 大模型地址 |
| `llmModel` | `deepseek-chat` | 模型名 |
| `llmTimeoutSec` | 60 | 大模型调用超时 |
| `recursionLimit` | 80 | agent 最大工具循环次数 |
| `maxSqlQueries` | 6 | 单轮 SQL 查询次数上限（超出后提示模型收尾，不抛错） |
| `maxSchemaCalls` | 6 | 单轮表结构查询次数上限（list_tables + get_table_schema） |
| `maxResultChars` | 8000 | 单次工具结果字符数上限（超出按行截断） |
| `maxTotalToolChars` | 40000 | 单轮所有工具输出字符数上限 |
| `maxOutputTokens` | 8000 | 单次大模型输出 token 上限 |
| `requireSqlApproval` | false | true = 每次 `run_sql` 前通过 LangChain HITL 等待前端确认 |
| `turnTimeoutSec` | 120 | 单轮对话总时长 |
| `maxConcurrent` | 3 | 并发会话上限 |
| `summaryTriggerTokens` | 6000 | 触发历史摘要的 token 阈值 |
| `summaryKeepMessages` | 12 | 摘要后保留的最近消息数 |

---

## 九、调试脚本（`scripts/`）

均通过环境变量 `DB_CONNECTION_STRING` 指定连接串，结果写入 `scripts/*.out.txt`：

| 脚本 | 作用 |
| --- | --- |
| `seed.sql` | 给 `Customers` 表造几条中文样例数据 |
| `db-check.ts` | `npm run dbcheck`，冒烟连库查 `Customers` |
| `list-dbs.ts` | 列出实例上的数据库 |
| `top-tables.ts` | 列出数据量/大小靠前的表 |
| `db-rows.ts` | 查某张表的样本行 |
| `db-stats.ts` | 统计各表行数等 |
| `smoke.ts` | 用 `src/db.ts` 走一遍 `getSchema`+`runQuery` |
| `guard-check.ts` | 验证 `sql-guard` 只读拦截是否生效 |
| `kb-check.ts` | 金仓只读冒烟：ping / 表结构 / 聚合 / 限行 / 拦截（`npm run kbcheck`） |

示例：

```powershell
$env:DB_CONNECTION_STRING='Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\MSSQLLocalDB;Database=AgentKit;Trusted_Connection=Yes;TrustServerCertificate=Yes'
npm run dbcheck
```

---

## 十、安全说明

- 服务默认仅监听 `127.0.0.1`。
- 库密码 / API Key 用一次性 RSA 公钥加密传输，agent 内存解密，**不落盘**。
- 只读守卫 + 代价/行数限制，防误写与昂贵查询。
- `/health` 不含敏感信息。
- 服务重启后密钥对变化，旧的加密配置会解密失败 → 前端需重试（会拿到新公钥）。

---

## 十一、常见问题

**Q：`npm run release` 报 `Cannot find package 'esbuild'` 或提示装 `tsc@2.0.3`？**
A：没装依赖或 `node_modules` 丢失。脚本现已自动补 `npm install`；手动执行 `npm install` 也可。

**Q：提示缺"ODBC Driver 17 for SQL Server"？**
A：只有连 SQL Server 才需要；安装对应驱动，控制面板 ODBC 里能看到即可。金仓不需要 ODBC。

**Q：页面连不上本机服务？**
A：确认 `agentBaseUrl` 指向 `http://127.0.0.1:<PORT>`、服务已启动（`start-agent.bat`）、端口与 `.env` 的 `PORT` 一致。

**Q：升级？**
A：用新发布包覆盖目录（保留自己的 `.env`）后重启服务。
