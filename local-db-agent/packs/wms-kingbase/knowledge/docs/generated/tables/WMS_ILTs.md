# WMS_ILTs 盘点单

> 由 ABP 源码自动生成
## 用途
盘点单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ILTState | IltStateEnum | 否 | 盘点单状态 |
| ITT | InventoryTypeEnum | 否 | 盘点单类型 |
| InventoryMode | InventoryModeEnum | 否 | 盘点模式 |
| TaskCode | string? | 是 | WMS任务号 |
| BillNo | string | 否 | 盘点单号 |
| LineId | int? | 是 | 行号 |
| ProductId | Guid? | 是 | 物料ID |
| ItemModel | string? | 是 | 物料规格 |
| BatchNo | string? | 是 | 物料批次 |
| Qty | decimal? | 是 | 账面数量 |
| ILTQty | decimal? | 是 | 实际数量 |
| DiffQty | decimal? | 是 | 差异数量 |
| ContainerId | Guid? | 是 | 容器ID |
| CargoLocationId | Guid? | 是 | 库位ID |
| ProductBatchId | Guid? | 是 | 批次外键 |
| StockId | Guid? | 是 | 库存ID |
| IsDownTask | bool? | 是 | 是否下发任务 |
| IsFinish | bool? | 是 | 是否完成 |
| CreateUser | string | 否 | 创建人 |
| ILTUserId | Guid? | 是 | 盘点人ID |
| Remark | string? | 是 | 备注 |
| DiffAdjustedUserId | Guid? | 是 | 调整差异的处理人ID |
| DiffAdjustedTime | DateTime? | 是 | 调整差异的时间 |
| SourceType | StockTakingSourceEnum? | 是 | 盘点来源类型 |

## 继承/审计字段
- `Id`：主键
- `IsDeleted`：软删除标记，默认查询应排除
- `CreationTime`：创建时间
- `CreatorId`：创建人
- `LastModificationTime`：最后修改时间
- `LastModifierId`：最后修改人
- `DeletionTime`：删除时间
- `DeleterId`：删除人

## 关键字段
- `Id`、`TenantId`、`LineId`、`ProductId`、`ContainerId`、`CargoLocationId`、`ProductBatchId`、`StockId`、`ILTUserId`、`DiffAdjustedUserId`

## 索引字段
- `BillNo`

## 关系
- WMS_Stocks（1:N）：`WMS_ILTs.StockId = WMS_Stocks.Id`
- WMS_Containers（1:N）：`WMS_ILTs.ContainerId = WMS_Containers.Id`
- WMS_CargoLocations（1:N）：`WMS_ILTs.CargoLocationId = WMS_CargoLocations.Id`
- WMS_Products（1:N）：`WMS_ILTs.ProductId = WMS_Products.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/i-lT/export-iLTRecord — 盘点记录导出
- POST /api/app/i-lT/periodic-count-order — 【周期盘点】制单
- POST /api/app/i-lT/dynamic-count-order — 【动态盘点】制单
- POST /api/app/i-lT/count-order-pages — 【盘点单管理】分页查询盘点单（支持动态查询）
- POST /api/app/i-lT/cancel-count-order/{iltId} — 【盘点单管理】取消盘点单
- POST /api/app/i-lT/batch-cancel-count-order-asyn — 【盘点单管理】批量取消盘点单
- POST /api/app/i-lT/batch-set-count-order — 【盘点单管理】批量设置盘点人和备注
- POST /api/app/i-lT/count-diff-pages — 【盘点差异调整】查询已完成且有差异的盘点单（支持动态查询）
- POST /api/app/i-lT/re-count-order — 【盘点差异调整】复盘 — 对有差异的盘点单重新生成新盘点单
- GET /api/app/i-lT/pda-count-task-list — 【PDA】分页获取待盘点/盘点中的任务列表
- POST /api/app/i-lT/submit-pda-count-result — 【PDA】提交盘点结果（提交即完成）
- POST /api/app/i-lT/batch-submit-count-result — 【盘点单管理】批量提交盘点结果（提交即完成）
<!-- api:end -->
