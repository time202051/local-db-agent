# WMS_SrmEntityMessages 构型表

> 由 ABP 源码自动生成
## 用途
构型表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| OrderformCode | string | 否 | SRM字段：ORDERFORM_CODE |
| Ebeln | string | 否 | SRM字段：EBELN |
| ComponentName | string | 否 | SRM字段：COMPONENT_NAME |
| ComponentFigureNumber | string | 否 | SRM字段：COMPONENT_FIGURE_NUMBER |
| CreatedBy | string | 否 | 必备字段 |
| CreationDate | DateTime? | 是 | 必备字段 |
| LastUpdatedBy | string | 否 | 必备字段 |
| LastUpdateDate | DateTime? | 是 | 必备字段 |
| LastUpdateIp | string | 否 | 必备字段 |
| Version | decimal? | 是 | 必备字段 |
| Attribute01 | string | 否 | 扩展字段01 |
| Attribute02 | string | 否 | 扩展字段02 |
| Stagetimes | string | 否 | SRM字段：STAGETIMES |
| SrmProductAcceptManageId | string | 否 | SRM字段：SRM_PRODUCT_ACCEPT_MANAGE_ID |
| DeliveryUnitCode | string | 否 | SRM字段：DELIVERY_UNIT_CODE |
| DeliveryUnitName | string | 否 | SRM字段：DELIVERY_UNIT_NAME |
| Editions | string | 否 | SRM字段：EDITIONS |
| Attribute03 | string | 否 | 编号 |
| Attribute04 | string | 否 | 待用 |
| Attribute05 | string | 否 | 待用 |
| Attribute06 | string | 否 | 待用 |
| Attribute07 | string | 否 | 待用 |
| Attribute08 | string | 否 | 待用 |
| Attribute09 | string | 否 | 待用 |
| Attribute10 | string | 否 | 待用 |

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
- `Id`、`SrmProductAcceptManageId`

## 索引字段
- `Attribute03`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
