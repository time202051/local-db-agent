# WMS_BackgroundWorkerConfigs 后台工作配置

> 由 ABP 源码自动生成
## 用途
后台工作配置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| JobCode | string | 否 | 任务编码 |
| JobName | string | 否 | 任务名称 |
| Enabled | bool | 否 | 启用 |
| IsAuditLog | bool | 否 | 是否记录日志 |
| LastRunDate | DateTime? | 是 | 最后运行时间 |
| PeriodMinutes | int? | 是 | 执行周期(分钟) |

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
- `JobCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/config/background-worker-config-pages — 获取后台工作配置分页信息
- PUT /api/app/config/{id}/background-worker-config — 修改后台工作任务配置
- POST /api/app/config/export-background-worker-config — 后台工作配置信息导出
- POST /api/app/config/return-base-info — 返回数据库备份基础数据
- POST /api/app/config/data-base-back — 数据库备份
- GET /api/app/config/common-select — 获取通用枚举下拉(带分页)
- POST /api/app/test-back/long-hai-lan/{userFieldConfigurationId} — 龙海兰
<!-- api:end -->
