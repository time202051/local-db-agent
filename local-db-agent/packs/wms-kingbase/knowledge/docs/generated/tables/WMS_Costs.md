# WMS_Costs 成本中心

> 由 ABP 源码自动生成
## 用途
成本中心

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| MANDT | string | 否 | 集团 |
| KOKRS | string | 否 | 控制范围 |
| KOSTL | string | 否 | 成本中心 |
| DATBI | string | 否 | 有效截至日期 |
| DATAB | string | 否 | 开始生效日期 |
| VERAK | string | 否 | 负责人 |
| KOSAR | string | 否 | 成本中心类型 |
| KHINR | string | 否 | 标准层次结构区域 |
| BUKRS | string | 否 | 公司代码 |
| FUNC_AREA | string | 否 | 功能范围 |
| WAERS | string | 否 | 货币码 |
| PRCTR | string | 否 | 利润中心 |
| MGEFL | string | 否 | 记录消耗数量的标志 |
| BKZKP | string | 否 | 实际初级成本的冻结标志 |
| BKZKS | string | 否 | 实际次级成本的冻结标志 |
| BKZER | string | 否 | 实际收入登记的冻结标志 |
| PKZKP | string | 否 | 计划初级成本冻结标志 |
| PKZKS | string | 否 | 计划次级成本冻结标志 |
| PKZER | string | 否 | 计划收入冻结标志 |
| BKZOB | string | 否 | 未清项的冻结标志 |
| USNAM | string | 否 | 输入者 |
| ERSDA | DateTime? | 是 | 创建日期 |
| SPRAS | string | 否 | 语言代码 |
| KTEXT | string | 否 | 成本中心名称 |

## 继承/审计字段
- `Id`：主键
- `TenantId`：租户 ID（多租户）
- `IsDeleted`：软删除标记，默认查询应排除
- `CreationTime`：创建时间
- `CreatorId`：创建人
- `LastModificationTime`：最后修改时间
- `LastModifierId`：最后修改人
- `DeletionTime`：删除时间
- `DeleterId`：删除人

## 关键字段
- `Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/cost/cost-pages — 成本中心分页查询
- POST /api/app/cost/export-cost — 成本中心导出
- GET /api/app/cost/cost-select — 成本中心下拉
- POST /api/app/cost/cost — 创建成本中心
- DELETE /api/app/cost/cost/{costId} — 删除成本中心
- PUT /api/app/cost/cost/{costId} — 更新成本中心
- POST /api/app/data-sync/sync-cost — 同步成本中心数据
<!-- api:end -->
