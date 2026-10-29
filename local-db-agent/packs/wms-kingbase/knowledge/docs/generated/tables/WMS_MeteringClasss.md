# WMS_MeteringClasss 计量类别

> 由 ABP 源码自动生成
## 用途
计量类别

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| ClassCode | string | 否 | 计量类别编码 |
| ClassDesc | string | 否 | 计量类别描述 |
| ClassLevel | int? | 是 | 分类等级 |
| ParentClass | string? | 是 | 上级分类编码 |
| ClassName | string | 否 | 分类名称 |
| CreatedUser | string | 否 | 创建人 |

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
- `ClassCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
