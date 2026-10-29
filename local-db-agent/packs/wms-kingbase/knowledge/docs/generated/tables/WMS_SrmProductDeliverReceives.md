# WMS_SrmProductDeliverReceives 产品交付发运接收主表

> 由 ABP 源码自动生成
## 用途
产品交付发运接收主表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TransferSerialNum | string | 否 | 交接流水号 |
| TransferStatus | string | 否 | 发运状态 |
| InvolvedContractId | string | 否 | 涉及合同ID |
| InvolvedContractCode | string | 否 | 涉及合同编号 |
| DeliveryUnitId | string | 否 | 交付单位id |
| ReceiveUnitId | string | 否 | 接收单位id |
| Contacts | string | 否 | 联系人 |
| DeliveryDate | DateTime? | 是 | 发运时间 |
| ReceiveDate | DateTime? | 是 | 接收时间 |
| Remark | string | 否 | 备注 |
| LastUpdateDate | DateTime? | 是 | 最后修改时间 |
| LastUpdatedBy | string | 否 | 最后修改人 |
| CreationDate | DateTime? | 是 | 创建时间 |
| CreatedBy | string | 否 | 创建人 |
| LastUpdateIp | string | 否 | 修改IP |
| Version | decimal? | 是 | 版本 |
| Attribute01 | string | 否 | 产品型号 |
| Attribute02 | string | 否 | 发货单位联系人 |
| Attribute03 | string | 否 | 发货单位联系方式 |
| Attribute04 | string | 否 | 收货单位联系人 |
| Attribute05 | string | 否 | 收货单位联系方式 |
| Attribute06 | string | 否 | 收货地址 |
| Attribute07 | string | 否 | 货运信息 |
| Attribute08 | string | 否 | 扩展字段 |
| Attribute09 | string | 否 | 扩展字段 |
| Attribute10 | string | 否 | 扩展字段 |
| ProductUse | string | 否 | 产品使用用途 |
| AcceptanceNoIds | string | 否 | 验收编号Id串 |
| ConnectSite | string | 否 | 交接地点 |
| DeliveryItemBehalf | string | 否 | 交付单位项目代表 |
| DeliveryTechnologyBehalf | string | 否 | 交付单位技术代表 |
| DeliveryQualityBehalf | string | 否 | 交付单位质量代表 |
| ConsignmentDate | DateTime? | 是 | 交运日期 |
| ReceiveItemBehalf | string | 否 | 接收单位项目代表 |
| ReceiveTechnologyBehalf | string | 否 | 接收单位技术代表 |
| ReceiveQualityBehalf | string | 否 | 接收单位质量代表 |
| ReceptionDate | DateTime? | 是 | 接收日期 |
| AppearanceExamineCase | string | 否 | 产品外观检查情况 |
| ConnectNumbers | string | 否 | 交接单号 |
| TrackingNumber | string | 否 | 运单号 |
| PackageBoxNumber | decimal? | 是 | 包装箱数量 |
| AcceptanceUnit | string | 否 | SRM字段：ACCEPTANCE_UNIT |
| ProductStatus | string | 否 | SRM字段：PRODUCT_STATUS |
| ProductRemark | string | 否 | SRM字段：PRODUCT_REMARK |
| Dksj | string | 否 | 打开时间 |
| Jssj | string | 否 | 结束时间 |
| Gdr | string | 否 | 归档人 |

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
- `Id`、`InvolvedContractId`、`DeliveryUnitId`、`ReceiveUnitId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
