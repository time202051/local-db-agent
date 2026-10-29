# WMS_SrmProductAcceptManages 产品验收管理表

> 由 ABP 源码自动生成
## 用途
产品验收管理表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Requisition | string | 否 | 申请单 |
| DeliveryUnitCode | string | 否 | 交付单位编码 |
| DeliveryUnitName | string | 否 | 交付单位名称 |
| AcceptUnit | string | 否 | 验收单位 |
| ApplyAcceptTime | DateTime? | 是 | 申请验收时间 |
| ApplyAcceptSite | string | 否 | 申请验收地点 |
| OrderformCode | string | 否 | 合同号/订单号 |
| PurchaserBehalf | string | 否 | 采购方业务代表 |
| PurchaserBehalfPhone | string | 否 | 采购方业务代表电话 |
| Remark | string | 否 | 备注 |
| LastUpdateDate | DateTime? | 是 | 最后修改时间 |
| LastUpdatedBy | string | 否 | 最后修改人 |
| CreationDate | DateTime? | 是 | 创建时间 |
| CreatedBy | string | 否 | 创建人 |
| LastUpdateIp | string | 否 | 修改IP |
| Version | decimal? | 是 | 版本 |
| PurchaserSalesmanMailbox | string | 否 | 提交方业务代表邮箱 |
| PurchaserSalesmanFax | string | 否 | 提交方业务代表传真 |
| CheckGroupLeader | string | 否 | 验收组长 |
| CheckTechnicalDelegate | string | 否 | 验收技术代表 |
| CheckQualityDelegate | string | 否 | 验收质量代表 |
| AffirmCheckDate | DateTime? | 是 | 确认验收时间 |
| AffirmCheckSite | string | 否 | 确认验收地点 |
| AffirmCheckOpinion | string | 否 | 确认验收意见 |
| ProjectManager | string | 否 | 项目经理 |
| AffirmDate | DateTime? | 是 | 确认日期 |
| TechnologyCheckSituation | string | 否 | 技术检查工作情况 |
| TechnologyOpinion | string | 否 | 验收技术代表最终意见 |
| TechnologyDate | DateTime? | 是 | 技术代表验收日期 |
| QualityCheckSituation | string | 否 | 质量检查工作情况 |
| QualityOpinion | string | 否 | 验收质量代表最终意见 |
| QualityDate | DateTime? | 是 | 质量代表验收日期 |
| GroupLeaderOpinion | string | 否 | 验收组长意见 |
| GroupLeaderDate | DateTime? | 是 | 验收组长日期 |
| OpinionOption | string | 否 | 验收组长意见分组 |
| DoubleCheckFlag | string | 否 | 是否已与选定的验收组员进行了有效沟通 |
| GroupMembersIds | string | 否 | 团组成员 |
| AcceptCheckBillNo | string | 否 | 验收检查单编号 |
| NotifyProjectAmaldarIds | string | 否 | 知悉项目经理ids |
| NotifyProjectManagerIds | string | 否 | 知悉项目主管ids |
| AcceptanceMethod | string | 否 | 验收方式 |
| SubmitProjectBehalf | string | 否 | 提交方项目代表 |
| SubmitProjectBehalfPhone | string | 否 | 提交方项目代表联系方式 |
| ReciveInfo | string | 否 | 收货信息 |
| ProjectCode | string | 否 | 项目代号 |
| Profession | string | 否 | 所属专业 |
| ReceiveUnitId | string | 否 | 接收单位id |
| ConsigneeMan | string | 否 | 收货单位联系人 |
| ConsigneePhone | string | 否 | 收货单位联系方式 |
| ReceiveAddress | string | 否 | 收货地址 |
| TakeFileRequire | string | 否 | 随带文件要求 |
| MatingCode | string | 否 | 配套台份 |
| PhysicalProductInsTechNo | string | 否 | 实物类产品验收检查单（技术） |
| PhysicalProductInsQualNo | string | 否 | 实物类产品验收检查单（质量） |
| Whether | string | 否 | SRM字段：WHETHER |
| WhetherAcceoted | string | 否 | SRM字段：WHETHER_ACCEOTED |
| PurchasingRepresentative | string | 否 | SRM字段：PURCHASING_REPRESENTATIVE |
| WhetherSafeDelivery | string | 否 | SRM字段：WHETHER_SAFE_DELIVERY |
| PurchasingRepresentativeId | string | 否 | SRM字段：PURCHASING_REPRESENTATIVE_ID |
| PurchaseDate | DateTime? | 是 | SRM字段：PURCHASE_DATE |
| Receiveunitstate | string | 否 | SRM字段：RECEIVEUNITSTATE |
| Receiveunitname | string | 否 | SRM字段：RECEIVEUNITNAME |
| ContractDevDate | DateTime? | 是 | 合同约定交付日期 |
| Attribute01 | string | 否 | 扩展字段01 |
| Attribute02 | string | 否 | 补充说明 |
| Attribute03 | string | 否 | 待使用 |
| Attribute04 | string | 否 | 待使用 |
| FlowVersion | string | 否 | SRM字段：FLOW_VERSION |
| ApplyAcceptType | string | 否 | 申请验收类型 |
| PurchaserQualityLeader | string | 否 | 供应商备案质量领导 |
| PurchaserQualityLeaderPhone | string | 否 | 供应商备案质量领导电话 |

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
- `Id`、`ReceiveUnitId`、`PurchasingRepresentativeId`

## 索引字段
- `Requisition`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
