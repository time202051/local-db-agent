# WMS_CargoLocationContainerTypes

> 由 ABP 源码自动生成
## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| CargoLocationId | Guid | 否 | 库位外键 |
| ContainerTypeId | Guid | 否 | 容器尺寸外键 |

## 继承/审计字段
- `Id`：主键
- `TenantId`：租户 ID（多租户）
- `IsDeleted`：软删除标记，默认查询应排除
- `CreationTime`：创建时间
- `CreatorId`：创建人
- `LastModificationTime`：最后修改时间
- `LastModifierId`：最后修改人
- `DeletionTime`：删除时间
- `DeleterId`：删除人

## 关键字段
- `Id`、`CargoLocationId`、`ContainerTypeId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/warehouse/location-type-select — 获取库位类型下拉框数据
<!-- api:end -->
