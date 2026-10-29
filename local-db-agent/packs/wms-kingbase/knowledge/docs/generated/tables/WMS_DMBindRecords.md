# WMS_DMBindRecords 组盘记录

> 由 ABP 源码自动生成
## 用途
组盘记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| OrginalBillNo | string? | 是 | 来源单号 |
| DMStockDetailId | Guid? | 是 | 入库单明细外键 |
| LPN | string? | 是 | 流水码 |
| WarehouseId | Guid? | 是 | 仓库ID |
| ProductId | Guid? | 是 | 物料外键 |
| OwnerId | Guid? | 是 | 工厂外键 |
| ProductBatch | string? | 是 | 物料批次 |
| ContainerId | Guid? | 是 | 容器外键 |
| CargoLocationId | Guid? | 是 | 货位外键 |
| TempBoxCode | string? | 是 | 临时箱号 |
| Qty | decimal? | 是 | 组盘数量 |
| GroundShelfType | GroundShelfTypeEnum | 否 | 上架类型 |
| RegionId | Guid? | 是 | 上架区域外键 |
| BusinessTaskId | Guid? | 是 | 任务外键 |
| Remark | string? | 是 | 明细备注 |
| CreateUser | string? | 是 | 创建人 |
| CabinetNumber | string? | 是 | 隔板号 |
| BindStateEnum | BindStateEnum | 否 | 组盘状态 |
| NeedCallBack | bool | 否 | 是否需要回传 |
| LoadSubContainerCode | string? | 是 | 承载子容器编码 |
| ContainerPhotoId | Guid? | 是 | 组盘记录关联图片 |

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
- `Id`、`TenantId`、`DMStockDetailId`、`WarehouseId`、`ProductId`、`OwnerId`、`ContainerId`、`CargoLocationId`、`RegionId`、`BusinessTaskId`、`ContainerPhotoId`

## 关系
- WMS_BussinessTasks（1:N）：`WMS_DMBindRecords.BusinessTaskId = WMS_BussinessTasks.Id`
- WMS_Warehouses（1:N）：`WMS_DMBindRecords.WarehouseId = WMS_Warehouses.Id`
- WMS_Products（1:N）：`WMS_DMBindRecords.ProductId = WMS_Products.Id`
- WMS_Owners（1:N）：`WMS_DMBindRecords.OwnerId = WMS_Owners.Id`
- WMS_Containers（1:N）：`WMS_DMBindRecords.ContainerId = WMS_Containers.Id`
- WMS_CargoLocations（1:N）：`WMS_DMBindRecords.CargoLocationId = WMS_CargoLocations.Id`
- WMS_Regions（1:N）：`WMS_DMBindRecords.RegionId = WMS_Regions.Id`
- WMS_ContainerPhotos（1:N）：`WMS_DMBindRecords.ContainerPhotoId = WMS_ContainerPhotos.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
