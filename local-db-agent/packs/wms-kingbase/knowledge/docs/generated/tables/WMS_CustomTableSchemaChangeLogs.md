# WMS_CustomTableSchemaChangeLogs 自定义表结构变更日志

> 由 ABP 源码自动生成
## 用途
自定义表结构变更日志

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Action | CustomTableSchemaChangeAction | 否 | 结构变更动作 |
| CustomTableId | Guid? | 是 | 自定义表Id |
| TableName | string? | 是 | 表英文编码 |
| PhysicalTableName | string? | 是 | 物理表名 |
| CustomTableFieldId | Guid? | 是 | 字段Id |
| FieldName | string? | 是 | 字段英文编码 |
| BeforeJson | string? | 是 | 变更前JSON |
| AfterJson | string? | 是 | 变更后JSON |
| ExecuteSql | string? | 是 | 执行SQL |
| IsSuccess | bool | 否 | 是否成功 |
| ErrorMessage | string? | 是 | 错误信息 |

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
- `Id`、`CustomTableId`、`CustomTableFieldId`

## 索引字段
- `CustomTableId`、`CustomTableFieldId`、`Action`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/audit-logging/entity-change-pages — 实体变更分页
<!-- api:end -->
