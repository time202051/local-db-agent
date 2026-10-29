# WMS_Containers 容器

> 由 ABP 源码自动生成
## 用途
容器

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| UsageStatus | UsageStatusEnum | 否 | 使用状态 |
| LoadStatus | LoadStatusEnum | 否 | 承载状态 |
| Enabled | bool | 否 | 是否可用 |
| CreatedUser | string | 否 | 创建人 |
| FinishQty | int | 否 | 完成数量 |
| ContainerUsageRate | ContainerUsageRateEnum | 否 | 容器使用率 |

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
- `Code`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/container-location-change-record/list — 获取容器库位变动记录分页数据（支持动态查询）
- GET /api/app/stock-in/bind-container-info — 获取物料详情
- POST /api/app/warehouse/export-container — 容器信息导出
- GET /api/app/warehouse/container-shape-type-select — 获取容器属性 枚举下拉框数据
- POST /api/app/warehouse/container-sort-list — 获取容器分页信息数据-排序（支持动态查询）
- POST /api/app/warehouse/container-list — 获取容器分页信息数据（支持动态查询）
- POST /api/app/warehouse/container — 创建容器信息
- PUT /api/app/warehouse/container/{containerId} — 编辑容器信息
- DELETE /api/app/warehouse/container/{containerId} — 删除容器信息
- GET /api/app/warehouse/container-by-id/{containerId} — 根据ID获取单条数据
- GET /api/app/warehouse/container-info — 获取空容器展示信息
- POST /api/app/warehouse/get-container-image-base64String — 获取图片的Base64字符串
<!-- api:end -->
