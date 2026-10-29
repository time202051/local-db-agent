# WMS_PickTasks 拣货任务

> 由 ABP 源码自动生成
## 用途
拣货任务

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| WarehouseId | Guid? | 是 | 仓库ID |
| PickTaskNo | string | 否 | 任务波次号 |
| PickTaskSeq | int | 否 | 序号 |
| PickId | Guid? | 是 | 拣选单ID |
| ContainerId | Guid? | 是 | 容器ID |
| AreaId | Guid? | 是 | 库区ID |
| CargoLocationId | Guid? | 是 | 库位ID |
| StockOutId | Guid? | 是 | 出库单ID |
| StockOutDetailId | Guid? | 是 | 出库单明细ID |
| StockId | Guid? | 是 | 库存ID |
| NewStockId | Guid? | 是 | 新库存ID |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| SapStorageLocationId | Guid? | 是 | SAP库存地点ID |
| SapWbsId | Guid? | 是 | SAP-WBS元素ID |
| SpecialStock | string? | 是 | 特殊库存 |
| PurchaseOrderNo | string? | 是 | 采购订单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| ProductionTime | DateTime? | 是 | 生产日期 |
| ReceivingTime | DateTime? | 是 | 收货日期 |
| Qty | decimal | 否 | 数量 |
| PickQty | decimal | 否 | 已拣货数量 |
| VerifyQty | decimal | 否 | 已复核数量 |
| SerialNo | string | 否 | 单件码 |
| EngineSnCode | string | 否 | 台份号 |
| EngineSnName | string? | 是 | 台份阶段 |
| PickTaskState | PickStateEnum | 否 | 拣货状态 |
| VerifyState | VerifyStateEnum | 否 | 复核状态 |
| AssignType | AssignTypeEnum | 否 | 指派状态 |
| IsGenerated | bool | 否 | 是否生成 |
| PickTime | DateTime? | 是 | 拣货时间 |
| VerifyTime | DateTime? | 是 | 复核时间 |

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
- `Id`、`WarehouseId`、`PickId`、`ContainerId`、`AreaId`、`CargoLocationId`、`StockOutId`、`StockOutDetailId`、`StockId`、`NewStockId`、`ProductId`、`ProductBatchId`、`SapStorageLocationId`、`SapWbsId`

## 索引字段
- `CreationTime`

## 关系
- WMS_Picks（1:N）：`WMS_PickTasks.PickId = WMS_Picks.Id`
- WMS_Containers（1:N）：`WMS_PickTasks.ContainerId = WMS_Containers.Id`
- WMS_Areas（1:N）：`WMS_PickTasks.AreaId = WMS_Areas.Id`
- WMS_CargoLocations（1:N）：`WMS_PickTasks.CargoLocationId = WMS_CargoLocations.Id`
- WMS_StockOuts（1:N）：`WMS_PickTasks.StockOutId = WMS_StockOuts.Id`
- WMS_StockOutDetails（1:N）：`WMS_PickTasks.StockOutDetailId = WMS_StockOutDetails.Id`
- WMS_Stocks（1:N）：`WMS_PickTasks.StockId = WMS_Stocks.Id`
- WMS_Stocks（1:N）：`WMS_PickTasks.NewStockId = WMS_Stocks.Id`
- WMS_Products（1:N）：`WMS_PickTasks.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_PickTasks.ProductBatchId = WMS_ProductBatchs.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/pda-offline/pick-task-list
- GET /api/app/pda-stock-out/pick-task-list — 获取拣货任务信息(分页)
- GET /api/app/pda-stock-out/pick-task-by-id/{pickTaskId} — 获取单条拣货任务
- POST /api/app/stock-out/pick-task-pages — 获取拣货任务分页数据信息
- POST /api/app/stock-out/export-pick-task — 拣货任务导出
- POST /api/app/stock-out/generate-pick-task — 生成拣货任务
- POST /api/app/stock-out/dispose-pick-task — 拣货任务取消分配
- DELETE /api/app/stock-out/pick-task/{pickTaskId} — 删除拣货任务
- GET /api/app/stock-out/pick-task-info-for-reprint — 按拣货任务明细补打信息卡(不更新拣货单打印计数)
<!-- api:end -->
