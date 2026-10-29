# WMS_StockTransferOperateRecords 库存调拨上下架操作记录

> 由 ABP 源码自动生成
## 用途
库存调拨上下架操作记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| WarehouseId | Guid? | 是 | 仓库ID |
| StockTransferId | Guid? | 是 | 库存调拨单ID |
| StockTransferDetailId | Guid? | 是 | 库存调拨明细ID |
| BillNo | string | 否 | 调拨单号 |
| LineId | int? | 是 | 调拨单行号 |
| OperateType | StockTransferOperateTypeEnum | 否 | 操作类型 |
| Qty | decimal | 否 | 本次操作数量 |
| OperateUser | string | 否 | 操作人 |
| OperateTime | DateTime | 否 | 操作时间 |
| TransferReason | string | 否 | 调拨原因 |
| ProductId | Guid | 否 | 物料ID |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| ItemBatch | string | 否 | SAP批次号 |
| SupplierBatch | string | 否 | 供应商批次 |
| SourceStockId | Guid? | 是 | 源库存ID |
| SourceStorageLocationId | Guid? | 是 | 源库存地点ID |
| SourceStorageLocationCode | string | 否 | 源库存地点编码 |
| SourceAreaId | Guid? | 是 | 源库区ID |
| SourceCargoLocationId | Guid? | 是 | 源库位ID |
| SourceCargoLocationCode | string | 否 | 源库位编码 |
| SourceContainerId | Guid? | 是 | 源容器ID |
| SourceContainerCode | string | 否 | 源容器编码 |
| TargetStockId | Guid? | 是 | 目标库存ID |
| TargetStorageLocationId | Guid? | 是 | 目标库存地点ID |
| TargetStorageLocationCode | string | 否 | 目标库存地点编码 |
| TargetAreaId | Guid? | 是 | 目标库区ID |
| TargetCargoLocationId | Guid? | 是 | 目标库位ID |
| TargetCargoLocationCode | string | 否 | 目标库位编码 |
| TargetContainerId | Guid? | 是 | 目标容器ID |
| TargetContainerCode | string | 否 | 目标容器编码 |
| SapWbsId | Guid? | 是 | WBS元素ID |
| Posid | string | 否 | WBS元素编码 |
| SpecialStock | string | 否 | 特殊库存标识 |
| SpecialStockNumber | string | 否 | WBS元素 |
| SupplierId | Guid? | 是 | 供应商ID |
| SupplierName | string | 否 | 供应商名称 |
| EngineSnCode | string | 否 | 台份号 |
| SerialNo | string | 否 | 单件码 |

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
- `Id`、`TenantId`、`WarehouseId`、`StockTransferId`、`StockTransferDetailId`、`LineId`、`ProductId`、`ProductBatchId`、`SourceStockId`、`SourceStorageLocationId`、`SourceAreaId`、`SourceCargoLocationId`、`SourceContainerId`、`TargetStockId`、`TargetStorageLocationId`、`TargetAreaId`、`TargetCargoLocationId`、`TargetContainerId`、`SapWbsId`、`SupplierId`

## 索引字段
- `StockTransferId`、`StockTransferDetailId`、`BillNo`、`OperateType`、`OperateTime`、`ProductCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/stock-transfer/stock-transfer-operate-record-pages — 获取库存调拨上下架操作记录分页数据
- GET /api/app/stock-transfer/stock-transfer-operate-records-by-bill-no — 获取库存调拨上下架操作记录列表（不分页）
<!-- api:end -->
