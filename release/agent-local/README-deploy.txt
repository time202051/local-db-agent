agent-local 部署说明（方案A：装在每台用户电脑）
================================================

一、前置条件
1. Windows x64
2. 按数据库类型准备驱动：
   - SQL Server：安装 "ODBC Driver 17 for SQL Server"（一般已随 SQL Server/Office 安装）
   - KingbaseES（PG 模式）：无需安装 ODBC，只需能连通数据库端口（如 20036）

二、配置（全部在前端，agent 端不用配数据库）
  1) .env 里只需要配"端口/监听地址"两项（不建也能用默认值）：
       PORT=52310
       HOST=127.0.0.1     # 仅本机；要让局域网访问改成 0.0.0.0
  2) 数据库与大模型在接入的页面里、注册组件库时下发（随 configEnc 加密传输）：
       Vue.use(OlCom, {
         agentChat: {
           agentBaseUrl: 'http://127.0.0.1:52310',
            db: {
              type: 'kingbase',          // 'sqlserver'（默认）| 'kingbase'
              server: 'IP,20036',        // 统一写 "host,port"
              database: '库名',
              user: '账号',
              password: '密码',
              schemas: ['public'],       // 只展示这些 schema（SQL Server 默认全部）
              hiddenTables: [],          // 不在 list_tables 显示的表，支持 *
              blockedTables: [],         // 拒绝查询的表
              profile: 'wms',            // 'wms' | 'generic'
              businessPrompt: '',        // 追加业务口径/表说明
            },
           llm: { apiKey: '密钥', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
         },
       })
     切回 SQL Server 只改 db（server 写法一致）：
           db: { type: 'sqlserver', server: 'IP,60001', database: '库名', user: '账号', password: '密码' }
  说明：
    - agent 端不保存数据库配置；换库只改前端，不用重新打包 agent。
    - SQL Server 若为 Windows 集成认证，改用 trusted: true，不要填 user/password。
    - 金仓默认强制只读会话；建议业务上仍使用专用账号。
    - 组件打开时会自动做一次连接自检，失败会在面板顶部给出人话提示。

三、一键安装（推荐）
  - 双击 install.bat（会自动请求管理员权限）→ 注册开机自启 + 立即后台启动
  - 卸载自启：双击 uninstall.bat（停止服务 + 取消自启）
  - 首次会自动生成 .env（默认 PORT=52310 / HOST=127.0.0.1，可按需修改）

四、启动 / 自启（手动方式，非必须）
  - 手动测试：双击 start-agent.bat（会打开一个窗口，日志可见）
  - 后台运行：双击 start-agent.vbs（无窗口）
  - 开自启（管理员 PowerShell）：
      powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
  - 取消自启（管理员 PowerShell）：
      powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1

五、前端接入（每台电脑本机 agent + 集中部署的网页）
  - 组件里的 agentBaseUrl 必须指向"用户自己的电脑"：
      agentBaseUrl: 'http://127.0.0.1:52310'
  - 不要用 location.hostname 拼地址：网页在服务器上，用户浏览器访问的
    hostname 是服务器，不是用户本机，会连不上。
  - 若后台管理站点是 https，浏览器可能拦截到 http://127.0.0.1 的混合内容请求；
    此时把后台站点用 http 访问，或让 agent 走 https（需可信证书）。

六、分发安装包（让用户自助下载）
  - 构建时除生成 release/agent-local/ 外，还会打包 release/agent-local.zip。
  - 把 agent-local.zip 放到后台服务器（任意静态目录，如 /download/agent-local.zip）。
  - 在组件配置里指向它：
      agentChat: { downloadUrl: '/download/agent-local.zip', ... }
  - 效果好：用户电脑没装服务时，组件顶部自动提示，并提供
    「下载本地查询服务」按钮 → 下载 → 解压 → 双击 install.bat → 「重新检测」。
  - 不要把整个 agent 运行时打进 npm 组件包（含 node.exe/node_modules，体积大、
    且平台相关）；组件只负责"检测 + 引导下载"，安装包单独托管。

七、说明
  - 服务仅监听 127.0.0.1:52310，只在本机可访问（更安全）。
  - 历史记录存在浏览器本地（localStorage），换电脑会丢失。
  - 升级：用新的发布包覆盖本目录（保留你自己的 .env）。
