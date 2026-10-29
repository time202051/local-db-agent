# WMS_RecordWorkStations 记录工位

> 由 ABP 源码自动生成
## 用途
记录工位

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| StationNames | string | 否 | 工位名称 |
| Reserve | string? | 是 | 预留字段 |
| Reserve1 | string? | 是 | 预留字段1 |
| Reserve2 | string? | 是 | 预留字段2 |

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
