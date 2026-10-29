# WMS_StockDiffAdjustmentDetails 盘点差异调整单明细

> 由 ABP 源码自动生成
## 用途
盘点差异调整单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| StockDiffAdjustmentId | Guid | 否 | 盘点差异调整单ID |
| ILTId | Guid | 否 | 关联盘点单ID |
| ILTBillNo | string | 否 | 关联盘点单号 |
| LineNum | int | 否 | 行号 |
| StockId | Guid? | 是 | 库存ID |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| SapStorageLocationId | Guid | 否 | SAP库存地点ID |
| SapWbsId | Guid? | 是 | WBS元素ID |
| DiffQty | decimal | 否 | 差异数量 |
| Unit | string? | 是 | 单位 |
| SpecialStock | string? | 是 | 特殊库存 |
| InventoryType | string? | 是 | 库存类型 |
| ManufacturingVersion | string? | 是 | 制造版次 |
| InspectionInfo | string? | 是 | 制造符合检查件 |
| EngineSnCode | string? | 是 | 台份号 |
| EngineSetStage | string? | 是 | 台份阶段 |
| Remark | string? | 是 | 备注 |

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
- `Id`、`TenantId`、`StockDiffAdjustmentId`、`ILTId`、`StockId`、`ProductId`、`ProductBatchId`、`SapStorageLocationId`、`SapWbsId`

## 关系
- WMS_ILTs（1:N）：`WMS_StockDiffAdjustmentDetails.ILTId = WMS_ILTs.Id`
- WMS_StockDiffAdjustments（1:N）：`WMS_StockDiffAdjustmentDetails.StockDiffAdjustmentId = WMS_StockDiffAdjustments.Id`
- WMS_Stocks（1:N）：`WMS_StockDiffAdjustmentDetails.StockId = WMS_Stocks.Id`
- WMS_Products（1:N）：`WMS_StockDiffAdjustmentDetails.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_StockDiffAdjustmentDetails.ProductBatchId = WMS_ProductBatchs.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/stock-diff-adjustment/stock-diff-adjustment-detail-page — 盘点差异调整单明细分页
<!-- api:end -->
