# WMS_StockTransferDetails 库存调拨单明细

> 由 ABP 源码自动生成
## 用途
库存调拨单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| WarehouseId | Guid? | 是 | 仓库ID |
| LineId | int | 否 | 行号 |
| StockTransferId | Guid | 否 | 库存调拨单ID |
| StockTransferDetailState | StockTransferDetailStateEnum | 否 | 调拨单明细状态 |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| SourceStockId | Guid? | 是 | 源库存ID |
| TargetStockJson | string? | 是 | 目标库存记录JSON |
| SapWbsId | Guid? | 是 | SAP-WBS元素ID |
| DownQty | decimal? | 是 | 已下架数量 |
| ShelvedQty | decimal? | 是 | 已上架数量 |
| SourceStorageLocationId | Guid? | 是 | 源库存地点ID |
| TargetStorageLocationId | Guid? | 是 | 目标库存地点ID |
| SourceContainerId | Guid? | 是 | 源容器ID |
| TargetContainerId | Guid? | 是 | 目标容器ID |
| SourceCargoLocationId | Guid? | 是 | 源库位ID |
| TargetCargoLocationId | Guid? | 是 | 目标库位ID |
| TotalQty | decimal | 否 | 源库存总数量 |
| StockQty | decimal | 否 | 源库存可用数量 |
| Qty | decimal | 否 | 申请调拨数量 |
| CreateUser | string | 否 | 创建人 |
| SpecialStock | string | 否 | 特殊库存标识 |
| TransferReason | string | 否 | 调拨原因 |
| DownTime | DateTime? | 是 | 下架时间 |
| ShelvedTime | DateTime? | 是 | 上架时间 |
| SupplierId | Guid? | 是 | 供应商ID |

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
- `Id`、`WarehouseId`、`LineId`、`StockTransferId`、`ProductId`、`ProductBatchId`、`SourceStockId`、`SapWbsId`、`SourceStorageLocationId`、`TargetStorageLocationId`、`SourceContainerId`、`TargetContainerId`、`SourceCargoLocationId`、`TargetCargoLocationId`、`SupplierId`

## 关系
- WMS_Suppliers（1:N）：`WMS_StockTransferDetails.SupplierId = WMS_Suppliers.Id`
- WMS_StockTransfers（1:N）：`WMS_StockTransferDetails.StockTransferId = WMS_StockTransfers.Id`
- WMS_Products（1:N）：`WMS_StockTransferDetails.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_StockTransferDetails.ProductBatchId = WMS_ProductBatchs.Id`
- WMS_Stocks（1:N）：`WMS_StockTransferDetails.SourceStockId = WMS_Stocks.Id`
- WMS_Containers（1:N）：`WMS_StockTransferDetails.SourceContainerId = WMS_Containers.Id`
- WMS_Containers（1:N）：`WMS_StockTransferDetails.TargetContainerId = WMS_Containers.Id`
- WMS_CargoLocations（1:N）：`WMS_StockTransferDetails.SourceCargoLocationId = WMS_CargoLocations.Id`
- WMS_CargoLocations（1:N）：`WMS_StockTransferDetails.TargetCargoLocationId = WMS_CargoLocations.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
