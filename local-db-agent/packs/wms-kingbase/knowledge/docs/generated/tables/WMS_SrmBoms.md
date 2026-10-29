# WMS_SrmBoms SRM BOM表

> 由 ABP 源码自动生成
## 用途
SRM BOM表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Uuid | string | 否 | SRM字段：UUID |
| ParentItemRevUid | string | 否 | SRM字段：PARENT_ITEM_REV_UID |
| ItemRevUid | string | 否 | SRM字段：ITEM_REV_UID |
| ParentItemRevName | string | 否 | SRM字段：PARENT_ITEM_REV_NAME |
| ItemRevName | string | 否 | SRM字段：ITEM_REV_NAME |
| ParentItemRevId | string | 否 | SRM字段：PARENT_ITEM_REV_ID |
| ItemRevId | string | 否 | SRM字段：ITEM_REV_ID |
| ParentItemRevisionId | string | 否 | SRM字段：PARENT_ITEM_REVISION_ID |
| ItemRevisionId | string | 否 | SRM字段：ITEM_REVISION_ID |
| DrawingNo | string | 否 | SRM字段：DRAWING_NO |
| BomlineNo | string | 否 | SRM字段：BOMLINE_NO |
| IsPrecise | string | 否 | SRM字段：IS_PRECISE |
| ViewType | string | 否 | SRM字段：VIEW_TYPE |
| BlSequenceNo | string | 否 | SRM字段：BL_SEQUENCE_NO |
| Title | string | 否 | SRM字段：TITLE |
| RootItemRevisionId | string | 否 | SRM字段：ROOT_ITEM_REVISION_ID |
| CreatedBy | string | 否 | SRM字段：CREATED_BY |
| CreationDate | DateTime? | 是 | SRM字段：CREATION_DATE |
| LastUpdatedBy | string | 否 | SRM字段：LAST_UPDATED_BY |
| LastUpdateDate | DateTime? | 是 | SRM字段：LAST_UPDATE_DATE |
| LastUpdateIp | string | 否 | SRM字段：LAST_UPDATE_IP |
| Version | decimal? | 是 | SRM字段：VERSION |
| Amount | string | 否 | SRM字段：AMOUNT |
| BatchNumber | string | 否 | SRM字段：BATCH_NUMBER |
| SequenceNumber | string | 否 | SRM字段：SEQUENCE_NUMBER |
| TechnologyNoticeNumbers | string | 否 | SRM字段：TECHNOLOGY_NOTICE_NUMBERS |
| RejectHearNumbers | string | 否 | SRM字段：REJECT_HEAR_NUMBERS |
| UnqualifiedNumber | string | 否 | SRM字段：UNQUALIFIED_NUMBER |
| ReplaceNumber | string | 否 | SRM字段：REPLACE_NUMBER |
| Remark | string | 否 | 备注 |
| WhetherBatchProduction | string | 否 | SRM字段：WHETHER_BATCH_PRODUCTION |
| SrmProductAcceptManageId | string | 否 | 构型表或构型修改表ID |
| Attribute01 | string | 否 | 扩展字段01 |
| Attribute02 | string | 否 | 扩展字段02 |
| Attribute03 | string | 否 | 扩展字段03 |
| Attribute04 | string | 否 | 扩展字段04 |
| Attribute05 | string | 否 | 扩展字段05 |
| Attribute06 | string | 否 | 扩展字段06 |
| Attribute07 | string | 否 | 扩展字段07 |
| Attribute08 | string | 否 | 扩展字段08 |
| Attribute09 | string | 否 | 扩展字段09 |
| Attribute10 | string | 否 | 设计版次 |
| ProjectModel | string | 否 | SRM字段：PROJECT_MODEL |
| LocationNumber | string | 否 | SRM字段：LOCATION_NUMBER |
| Assemblytime | string | 否 | SRM字段：ASSEMBLYTIME |
| Attribute11 | string | 否 | 差异说明 |
| Attribute12 | string | 否 | 扩展字段12 |
| Attribute13 | string | 否 | 扩展字段13 |
| Attribute14 | string | 否 | 扩展字段14 |
| Attribute15 | string | 否 | 扩展字段15 |
| Attribute16 | string | 否 | 扩展字段16 |
| Attribute17 | string | 否 | 扩展字段17 |
| Attribute18 | string | 否 | 扩展字段18 |
| Attribute19 | string | 否 | 扩展字段19 |
| Attribute20 | string | 否 | 扩展字段20 |
| Attribute21 | string | 否 | 扩展字段21 |
| Attribute22 | string | 否 | 扩展字段22 |
| Attribute23 | string | 否 | 扩展字段23 |
| Attribute24 | string | 否 | 扩展字段24 |
| Attribute25 | string | 否 | 扩展字段25 |
| Attribute26 | string | 否 | 扩展字段26 |
| Attribute27 | string | 否 | 扩展字段27 |
| Attribute28 | string | 否 | 扩展字段28 |
| Attribute29 | string | 否 | 扩展字段29 |
| Attribute30 | string | 否 | 扩展字段30 |

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
- `Id`、`ParentItemRevId`、`ItemRevId`、`ParentItemRevisionId`、`ItemRevisionId`、`RootItemRevisionId`、`SrmProductAcceptManageId`

## 索引字段
- `SrmProductAcceptManageId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
