# WMS_CargoLocations 库位

> 由 ABP 源码自动生成
## 用途
库位

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| WarehouseLocationName | string | 否 | 库位名称 |
| FloorNum | int | 否 | 排号 |
| AreaId | Guid? | 是 | 库区ID |
| ContainerTypeId | Guid? | 是 | 容器类型ID |
| StagingId | Guid? | 是 | 工作台ID |
| RoadWayId | Guid? | 是 | 巷道ID |
| ShelfId | Guid? | 是 | 货架ID |
| CargoLocationDepthId | Guid? | 是 | 库位深度ID |
| IsAgvPoint | bool | 否 | 是否是AGV搬运点位 |
| AgvPointCode | string | 否 | AGV点位编码 |
| Depth | int | 否 | 深度 |
| Height | int | 否 | 高度 |
| CreateUserName | string | 否 | 创建人名称 |

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
- `Id`、`TenantId`、`AreaId`、`ContainerTypeId`、`StagingId`、`RoadWayId`、`ShelfId`、`CargoLocationDepthId`

## 索引字段
- `WarehouseLocationCode`

## 关系
- WMS_Areas（1:N）：`WMS_CargoLocations.AreaId = WMS_Areas.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/i-lT/cargo-location-select — 获取货位信息下拉框
- POST /api/app/test-back/init-ltk-cargo-list
- GET /api/app/test-back/cargo-location-list-for-view/{roadWayId}
- POST /api/app/warehouse/bind-container-cargo-location/{containerId} — 绑定容器库位（根据容器ID及库位编码进行绑定）
- POST /api/app/warehouse/unbind-container-cargo-location/{containerId} — 解绑容器库位（根据容器ID解除其与库位的绑定关系）
- POST /api/app/warehouse/cargo-location-sort-list — 获取库位分页数据-排序（支持动态查询）
- GET /api/app/warehouse/cargo-location-by-code — 按货位编码查询货位（PDA 扫码使用，用 WarehouseLocationCode 反查 CargoLocationDto）
- POST /api/app/warehouse/cargo-location-list — 获取库位分页数据（支持动态查询）
- POST /api/app/warehouse/cargo-location — 创建库位
- POST /api/app/warehouse/many-cargo-location — 批量创建库位
- POST /api/app/warehouse/batch-set-cargo-location-area — 批量设置库位库区
- PUT /api/app/warehouse/cargo-location/{cargoLocationId} — 编辑库位
- DELETE /api/app/warehouse/cargo-location/{cargoLocationId} — 删除库位
- POST /api/app/warehouse/export-cargo-location — 库位信息导出
- GET /api/app/warehouse/cargo-location-select — 获取库位下拉框数据
- GET /api/app/warehouse/in-or-out-cargo-location-select — 获取出入库口下拉
- GET /api/app/warehouse/cargo-location-by-id/{cargoLocationId} — 根据ID获取单条数据
- GET /api/app/warehouse/cargo-location-print-infos
<!-- api:end -->
