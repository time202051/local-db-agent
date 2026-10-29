# WMS_SrmParts 零件清单表

> 由 ABP 源码自动生成
## 用途
零件清单表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| PartId | string | 否 | SRM字段：PART_ID |
| PartNumber | string | 否 | SRM字段：PART_NUMBER |
| PartName | string | 否 | SRM字段：PART_NAME |
| PartCount | string | 否 | SRM字段：PART_COUNT |
| Version | decimal? | 是 | SRM字段：VERSION |
| LastUpdateIp | string | 否 | SRM字段：LAST_UPDATE_IP |
| LastUpdateDate | DateTime? | 是 | SRM字段：LAST_UPDATE_DATE |
| LastUpdatedBy | string | 否 | SRM字段：LAST_UPDATED_BY |
| CreationDate | DateTime? | 是 | SRM字段：CREATION_DATE |
| CreatedBy | string | 否 | SRM字段：CREATED_BY |
| SrmFlowId | string | 否 | SRM字段：SRM_FLOW_ID |

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
- `Id`、`PartId`、`SrmFlowId`

## 索引字段
- `SrmFlowId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
