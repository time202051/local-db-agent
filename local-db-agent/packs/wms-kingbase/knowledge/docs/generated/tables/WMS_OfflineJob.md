# WMS_OfflineJob 离线作业

> 由 ABP 源码自动生成
## 用途
离线作业

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Route | string | 否 | 接口路由 |
| JsonParams | string | 否 | 方法入参 |
| Status | OfflineJobStatus | 否 | 执行状态 |
| ErrorMessage | string | 否 | 错误信息 |
| SortOrder | int | 否 | 执行顺序 |
| DeviceId | string | 否 | 设备标识 |
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
- `Id`、`DeviceId`、`TenantId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/offline-job — 分页查询离线作业列表（返回Custom字段配置）
- POST /api/app/offline-job — 创建离线作业
- GET /api/app/offline-job/{id} — 根据Id获取离线作业详情
- PUT /api/app/offline-job/{id} — 更新离线作业
- DELETE /api/app/offline-job/{id} — 删除离线作业
- POST /api/app/offline-job/batch-create — 批量创建离线作业
- POST /api/app/offline-job/batch-delete — 批量删除离线作业
- POST /api/app/offline-job/export — 导出离线作业（列自定义动态导出Excel）
<!-- api:end -->
