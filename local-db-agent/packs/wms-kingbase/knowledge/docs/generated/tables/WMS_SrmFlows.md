# WMS_SrmFlows 专用工装验收与交接主表

> 由 ABP 源码自动生成
## 用途
专用工装验收与交接主表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| LocalId | string | 否 | WMS本地主键 |
| Acceptid | string | 否 | SRM字段：ACCEPTID |
| DvtunitCode | string | 否 | SRM字段：DVTUNIT_CODE |
| DvtunitName | string | 否 | SRM字段：DVTUNIT_NAME |
| DvtsowNumber | string | 否 | SRM字段：DVTSOW_NUMBER |
| DvtsowName | string | 否 | SRM字段：DVTSOW_NAME |
| ContractNumber | string | 否 | SRM字段：CONTRACT_NUMBER |
| Ordernumber | string | 否 | SRM字段：ORDERNUMBER |
| Materialdsp | string | 否 | SRM字段：MATERIALDSP |
| Toolnumber | string | 否 | SRM字段：TOOLNUMBER |
| Pedition | string | 否 | SRM字段：PEDITION |
| Serialnumber | string | 否 | SRM字段：SERIALNUMBER |
| AcceptTime | DateTime? | 是 | SRM字段：ACCEPT_TIME |
| AcceptAdress | string | 否 | SRM字段：ACCEPT_ADRESS |
| Submitdbname | string | 否 | SRM字段：SUBMITDBNAME |
| Submitdbphone | string | 否 | SRM字段：SUBMITDBPHONE |
| Submitjsname | string | 否 | SRM字段：SUBMITJSNAME |
| Submitjsphone | string | 否 | SRM字段：SUBMITJSPHONE |
| Submitjyname | string | 否 | SRM字段：SUBMITJYNAME |
| Submitphone | string | 否 | SRM字段：SUBMITPHONE |
| Submitremark | string | 否 | SRM字段：SUBMITREMARK |
| Acceptmode | string | 否 | SRM字段：ACCEPTMODE |
| Accpetleader | string | 否 | SRM字段：ACCPETLEADER |
| Acceptmode4 | string | 否 | SRM字段：ACCEPTMODE4 |
| Returndb | string | 否 | SRM字段：RETURNDB |
| Acceptmode3 | string | 否 | SRM字段：ACCEPTMODE3 |
| Usedb | string | 否 | SRM字段：USEDB |
| Acceptmode1 | string | 否 | SRM字段：ACCEPTMODE1 |
| Checkdb | string | 否 | SRM字段：CHECKDB |
| Acceptmode5 | string | 否 | SRM字段：ACCEPTMODE5 |
| Calculatedb | string | 否 | SRM字段：CALCULATEDB |
| Acceptmode2 | string | 否 | SRM字段：ACCEPTMODE2 |
| Acptbegindate | string | 否 | SRM字段：ACPTBEGINDATE |
| Ackonwacptaddress | string | 否 | SRM字段：ACKONWACPTADDRESS |
| Receiveunit | string | 否 | SRM字段：RECEIVEUNIT |
| Receiveaddress | string | 否 | SRM字段：RECEIVEADDRESS |
| Accpetleaderdict | string | 否 | SRM字段：ACCPETLEADERDICT |
| Accpetleaderopin | string | 否 | SRM字段：ACCPETLEADEROPIN |
| Flowtime | DateTime? | 是 | SRM字段：FLOWTIME |
| Deliverytime | DateTime? | 是 | SRM字段：DELIVERYTIME |
| Deliverymode | string | 否 | SRM字段：DELIVERYMODE |
| Waynumber | string | 否 | SRM字段：WAYNUMBER |
| Specialexplain | string | 否 | SRM字段：SPECIALEXPLAIN |
| Iftest | string | 否 | SRM字段：IFTEST |
| Iftestcondition | string | 否 | SRM字段：IFTESTCONDITION |
| Testverdict | string | 否 | SRM字段：TESTVERDICT |
| Testproblemdsr | string | 否 | SRM字段：TESTPROBLEMDSR |
| Testdate | DateTime? | 是 | SRM字段：TESTDATE |
| Submitdbname2 | string | 否 | SRM字段：SUBMITDBNAME2 |
| Submitjsname2 | string | 否 | SRM字段：SUBMITJSNAME2 |
| Submitzlname2 | string | 否 | SRM字段：SUBMITZLNAME2 |
| Procureopinion | string | 否 | SRM字段：PROCUREOPINION |
| Procuredbname | string | 否 | SRM字段：PROCUREDBNAME |
| Procuredate | DateTime? | 是 | SRM字段：PROCUREDATE |
| SubmitDate | DateTime? | 是 | SRM字段：SUBMIT_DATE |
| AcceptanceDate | DateTime? | 是 | SRM字段：ACCEPTANCE_DATE |
| SDate | DateTime? | 是 | SRM字段：S_DATE |
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
| WhetherAcceoted | string | 否 | SRM字段：WHETHER_ACCEOTED |
| WhetherSafeDelivery | string | 否 | SRM字段：WHETHER_SAFE_DELIVERY |
| CheckInspectIdea | string | 否 | SRM字段：CHECK_INSPECT_IDEA |

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
- `Id`、`LocalId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
