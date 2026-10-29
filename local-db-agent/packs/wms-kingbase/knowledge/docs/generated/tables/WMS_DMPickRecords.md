# WMS_DMPickRecords 拣货记录

> 由 ABP 源码自动生成
## 用途
拣货记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| StockOutBillNo | string | 否 | 出库单号 |
| StockOutLineId | int? | 是 | 出库单行号 |
| ProductId | Guid | 否 | 物料ID |
| CreateUser | string | 否 | 操作人 |
| ContainerCode | string | 否 | 容器编号 |
| Qty | decimal | 否 | 数量 |
| PickPhotoId | Guid? | 是 | 物料图片ID |
| YLPhotoId | Guid? | 是 | 容器图片ID |

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
- `Id`、`TenantId`、`StockOutLineId`、`ProductId`、`PickPhotoId`、`YLPhotoId`

## 关系
- WMS_Products（1:N）：`WMS_DMPickRecords.ProductId = WMS_Products.Id`
- WMS_PickPhotos（1:N）：`WMS_DMPickRecords.PickPhotoId = WMS_PickPhotos.Id`
- WMS_YLPhotos（1:N）：`WMS_DMPickRecords.YLPhotoId = WMS_YLPhotos.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
