# 客户知识包

知识包放**事实**：业务术语、表说明、指标口径、数据质量、预置查询。
过程性的“怎么做”放独立的 `skills/`，不要放在这里。

打包前由客户后端生成，打包后运行时只读。一个客户一个包。

```
knowledge/
├─ manifest.json
├─ docs/*.md
├─ queries/*.json
└─ .index.json         打包时生成
```

> `reports/*.md` 已 deprecated。报告结构、指标清单、写作步骤请放到
> `skills/<report>/SKILL.md`，不要继续放在 `knowledge/reports/`。

## manifest.json

```jsonc
{
  "name": "customer-xxx",
  "version": 1,
  "description": "该客户数据库的业务口径、表关系、常用查询",
  "appliesTo": { "database": ["DB_NAME"], "schemas": ["dbo"] },
  "priorityTables": ["CORE_Order"],
  "tables": {
    "CORE_Order": {
      "comment": "单据主表",
      "aliases": ["出库单", "入库单"],
      "keyColumns": ["OrderName", "OrderType", "AddTime"],
      "relationships": [
        {
          "to": "CORE_OrderDetail",
          "type": "1:N",
          "on": "CORE_Order.ID = CORE_OrderDetail.OrderID",
        },
      ],
      "doc": "docs/tables/CORE_Order.md",
      "status": "ready",
    },
  },
}
```

## docs/*.md

业务术语、表说明、数据质量说明。核心只在 prompt 里放标题索引；
模型需要细节时用 `search_knowledge` / `read_knowledge`。

## queries/*.json（可选）

```jsonc
{
  "key": "outbound_orders",
  "label": "出库单量",
  "description": "按单据头去重计数",
  "sql": {
    "sqlserver": "SELECT COUNT(DISTINCT OrderName) AS value FROM CORE_Order WHERE OrderType = 0 AND AddTime >= @from AND AddTime < @to",
    "kingbase": "...",
  },
  "params": ["from", "to"],
  "tables": ["CORE_Order"],
  "status": "ready",
}
```

`status` 可选 `ready / needs_review / missing`。核心不会内置任何业务 SQL。

## 报告模板

报告模板属于过程性知识，放 `skills/`：

```
skills/data-analysis/          # 内置：通用数据分析（随包发布）
skills/report-authoring/       # 内置：报告结构、图表选型、coverage
skills/<name>/SKILL.md         # 客户自定义技能，按业务改写
```

`SKILL.md` 里写步骤、指标、输出结构；具体表说明和预置查询仍从 `knowledge/` 读取。

## WMS 厂家差异映射

WMS 技能（`wms-inventory-analysis`、`wms-inbound-analysis`、`wms-outbound-analysis`、`wms-operations-analysis`）只写中性流程，不含任何厂家表名。每个客户应在 `docs/wms-mapping.md` 中提供映射：

```md
| 概念 | 实际表/字段 | 状态码 | 备注 |
|---|---|---|---|
| 库存快照 | dbo.Stock | - | 每日 00:00 快照 |
| 可用库存 | Stock.Qty - Stock.LockQty | Status = 1 | 是否含质检需确认 |
| 出库单 | dbo.OutOrder | Type = 2 | 与入库共用表 |
| 收货完成时间 | Receipt.FinishTime | Status = 30 | 部分收货需按行 |
```

- 映射是**事实**，放 `knowledge/`，不要写进 SKILL.md；
- 常用指标建议同时做成 `queries/*.json`，让模型优先走 `run_saved_query`；
- 缺少映射时技能会标 `needs_review`，不会猜状态码。

注意：表的行数/日期范围/枚举/空值（profile）、主键/外键关系是核心内置能力，不依赖知识包；
知识包用于补充**数据库字段本身说不清的业务口径**。

## 构建

`npm run release` 会：

1. 校验 `manifest.json`、文档路径、queries；
2. 生成 `knowledge/.index.json`；
3. 校验 `skills/*/SKILL.md`，生成 `skills/.index.json`；
4. 把 `knowledge/` 和 `skills/` 打进发布包。

运行时只读；修改知识/技能 = 重新生成并重新打包。

没有 `manifest.json` 时，agent 会以 generic 模式运行，`npm run release` 不会失败。
没有 `skills/` 时同样正常运行，只是不注册技能工具。
