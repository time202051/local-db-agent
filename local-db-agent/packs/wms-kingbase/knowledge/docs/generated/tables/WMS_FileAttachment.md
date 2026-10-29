# WMS_FileAttachment 文件附件

> 由 ABP 源码自动生成
## 用途
文件附件

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| EntityTableName | string | 否 | 实体表名 |
| EntityId | string | 否 | 实体ID |
| AttachmentDirectory | string | 否 | 附件目录 |
| FileExtension | string | 否 | 文件后缀 |
| FileUrl | string | 否 | 文件URL |
| FileName | string | 否 | 原始文件名 |
| FileSize | long | 否 | 文件大小 |
| ContentType | string | 否 | ContentType |
| TenantId | Guid? | 是 | 租户ID |

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
- `Id`、`EntityId`、`TenantId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/file-attachment/upload — 上传文件（字节流方式）
- POST /api/app/file-attachment/upload-file/{entityId} — 直接上传文件（前端FormData方式）
- POST /api/app/file-attachment/batch-upload-files/{entityId} — 批量上传文件（前端FormData方式）
- POST /api/app/file-attachment/upload-file-for-pdf — 上传PrintPdf文件（字节流方式），同一EntityId只保留一条记录，先删后增
- GET /api/app/file-attachment/{id} — 根据Id获取附件详情
- PUT /api/app/file-attachment/{id} — 更新附件信息（可修改实体表名、实体Id等）
- DELETE /api/app/file-attachment/{id} — 删除附件（同时删除物理文件）
- POST /api/app/file-attachment/entity-pages — 根据实体表名和实体Id查询附件列表（分页）
- GET /api/app/file-attachment/by-entity/{entityId} — 根据实体表名和实体Id查询所有附件（不分页）
- POST /api/app/file-attachment/batch-delete — 批量删除附件
- POST /api/app/file-attachment/{id}/download — 下载文件
<!-- api:end -->
