# WMS_ProductPidInfos 物料PID信息

> 由 ABP 源码自动生成
## 用途
物料PID信息

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid | 否 | 物料批次ID |
| Pid1 | string | 否 | PID1 |
| SeqNo | int | 否 | 序号 |
| DrawVersion | string | 否 | 图版次号 |
| ProductPhotoId | Guid? | 是 | 物料图片ID |

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
- `Id`、`TenantId`、`ProductId`、`ProductBatchId`、`ProductPhotoId`

## 索引字段
- `ProductId`、`Pid1`

## 关系
- WMS_Products（1:N）：`WMS_ProductPidInfos.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_ProductPidInfos.ProductBatchId = WMS_ProductBatchs.Id`
- WMS_ProductPhotos（1:N）：`WMS_ProductPidInfos.ProductPhotoId = WMS_ProductPhotos.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
