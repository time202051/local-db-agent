# WMS_Warehouses 仓库

> 由 ABP 源码自动生成
## 用途
仓库

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| WarehouseCode | string | 否 | 仓库编码 |
| WarehouseName | string | 否 | 仓库名称 |
| Enabled | bool | 否 | 是否可用 |
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
- `Id`、`TenantId`

## 索引字段
- `WarehouseCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/stock-in/warehouse-select — 获取归属仓库下拉
- GET /api/app/warehouse/row-way-by-id/{roadWayId} — 根据ID获取单条数据通道信息
- GET /api/app/warehouse/usage-status-select — 使用状态下拉
- GET /api/app/warehouse/load-status-select — 获取承载状态下拉框数据
- GET /api/app/warehouse/out-location-select — 获取出库口下拉
- POST /api/app/warehouse/warehouse — 创建仓库
- POST /api/app/warehouse/export-warehouse — 仓库信息导出
- DELETE /api/app/warehouse/warehouse/{warehouseId} — 删除仓库信息
- PUT /api/app/warehouse/warehouse/{warehouseId} — 编辑仓库信息
- POST /api/app/warehouse/warehouse-list — 获取仓库分页数据信息（支持动态查询）
- GET /api/app/warehouse/warehouse-select — 获取仓库下拉框数据
- GET /api/app/warehouse/warehouse-by-id/{warehouseId} — 根据ID获取单条数据
- GET /api/app/warehouse/org-select — 获取公司下拉框数据
- GET /api/app/warehouse/engine-sn-select — 台份下拉
- GET /api/app/warehouse/warehouse-reports — 库位统计报表
- GET /api/app/warehouse/location-data — 获得库位数据
- PUT /api/app/warehouse/logo — 编辑logo
- GET /api/app/warehouse/directy — 测试接口
- GET /api/app/warehouse/system-data — 获取系统菜单
- GET /api/app/warehouse/sap-storeage-location-by-area-id/{areaId} — 获取库区关联的库存地点列表（用于编辑时回显）
<!-- api:end -->
