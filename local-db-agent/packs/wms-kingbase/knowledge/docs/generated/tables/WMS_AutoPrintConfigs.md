# WMS_AutoPrintConfigs 自动打印配置

> 由 ABP 源码自动生成
## 用途
自动打印配置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| PrintPcIp | string | 否 | 打印电脑IP |
| PrintDeviceName | string | 否 | 打印设备名称 |
| TableName | string | 否 | 表名称 |
| PrintTime | DateTime? | 是 | 打印日期 |
| PrintHMS | TimeSpan | 否 | 打印时间 |
| AutoPrintConfigPeriod | AutoPrintConfigPeriodEnum | 否 | 打印周期 |
| DataAdv | int | 否 | 提前天数 |
| Enabled | bool | 否 | 启用 |
| FirstPrintTime | DateTime? | 是 | 第一次打印时间 |
| Reserve | DateTime | 否 | 预留字段 |
| Reserve1 | DateTime | 否 | 预留字段1 |
| Reserve2 | string | 否 | 预留字段2 |
| Reserve3 | string | 否 | 预留字段3 |
| Reserve4 | int | 否 | 预留字段4 |
| Reserve5 | int | 否 | 预留字段5 |

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

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
