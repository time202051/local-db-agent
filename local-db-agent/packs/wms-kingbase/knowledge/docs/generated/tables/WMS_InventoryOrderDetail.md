# WMS_InventoryOrderDetail 盘点单明细

> 由 ABP 源码自动生成
## 用途
盘点单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| StockId | Guid? | 是 | 库存ID |
| Qty | decimal | 否 | 库存数量 |
| RealQty | decimal | 否 | 实盘数量 |
| IltPersonName | string | 否 | 盘点人 |
| ConfirmPersonName | string | 否 | 复核人 |

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
- `Id`、`TenantId`、`StockId`

## 关系
- WMS_Stocks（1:N）：`WMS_InventoryOrderDetail.StockId = WMS_Stocks.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
