# WMS 金仓版知识包

- `knowledge/`：由 ABP 源码 + 本地 Swagger 生成，发布时复制到 `release/agent-local/knowledge`。
- `skills/`：WMS 业务技能，发布时与核心 `skills/` 合并。
- `project.json`：可发布元数据（不含源码路径）。
- `project.local.json`：本机源码路径，已加入 `.gitignore`，不会发布。

## 重新生成

在 `local-db-agent` 目录执行（路径按本机 `project.local.json` 调整）：

```powershell
node scripts/abp-knowledge.mjs --backend "D:\ljp-h\WMS金仓版" --frontend "D:\ljp\hangfa\PC" --out packs/wms-kingbase/knowledge --name wms-kingbase --prefix WMS_ --no-merge
node scripts/swagger-knowledge.mjs --swagger "D:\ljp\hangfa\PC\swagger\swagger.json" --knowledge packs/wms-kingbase/knowledge --prefix WMS_ --name wms-kingbase
```

## 发布

```powershell
npm run release
```

`build-release.ps1` 检测到只有一个 pack 时会自动使用它；多个 pack 时显式传 `-Pack wms-kingbase`。
