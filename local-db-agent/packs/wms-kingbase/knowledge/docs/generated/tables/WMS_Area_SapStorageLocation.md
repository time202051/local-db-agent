# WMS_Area_SapStorageLocation 库区与SAP库存地点关联

> 由 ABP 源码自动生成
## 用途
库区与SAP库存地点关联

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| AreaId | Guid | 否 | 库区ID |
| SapStorageLocationId | Guid | 否 | SAP库存地点ID |
| SapStorageLocation | SapWbsInfo.SapStorageLocation | 否 | SAP库存地点导航属性 |
| Remark | string | 否 | 备注 |
| CreationTime | DateTime | 否 | 创建时间 |
| CreatorId | Guid? | 是 | 创建人ID |

## 继承/审计字段
- `Id`：主键
- `IsDeleted`：软删除标记，默认查询应排除
- `LastModificationTime`：最后修改时间
- `LastModifierId`：最后修改人
- `DeletionTime`：删除时间
- `DeleterId`：删除人

## 关键字段
- `Id`、`TenantId`、`AreaId`、`SapStorageLocationId`、`CreatorId`

## 索引字段
- `AreaId`、`SapStorageLocationId`

## 关系
- WMS_Areas（1:N）：`WMS_Area_SapStorageLocation.AreaId = WMS_Areas.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/area-sap-storage-location/{id} — 获取单个关联详情
- PUT /api/app/area-sap-storage-location/{id} — 更新关联（仅更新备注）
- DELETE /api/app/area-sap-storage-location/{id} — 删除关联
- GET /api/app/area-sap-storage-location — 获取所有关联列表
- POST /api/app/area-sap-storage-location — 创建关联
- POST /api/app/area-sap-storage-location/list — 分页查询关联列表（支持动态查询）
- POST /api/app/area-sap-storage-location/export-area-sap-storage-location — 库区与SAP库存地点关联导出
- GET /api/app/area-sap-storage-location/by-area-id/{areaId} — 根据库区ID获取关联列表
- DELETE /api/app/area-sap-storage-location/by-area-id/{areaId} — 根据库区ID删除所有关联
- GET /api/app/area-sap-storage-location/by-sap-storage-location-id/{sapStorageLocationId} — 根据SAP库存地点ID获取关联列表
- DELETE /api/app/area-sap-storage-location/by-sap-storage-location-id/{sapStorageLocationId} — 根据SAP库存地点ID删除所有关联
- GET /api/app/area-sap-storage-location/by-sap-storage-location-id-select/{sapStorageLocationId} — 根据SAP库存地点ID获取关联下拉框
- POST /api/app/area-sap-storage-location/many — 批量创建关联
- DELETE /api/app/area-sap-storage-location/many — 批量删除关联
- POST /api/app/data-sync/sync-storage-location — 同步库存地点
- PUT /api/app/purchase-inbound/temp-storage-location — 修改到货登记暂存区库位编码
- POST /api/app/test-back/init-location — 初始化库位（针对大数据量优化，支持 20 万+ 记录）
- POST /api/app/warehouse/area-sap-storage-locations-page — 获取库区库存地点分页数据（支持动态查询）
- POST /api/app/warehouse/set-area-sap-storage-locations — 设置库区关联的库存地点
- GET /api/app/warehouse/area-sap-storage-locations/{areaId} — 获取库区关联的库存地点列表
<!-- api:end -->
