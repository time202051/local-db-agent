# WMS_Points 出入库点位

> 由 ABP 源码自动生成
## 用途
出入库点位

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| PointCode | string | 否 | 点位编码 |
| PointName | string? | 是 | 点位名称 |
| PointType | PointTypeEnum | 否 | 点位性质 |
| Enabled | bool | 否 | 启用状态 |
| RegionId | Guid? | 是 | 区域ID |
| EequipmentPoint | string | 否 | 设备点位 |
| GroupPointCode | string | 否 | 组点位编码 |
| GroupPointId | Guid? | 是 | 组点位ID |
| Remark | string | 否 | 备注 |
| CreatedUser | string | 否 | 创建人 |
| AreaId | Guid? | 是 | 库区ID |

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
- `Id`、`TenantId`、`RegionId`、`GroupPointId`、`AreaId`

## 索引字段
- `PointCode`

## 关系
- WMS_Areas（1:N）：`WMS_Points.AreaId = WMS_Areas.Id`
- WMS_Regions（1:N）：`WMS_Points.RegionId = WMS_Regions.Id`
- WMS_Points（1:N）：`WMS_Points.GroupPointId = WMS_Points.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/warehouse/point — 创建出入库点位
- POST /api/app/warehouse/export-point — 出入库点位信息导出
- POST /api/app/warehouse/point-list — 获取出入库点位分页数据信息（支持动态查询）
- GET /api/app/warehouse/point-select — 获取出入库点位下拉框数据
- GET /api/app/warehouse/point-type-select — 获取点位类型下拉框数据
- GET /api/app/warehouse/point-by-id/{pointId} — 根据ID获取单条数据
<!-- api:end -->
