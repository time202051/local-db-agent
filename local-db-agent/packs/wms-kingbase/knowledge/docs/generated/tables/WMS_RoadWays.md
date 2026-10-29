# WMS_RoadWays 巷道

> 由 ABP 源码自动生成
## 用途
巷道

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| Code | string | 否 | 巷道编码 |
| RoadWayName | string | 否 | 通道名称 |
| Enabled | bool | 否 | 可用状态 |
| Remark | string? | 是 | 备注 |
| CreatedUser | string | 否 | 创建人 |
| RegionId | Guid | 否 | 区域ID |
| IsNullPallet | bool | 否 | 是否空托盘通道 |
| IsFree | bool | 否 | 是否空闲通道 |
| ProductId | Guid? | 是 | 物料ID |
| CustomerId | Guid? | 是 | 客户ID |
| Batch | string | 否 | 生产批号 |
| TaskType | WayTaskTypeEnum? | 是 | 任务类型 |
| Priority | int | 否 | 优先级 |
| IsMix | bool | 否 | 是否混放 |
| Tunnel | int? | 是 | 所属巷道 |
| ProductLevel | ProductLevelEnum | 否 | ABC标识 |
| NullPalletUse | bool | 否 | 空托专用 |

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
- `Id`、`TenantId`、`RegionId`、`ProductId`、`CustomerId`

## 索引字段
- `Code`

## 关系
- WMS_Regions（1:N）：`WMS_RoadWays.RegionId = WMS_Regions.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/warehouse/road-way-select — 获取通道/货架下拉框数据
- POST /api/app/warehouse/road-way-list — 获取巷道分页信息（支持动态查询）
- POST /api/app/warehouse/road-way — 创建巷道信息
- PUT /api/app/warehouse/road-way/{roadWayId} — 编辑巷道信息
- DELETE /api/app/warehouse/road-way/{roadWayId} — 删除巷道信息
- POST /api/app/warehouse/export-road-way — 通道信息导出
<!-- api:end -->
