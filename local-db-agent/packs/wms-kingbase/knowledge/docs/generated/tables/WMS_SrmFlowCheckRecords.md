# WMS_SrmFlowCheckRecords 审查项目表

> 由 ABP 源码自动生成
## 用途
审查项目表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| CItem | string | 否 | SRM字段：C_ITEM |
| CContent | string | 否 | SRM字段：C_CONTENT |
| CTjresult | string | 否 | SRM字段：C_TJRESULT |
| CClass | string | 否 | SRM字段：C_CLASS |
| SrmFlowId | string | 否 | SRM字段：SRM_FLOW_ID |
| Attribute01 | string | 否 | 扩展字段01 |
| Attribute02 | string | 否 | 扩展字段02 |
| Attribute03 | string | 否 | 扩展字段03 |
| Attribute04 | string | 否 | 扩展字段04 |
| Attribute05 | string | 否 | 扩展字段05 |
| Attribute06 | string | 否 | 扩展字段06 |
| Attribute07 | string | 否 | 扩展字段07 |
| Attribute08 | string | 否 | 扩展字段08 |
| Attribute09 | string | 否 | 扩展字段09 |
| Attribute10 | string | 否 | 扩展字段10 |
| CreatedBy | string | 否 | SRM字段：CREATED_BY |
| CreationDate | DateTime? | 是 | SRM字段：CREATION_DATE |
| LastUpdatedBy | string | 否 | SRM字段：LAST_UPDATED_BY |
| LastUpdateDate | DateTime? | 是 | SRM字段：LAST_UPDATE_DATE |
| LastUpdateIp | string | 否 | SRM字段：LAST_UPDATE_IP |
| Version | decimal? | 是 | SRM字段：VERSION |

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
- `Id`、`SrmFlowId`

## 索引字段
- `SrmFlowId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
