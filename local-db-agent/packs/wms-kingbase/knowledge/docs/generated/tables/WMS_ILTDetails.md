# WMS_ILTDetails 盘点单明细

> 由 ABP 源码自动生成
## 用途
盘点单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ILTState | IltStateEnum | 否 | 盘点单状态 |
| ITT | InventoryTypeEnum | 否 | 盘点单类型 |
| BillNo | string | 否 | 盘点单号 |
| ILTId | Guid | 否 | 盘点单ID |
| LineId | int | 否 | 行号 |
| ProductId | Guid? | 是 | 物料ID |
| ItemModel | string | 否 | 物料规格 |
| BatchNo | string | 否 | 物料批次 |
| Qty | decimal | 否 | 账面数量 |
| ILTQty | decimal | 否 | 实际数量 |
| DiffQty | decimal | 否 | 差异数量 |
| ContainerId | Guid? | 是 | 容器ID |
| CargoLocationId | Guid? | 是 | 库位ID |
| StockId | Guid? | 是 | 库存ID |
| IsDownTask | bool | 否 | 是否下发任务 |
| IsFinish | bool | 否 | 是否完成 |
| CreateUser | string | 否 | 创建人 |
| TaskCode | string? | 是 | WMS任务号 |

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
- `Id`、`TenantId`、`ILTId`、`LineId`、`ProductId`、`ContainerId`、`CargoLocationId`、`StockId`

## 关系
- WMS_ILTs（1:N）：`WMS_ILTDetails.ILTId = WMS_ILTs.Id`
- WMS_Containers（1:N）：`WMS_ILTDetails.ContainerId = WMS_Containers.Id`
- WMS_CargoLocations（1:N）：`WMS_ILTDetails.CargoLocationId = WMS_CargoLocations.Id`
- WMS_Products（1:N）：`WMS_ILTDetails.ProductId = WMS_Products.Id`
- WMS_Stocks（1:N）：`WMS_ILTDetails.StockId = WMS_Stocks.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
