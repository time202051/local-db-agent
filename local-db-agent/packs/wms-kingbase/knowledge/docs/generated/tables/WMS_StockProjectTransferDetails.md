# WMS_StockProjectTransferDetails 库存项目调拨单明细

> 由 ABP 源码自动生成
## 用途
库存项目调拨单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| StockProjectTransferId | Guid | 否 | 调拨单ID |
| LineNum | int | 否 | 行号 |
| StockId | Guid? | 是 | 库存Id |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| SapStorageLocationId | Guid? | 是 | SAP库存地点ID |
| SapWbsId | Guid? | 是 | WBS元素ID |
| TargetSapWbsId | Guid? | 是 | 目标WBS元素ID |
| TargetProductId | Guid? | 是 | 目标物料ID |
| SpecialStock | string | 否 | 特殊库存 |
| Remark | string | 否 | 备注 |
| TransferQty | decimal | 否 | 调拨数量 |

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
- `Id`、`StockProjectTransferId`、`StockId`、`ProductId`、`ProductBatchId`、`SapStorageLocationId`、`SapWbsId`、`TargetSapWbsId`、`TargetProductId`

## 关系
- WMS_StockProjectTransfers（1:N）：`WMS_StockProjectTransferDetails.StockProjectTransferId = WMS_StockProjectTransfers.Id`
- WMS_Stocks（1:N）：`WMS_StockProjectTransferDetails.StockId = WMS_Stocks.Id`
- WMS_Products（1:N）：`WMS_StockProjectTransferDetails.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_StockProjectTransferDetails.ProductBatchId = WMS_ProductBatchs.Id`
- WMS_Products（1:N）：`WMS_StockProjectTransferDetails.TargetProductId = WMS_Products.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/stock-project-transfer/stock-project-transfer-detail-pages — 调拨明细分页查询
<!-- api:end -->
