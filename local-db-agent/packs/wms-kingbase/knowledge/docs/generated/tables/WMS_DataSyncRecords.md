# WMS_DataSyncRecords 数据同步记录

> 由 ABP 源码自动生成
## 用途
数据同步记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| SyncTableName | string | 否 | 同步表名 |
| LastSyncTime | DateTime | 否 | 最后同步时间 |
| FullSyncCursorValue | string | 否 | 全量同步已提交来源身份游标 |
| FullSyncWatermarkTime | DateTime? | 是 | 全量同步锁定水位时间 |
| FullSyncStartedAt | DateTime? | 是 | 全量同步开始时间 |

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
- `SyncTableName`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/database-editor/save-data — 保存数据（支持新增、更新、删除）
- POST /api/app/data-sync/data-sync-record-pages — 数据同步分页查询
- POST /api/app/data-sync/data-sync-record — 创建数据同步
- PUT /api/app/data-sync/{id}/data-sync-record — 更新数据同步
- DELETE /api/app/data-sync/{id}/data-sync-record — 删除数据同步
- POST /api/app/data-sync/sync-wbs — 同步WBS数据
- POST /api/app/data-sync/sync-engine-sn — 同步台份主数据
- POST /api/app/data-sync/sync-sap-mat-doc — 同步物料凭证行项目数据
- POST /api/app/data-sync/sync-organization-unit — 同步中台组织数据。
- POST /api/app/data-sync/sync-employee — 单独同步中台人员数据。
<!-- api:end -->
