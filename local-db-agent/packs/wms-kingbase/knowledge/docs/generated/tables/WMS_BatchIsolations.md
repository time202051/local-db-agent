# WMS_BatchIsolations

> 由 ABP 源码自动生成
## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Werks | string | 否 | 工厂 |
| DrawingNo | string | 否 | 图号 |
| SupplierBatch | string | 否 | 供应商批次 |
| IsolationFlag | bool | 否 | 隔离标识 |
| IsolationReason | string | 否 | 隔离原因 |
| Remark | string | 否 | 备注 |
| DeleteFlag | bool | 否 | 删除标识 |

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
- POST /api/app/batch-isolation/batch-isolation-pages — 批次隔离分页查询
- POST /api/app/batch-isolation/export-batch-isolation — 批次隔离导出
- POST /api/app/batch-isolation/batch-isolation — 创建批次隔离
- DELETE /api/app/batch-isolation/batch-isolation/{batchIsolationId} — 删除批次隔离
- PUT /api/app/batch-isolation/batch-isolation/{batchIsolationId} — 更新批次隔离
- POST /api/app/batch-isolation/download-batch-isolation-template — 下载批次隔离导入模板
- POST /api/app/batch-isolation/import-batch-isolation — 导入批次隔离（按工厂+图号+供应商批次匹配，存在则更新，不存在则新增）
<!-- api:end -->
