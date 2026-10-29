# WMS_SrmProductAcceptDetails 产品验收明细表

> 由 ABP 源码自动生成
## 用途
产品验收明细表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| SrmProductAcceptManageId | string | 否 | 主表ID |
| DeliveryProductType | string | 否 | 交付产品类型 |
| ComponentName | string | 否 | 零组件名称 |
| ComponentFigureNumber | string | 否 | 零组件图号 |
| DesignPaperEdition | string | 否 | 设计图纸版次 |
| Amount | decimal? | 是 | 数量 |
| BatchNumber | string | 否 | 批次号 |
| SequenceNumber | string | 否 | 顺序号 |
| Remark | string | 否 | 备注 |
| CheckVerdict | string | 否 | 验收结论 |
| LastUpdateDate | DateTime? | 是 | 最后修改时间 |
| LastUpdatedBy | string | 否 | 最后修改人 |
| CreationDate | DateTime? | 是 | 创建时间 |
| CreatedBy | string | 否 | 创建人 |
| LastUpdateIp | string | 否 | 修改IP |
| Version | decimal? | 是 | 版本 |
| FormNumber | string | 否 | 表单编号 |
| MeetDrawingMaxVersion | string | 否 | 满足的图纸最高版次 |
| TechnologyNoticeNumbers | string | 否 | 技术通知单号 |
| RejectHearNumbers | string | 否 | 不合格品/偏离审理单编号 |
| UnqualifiedNum | decimal? | 是 | 让步/不合格数量 |
| DeviationNum | decimal? | 是 | 偏离数量 |
| ReplaceNum | decimal? | 是 | 代料数量 |
| Matnr | string | 否 | 物料号 |
| Ebeln | string | 否 | 订单号 |
| Ebelp | string | 否 | 行项目 |
| Menge | decimal? | 是 | 验收数量 |
| ProjectModel | string | 否 | SRM字段：PROJECT_MODEL |
| LocationNumber | string | 否 | SRM字段：LOCATION_NUMBER |
| Stagetimes | string | 否 | SRM字段：STAGETIMES |
| Assemblytime | string | 否 | SRM字段：ASSEMBLYTIME |
| GetNumber | string | 否 | SRM字段：GET_NUMBER |
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
- `SrmProductAcceptManageId`

## 关系
- WMS_SrmProductAcceptManages（1:N）：`WMS_SrmProductAcceptDetails.SrmProductAcceptManageId = WMS_SrmProductAcceptManages.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
