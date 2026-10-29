# WMS_BusinessTaskTypeConfig 任务类型配置

> 由 ABP 源码自动生成
## 用途
任务类型配置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TypeCode | int | 否 | 任务类型编码 |
| TypeName | string | 否 | 任务类型名称 |
| TaskNatureEnum | TaskNatureEnum | 否 | 出入库性质 |
| DefaultWcsPriority | int | 否 | 默认WCS优先级 |
| DefaultAgvPriority | int | 否 | 默认AGV优先级 |

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
