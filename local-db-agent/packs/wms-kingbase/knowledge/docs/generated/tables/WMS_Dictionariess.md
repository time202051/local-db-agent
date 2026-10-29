# WMS_Dictionariess 数据字典

> 由 ABP 源码自动生成
## 用途
数据字典

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| Code | string | 否 | 层次代码 |
| ValueOrDisplayName | string | 否 | 字典值/显示名称 |
| ParentId | Guid? | 是 | 父级ID |

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
- `Id`、`TenantId`、`ParentId`

## 索引字段
- `Code`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/public-aggregate/dictionaries
- POST /api/app/public-aggregate/dictionaries — 创建字典数据
- POST /api/app/public-aggregate/dic
- DELETE /api/app/public-aggregate/dictionaries/{dictionariesId} — 删除字典数据
- PUT /api/app/public-aggregate/dictionaries/{DictionariesId} — 编辑数据字典
- GET /api/app/public-aggregate/dci-by-id
- GET /api/app/public-aggregate/dic-by-parent-id
<!-- api:end -->
