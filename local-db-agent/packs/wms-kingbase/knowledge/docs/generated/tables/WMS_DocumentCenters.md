# WMS_DocumentCenters 文档中心

> 由 ABP 源码自动生成
## 用途
文档中心

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| DisplayName | string | 否 | 文档名称 |
| DocumentPath | string | 否 | 文档路径 |
| DocumentName | string | 否 | 文件名 |
| ParentCode | string? | 是 | 上级分类编码 |
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

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/document-center/document-center — 创建文档
- DELETE /api/app/document-center/document/{ProductClassId} — 删除文档
<!-- api:end -->
