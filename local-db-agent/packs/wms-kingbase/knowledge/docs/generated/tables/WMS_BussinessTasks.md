# WMS_BussinessTasks 设备任务

> 由 ABP 源码自动生成
## 用途
设备任务

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ContainerPhotoId | Guid? | 是 | 容器图片ID |
| WcsPhotoId | Guid? | 是 | WCS图片ID |
| TenantId | Guid? | 是 | 租户ID |
| TaskNo | string | 否 | 任务号 |
| InteractionSystem | TaskSystemEnum | 否 | 交互系统 |
| TaskStatus | TaskStatusEnum | 否 | 任务状态 |
| AgvTaskStaus | AgvTaskStausEnum | 否 | AGV任务状态 |
| TaskType | BusinessTypeEnum | 否 | 任务类型 |
| TaskNature | TaskNatureEnum | 否 | 出入库性质 |
| RegionId | Guid | 否 | 区域ID |
| RegionCode | string | 否 | 区域编码 |
| AreaId | Guid? | 是 | 库区ID |
| Region | OLD.WMS.Domain.WarehouseInfo.Entitys.Region | 否 | 区域导航属性 |
| ContainerShapeType | ContainerShapeTypeEnum | 否 | 容器类型 |
| ContainerId | Guid? | 是 | 容器ID |
| Container | OLD.WMS.Domain.WarehouseInfo.Entitys.Container | 否 | 容器 |
| ContainerCode | string | 否 | 容器编码 |
| GetCargoLocationId | Guid? | 是 | 取货库位ID |
| GetCargoLocationCode | string | 否 | 取货库位编码 |
| PutCargoLocationId | Guid? | 是 | 目标库位ID |
| PutCargoLocationCode | string | 否 | 目标库位编码 |
| GetRoadWayCode | string | 否 | 出库通道编码 |
| GetRoadWayId | Guid? | 是 | 出库通道ID |
| PutRoadWayCode | string | 否 | 入库通道编码 |
| PutHeight | decimal | 否 | 放货高度 |
| PutRoadWayId | Guid? | 是 | 入库通道ID |
| Priorty | int | 否 | 优先级 |
| DownTaskTime | DateTime? | 是 | 任务下达时间 |
| NeedDownTask | bool | 否 | 需要下发任务 |
| ComletedTime | DateTime? | 是 | 任务完成时间 |
| RemoveShelfTime | DateTime? | 是 | 下架时间 |
| RequestCount | int | 否 | 发送次数 |
| TaskReponse | TaskReponseEnum | 否 | 响应结果 |
| StackerKey | string | 否 | 堆垛机Key |
| Remark | string | 否 | 备注 |
| Point | WarehouseInfo.Entitys.Point | 否 | 点位 |
| PointId | Guid? | 是 | 点位ID |
| PointCode | string | 否 | 点位编码 |
| ExtraPoint | WarehouseInfo.Entitys.Point | 否 | 备用点位 |
| ExtraPointId | Guid? | 是 | 备用点位ID |
| ExtraPointCode | string | 否 | 备用点位编码 |
| DeviceCode | string | 否 | 提升机编号 |
| CurDeviceLayerNo | string | 否 | 当前提升机层 |
| TargetDeviceLayerNo | string | 否 | 目标提升机层 |
| Tunnel | int? | 是 | 所属巷道 |
| CreateUser | string | 否 | 创建人 |
| ReadPhoto | bool | 否 | 读取照片 |
| ReadPhotoIp | string | 否 | 照片读取IP |

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
- `Id`、`ContainerPhotoId`、`WcsPhotoId`、`TenantId`、`RegionId`、`AreaId`、`ContainerId`、`GetCargoLocationId`、`PutCargoLocationId`、`GetRoadWayId`、`PutRoadWayId`、`PointId`、`ExtraPointId`

## 索引字段
- `TaskNo`、`TaskStatus`、`ContainerCode`

## 关系
- WMS_CargoLocations（1:N）：`WMS_BussinessTasks.PutCargoLocationId = WMS_CargoLocations.Id`
- WMS_CargoLocations（1:N）：`WMS_BussinessTasks.GetCargoLocationId = WMS_CargoLocations.Id`
- WMS_RoadWays（1:N）：`WMS_BussinessTasks.PutRoadWayId = WMS_RoadWays.Id`
- WMS_RoadWays（1:N）：`WMS_BussinessTasks.GetRoadWayId = WMS_RoadWays.Id`
- WMS_Areas（1:N）：`WMS_BussinessTasks.AreaId = WMS_Areas.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/business-task/business-task-pages — 获取任务分页数据信息
- POST /api/app/business-task/export-business-task — 任务信息导出
- GET /api/app/business-task/{id}/business-task-photo-paths — 获取任务照片
- POST /api/app/business-task/reset-task — 重发
- POST /api/app/business-task/cancel-task-id — 取消任务
<!-- api:end -->
