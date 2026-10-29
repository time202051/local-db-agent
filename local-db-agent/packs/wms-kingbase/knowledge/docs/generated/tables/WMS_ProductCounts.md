# WMS_ProductCounts 物料计数

> 由 ABP 源码自动生成
## 用途
物料计数

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| Spec | string | 否 | 规格 |
| Model | string | 否 | 型号 |
| ClassCode | string | 否 | 分类编码 |
| ClassName | string | 否 | 分类名称 |
| Code | string | 否 | 层次代码 |
| ValueOrDisplayName | string | 否 | 字典值/描述 |
| MaxBoxCount | int | 否 | 托最大箱数 |

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
- `Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
