# WMS_WcsEquipMentStatistics WCS设备统计

> 由 ABP 源码自动生成
## 用途
WCS设备统计

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| System | int | 否 | 系统 |
| Date | DateTime | 否 | 日期 |
| TaskTotalTime | decimal | 否 | 作业时长(分钟) |
| CarTaskCount | decimal | 否 | 小车任务总数 |
| CarTaskTotalTime | decimal | 否 | 小车作业总时长(分钟) |
| HoisterCount | decimal | 否 | 提升机任务总数 |
| HoisterTaskTotalTime | decimal | 否 | 提升机作业总时长(分钟) |
| AverageContainerReTime | decimal | 否 | 容器平均取出耗时(秒) |
| CarUtilizationRate | decimal | 否 | 小车平均稼动率 |
| HoisterUtilizationRate | decimal | 否 | 提升机平均稼动率 |
| CarUtilizationRateMaxTime | string | 否 | 小车最高稼动率时间 |
| CarUtilizationRateMax | decimal | 否 | 小车最高稼动率 |
| HoisterUtilizationRateMaxTime | string | 否 | 提升机最高稼动率时间 |
| HoisterUtilizationRateMax | decimal | 否 | 提升机最高稼动率 |
| CarUtilizationRateMinTime | string | 否 | 小车最低稼动率时间 |
| CarUtilizationRateMin | decimal | 否 | 小车最低稼动率 |
| HoisterUtilizationRateMinTime | string | 否 | 提升机最低稼动率时间 |
| HoisterUtilizationRateMin | decimal | 否 | 提升机最低稼动率 |
| PerCarUtilizationRate | string | 否 | 每台车稼动率 |

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
