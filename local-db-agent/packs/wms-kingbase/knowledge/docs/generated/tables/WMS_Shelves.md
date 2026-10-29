# WMS_Shelves 货架

> 由 ABP 源码自动生成
## 用途
货架

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| Code | string | 否 | 货架编码 |
| Name | string | 否 | 货架名称 |
| RegionId | Guid | 否 | 区域ID |
| RoadWayId | Guid? | 是 | 巷道ID |
| Direction | int | 否 | 方向 |
| Enabled | bool | 否 | 是否启用 |
| MaxColumn | int | 否 | 最大列 |
| MaxLayer | int | 否 | 最大层 |
| Partition | string? | 是 | 所属分区 |
| CreatedUser | string | 否 | 创建人 |
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
- `Id`、`TenantId`、`RegionId`、`RoadWayId`

## 索引字段
- `Code`

## 关系
- WMS_Regions（1:N）：`WMS_Shelves.RegionId = WMS_Regions.Id`
- WMS_RoadWays（1:N）：`WMS_Shelves.RoadWayId = WMS_RoadWays.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/warehouse/shelf-select — 获取货架下拉框数据
- POST /api/app/warehouse/shelf-list — 获取货架分页信息（支持动态查询）
- POST /api/app/warehouse/shelf — 创建货架信息
- PUT /api/app/warehouse/shelf/{shelfId} — 编辑货架信息
- DELETE /api/app/warehouse/shelf/{shelfId} — 删除货架信息
- GET /api/app/warehouse/shelf-by-id/{shelfId} — 根据ID获取单条货架信息
- POST /api/app/warehouse/export-shelf — 货架信息导出
- POST /api/app/warehouse/init-shelf-cargo-locations/{shelfId} — 根据货架初始化库位 货位编码规则：货架号-层-列
<!-- api:end -->
