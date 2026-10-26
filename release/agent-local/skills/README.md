# 技能包

技能（skill）是“怎么做一类任务”的过程说明；表说明、指标口径、数据质量、预置查询等事实知识放在 `knowledge/`。

- `skills/` 随包发布、运行时加载，普通问答轮和报告轮都会注入技能目录；
- 默认带**通用分析能力**（`data-analysis`、`report-authoring`）和**WMS 分析能力**（4 个技能），不绑定具体厂家；
- 行业/客户技能直接写在 `skills/<name>/` 下，按客户业务改写；
- 打包前由客户后端生成，打包后运行时只读。一个客户一个包。

```
skills/                          # 随包发布
├─ data-analysis/                # 通用数据分析方法论
│  └─ SKILL.md
├─ report-authoring/             # 报告结构、图表选型、coverage
│  ├─ SKILL.md
│  └─ references/
├─ wms-inventory-analysis/       # 库存健康：周转、库龄、呆滞、ABC
│  ├─ SKILL.md
│  └─ references/
├─ wms-inbound-analysis/         # 入库履约：收货、上架、差异
├─ wms-outbound-analysis/        # 出库履约：满足率、准时率、拣货
├─ wms-operations-analysis/      # 作业效率：人效、工时、峰值
└─ <name>/                       # 客户自定义技能
   ├─ SKILL.md
   └─ references/                # 可选：技能引用的文本
```

## SKILL.md 格式

使用标准 YAML frontmatter，和 Claude Skills 一致：

```md
---
name: sales-trend
description: 分析销售趋势，覆盖核心指标、对比和异常
when_to_use: 用户要看销售趋势 / 环比同比 / 品类结构
version: 1
appliesTo:
  database: ['YOUR_DATABASE']
---

# 销售趋势分析

## 步骤

1. 确认统计周期和数据截止日期；
2. 查核心指标；
3. 查趋势和结构；
4. 输出报告并标注 coverage。
```

- `name`：必填，技能唯一名；建议英文小写 + 连字符；
- `description`：必填，写清技能做什么；
- `when_to_use`：可选，写清什么任务下使用；
- `version`：可选；
- `appliesTo`：可选，记录适用数据库/系统（如 `system: ['WMS']`）；仅作说明，不参与运行时过滤。

## 运行时怎么用

- 系统提示只注入技能目录：`name + description + when_to_use`，不注入全文；
- 模型判断任务匹配后调用 `read_skill(name)` 读取完整步骤；
- 需要 `references/` 或 `assets/` 下的文本文件时调用 `read_skill_file(name, path)`；
- 技能里的 SQL、表名只是示例，执行前仍要确认当前库的表和字段；
- 不执行技能里的脚本。技能只作为流程说明，避免本地任意代码执行。

## WMS 厂家差异怎么处理

WMS 技能只写中性概念和算法，**不写死厂家表名、状态码、单据类型**。每个客户在 `knowledge/` 里补映射，技能执行时先查映射：

```md
# knowledge/docs/wms-mapping.md

| 概念 | 实际表/字段 | 状态码 | 备注 |
|---|---|---|---|
| 库存快照 | dbo.Stock | - | 每日 00:00 快照 |
| 可用库存 | Stock.Qty - Stock.LockQty | Status = 1 | 是否含质检需确认 |
| 出库单 | dbo.OutOrder | Type = 2 | 与入库共用表 |
```

- 技能用 `search_knowledge` / `read_knowledge` 找映射，再用 `get_table_schema(detail="profile")` 验证枚举；
- 映射缺失时标 `needs_review`，禁止猜表名和状态码；
- `appliesTo` 只是说明字段，不参与运行时过滤。

## 边界

- `knowledge/`：数据库是什么、表/字段含义、指标公式、数据缺口、预置查询；
- `skills/`：分析流程、异常怎么排查、报告分几节、先查什么后查什么；
- 报告模板属于过程性知识，放 `skills/report-authoring/SKILL.md`，不再放 `knowledge/reports/`；
- 表 profile（行数/日期范围/枚举/空值）是核心内置能力，不依赖任何知识包。

## 构建

```powershell
npm run skills:index
npm run release
```

- 校验 `skills/*/SKILL.md` 的 frontmatter、重名、路径和文件大小；
- 生成 `skills/.index.json`；
- 把 `skills/` 打进发布包；
- 没有 `skills/` 时 agent 正常运行，只是不注册技能工具；
- 报告轮同样注入技能目录，并允许 `list_skills` / `read_skill` / `read_skill_file`；
- frontmatter 非法时构建失败。

运行时只读；修改技能 = 重新生成并重新打包。
