# WMS_BindRecords 组盘记录

> 由 ABP 源码自动生成
## 用途
组盘记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| OrginalBillNo | string | 否 | 来源单号 |
| StockInDetailId | Guid? | 是 | 入库单明细ID |
| LPN | string | 否 | 流水码 |
| WarehouseId | Guid | 否 | 仓库ID |
| ProductId | Guid | 否 | 物料ID |
| OwnerId | Guid? | 是 | 工厂ID |
| ProductBatch | string | 否 | 物料批次 |
| ContainerId | Guid? | 是 | 容器ID |
| Container | WarehouseInfo.Entitys.Container | 否 | 容器 |
| CargoLocationId | Guid? | 是 | 货位ID |
| CargoLocation | WarehouseInfo.Entitys.CargoLocation | 否 | 货位 |
| TempBoxCode | string | 否 | 临时箱号 |
| Qty | decimal | 否 | 组盘数量 |
| GroundShelfType | GroundShelfTypeEnum | 否 | 上架类型 |
| RegionId | Guid | 否 | 区域ID |
| BusinessTaskId | Guid? | 是 | 任务ID |
| Remark | string | 否 | 备注 |
| CreateUser | string | 否 | 创建人 |
| CabinetNumber | string | 否 | 隔板号 |
| BindStateEnum | BindStateEnum | 否 | 组盘状态 |
| NeedCallBack | bool | 否 | 是否需要回传 |
| LoadSubContainerCode | string | 否 | 承载子容器编码 |
| Pid3 | string | 否 | Pid3 |
| Pid4 | string | 否 | Pid4 |
| Pid1 | string | 否 | Pid1 |
| DesignUnit | string | 否 | 设计台份 |
| ApplicationUnits | string | 否 | 应用台份号 |
| Haplont | string | 否 | 单元体 |
| SerialNumber | string | 否 | 序列号 |
| ItemBatch | string | 否 | 批次号 |
| Airworthiness | Boolean | 否 | 是否适航批 |
| ContainerPhotoId | Guid? | 是 | 容器图片ID |
| BillNo | string? | 是 | 参考单号 |

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
- `Id`、`TenantId`、`StockInDetailId`、`WarehouseId`、`ProductId`、`OwnerId`、`ContainerId`、`CargoLocationId`、`RegionId`、`BusinessTaskId`、`ContainerPhotoId`

## 关系
- WMS_StockInDetails（1:N）：`WMS_BindRecords.StockInDetailId = WMS_StockInDetails.Id`
- WMS_BussinessTasks（1:N）：`WMS_BindRecords.BusinessTaskId = WMS_BussinessTasks.Id`
- WMS_Warehouses（1:N）：`WMS_BindRecords.WarehouseId = WMS_Warehouses.Id`
- WMS_Products（1:N）：`WMS_BindRecords.ProductId = WMS_Products.Id`
- WMS_Owners（1:N）：`WMS_BindRecords.OwnerId = WMS_Owners.Id`
- WMS_Regions（1:N）：`WMS_BindRecords.RegionId = WMS_Regions.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/stock-in/bind-record-detail-pages — 获取码盘记录明细数据
- GET /api/app/stock-in/bind-record-pages — 获取码盘记录汇总数据
- POST /api/app/stock-in/export-bind-record-detail — 码盘记录明细导出
- POST /api/app/stock-in/export-bind-record — 码盘记录汇总导出
- POST /api/app/stock-in/cancle-bind-record — 撤销码盘
<!-- api:end -->
