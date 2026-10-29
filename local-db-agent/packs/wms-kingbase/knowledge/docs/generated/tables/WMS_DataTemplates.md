# WMS_DataTemplates 数据模板

> 由 ABP 源码自动生成
## 用途
数据模板

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Code | string | 否 | 编码 |
| DisplayName | string | 否 | 模板名称 |
| IsSystem | bool | 否 | 系统模板 |
| FileName | string? | 是 | 文件名 |
| FileSize | long? | 是 | 文件大小 |
| FileBody | byte[] | 否 | 文件内容 |
| Remark | string? | 是 | 备注 |

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

## 索引字段
- `Code`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/collect-piece-plan/download-collect-piece-plan-import-template — 下载集件计划单导入模板
- GET /api/app/public-aggregate/data-template-pages — 获取数据模板分页数据信息
- POST /api/app/public-aggregate/data-template — 创建数据模板数据
- POST /api/app/public-aggregate/upload-data-template — 上传数据模板
- GET /api/app/public-aggregate/down-data-template/{dataTemplateId} — 下载模板
- PUT /api/app/public-aggregate/data-template/{dataTemplateId} — 编辑数据模板
- DELETE /api/app/public-aggregate/data-template/{dataTemplateId} — 删除数据模板
<!-- api:end -->
