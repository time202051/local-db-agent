# WMS_Areas 库区

> 由 ABP 源码自动生成
## 用途
库区

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| CreatedUser | string | 否 | 创建人 |
| WarehouseId | Guid | 否 | 仓库ID |
| IncludeAvailableQuantity | bool | 否 | 纳入可用量 |

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
- `Id`、`TenantId`、`WarehouseId`

## 索引字段
- `Code`

## 关系
- WMS_Warehouses（1:N）：`WMS_Areas.WarehouseId = WMS_Warehouses.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/warehouse/export-area — 库区信息导出
- GET /api/app/warehouse/area-select — 获取库区下拉框数据
- POST /api/app/warehouse/area-list — 获取库区分页数据（支持动态查询）
- POST /api/app/warehouse/area — 创建库区
- PUT /api/app/warehouse/area/{areaId} — 编辑库区
- DELETE /api/app/warehouse/area/{areaId} — 删除库区
- GET /api/app/warehouse/area-by-id/{areaId} — 根据ID获取单条数据
<!-- api:end -->
