# WMS_HomeDocuments 首页文档表

> 由 ABP 源码自动生成
## 用途
首页文档表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| CategoryName | string | 否 | 文档名称 |

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

<!-- api:start -->
## 相关接口
- POST /api/app/home-document/home-document-pages — 文档分页查询
- GET /api/app/home-document/{id} — 获取文档详情
- PUT /api/app/home-document/{id} — 更新文档
- DELETE /api/app/home-document/{id} — 删除文档
- POST /api/app/home-document — 创建文档
<!-- api:end -->
