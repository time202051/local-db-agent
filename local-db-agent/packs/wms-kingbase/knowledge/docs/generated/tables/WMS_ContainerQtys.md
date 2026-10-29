# WMS_ContainerQtys

> 由 ABP 源码自动生成
## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ContainerId | Guid | 否 |  |
| MarkQty | int | 否 |  |

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
- `Id`、`ContainerId`

## 索引字段
- `ContainerId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
