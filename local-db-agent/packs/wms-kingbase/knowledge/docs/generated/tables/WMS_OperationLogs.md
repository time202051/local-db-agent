# WMS_OperationLogs 操作日志

> 由 ABP 源码自动生成
## 用途
操作日志

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| OperatorUser | string | 否 | 操作人 |
| Keywords | string | 否 | 关键词 |
| RequestIp | string | 否 | 操作IP地址 |
| OperatorName | string | 否 | 操作名称 |
| OperatorTime | DateTime | 否 | 操作时间 |
| OperationMessage | string | 否 | 操作结果 |

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
- POST /api/app/audit-logging/operation-pages — 操作日志分页
- POST /api/app/audit-logging/export-operation-log — 操作日志导出
<!-- api:end -->
