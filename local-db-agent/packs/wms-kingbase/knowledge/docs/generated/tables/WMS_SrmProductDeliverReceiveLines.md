# WMS_SrmProductDeliverReceiveLines 产品交付发运接收明细表

> 由 ABP 源码自动生成
## 用途
产品交付发运接收明细表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ProductModel | string | 否 | 产品型号 |
| ProductFigureNo | string | 否 | 交付物图号 |
| ProductVersion | string | 否 | 交付物版次 |
| ProductName | string | 否 | 交付物名称 |
| ProductNum | decimal? | 是 | 交付物数量 |
| BatchNo | string | 否 | 批次/顺序 |
| Remark | string | 否 | 备注 |
| LastUpdateDate | DateTime? | 是 | 最后修改时间 |
| LastUpdatedBy | string | 否 | 最后修改人 |
| CreationDate | DateTime? | 是 | 创建时间 |
| CreatedBy | string | 否 | 创建人 |
| LastUpdateIp | string | 否 | 修改IP |
| Version | string | 否 | 版本 |
| Attribute01 | string | 否 | 不合格品审理单号 |
| Attribute02 | string | 否 | 偏离单号 |
| Attribute03 | string | 否 | 扩展字段 |
| Attribute04 | string | 否 | 扩展字段 |
| Attribute05 | string | 否 | 扩展字段 |
| Attribute06 | string | 否 | 扩展字段 |
| Attribute07 | string | 否 | 扩展字段 |
| Attribute08 | string | 否 | 扩展字段 |
| Attribute09 | string | 否 | 扩展字段 |
| Attribute10 | string | 否 | 扩展字段 |
| SrmProductDeliverReceiveId | string | 否 | 产品交付发运接收表ID |
| DeliveryProductType | string | 否 | 交付产品类型 |
| FormNumber | string | 否 | 表单编号 |
| SequenceNumber | string | 否 | 顺序号 |
| Attribute04End | string | 否 | 油封期结束时间 |
| Attribute05End | string | 否 | 贮存期结束时间 |
| VersionNo | string | 否 | 版次 |
| PackageBoxNo | string | 否 | 包装箱号 |
| CertificatePages | decimal? | 是 | 合格证页数 |
| RejectOrderPages | decimal? | 是 | 不合格品审理单页数 |
| DeviationPages | decimal? | 是 | 偏离单页数 |
| WaitingPages | decimal? | 是 | 待料单页数 |
| QualityProvePages | decimal? | 是 | 质量证明单页数 |
| EntityInfoPages | decimal? | 是 | 实物构型状态信息表页数 |
| OtherFilePages | decimal? | 是 | 其它文件页数 |
| Ebeln | string | 否 | 订单号 |
| Ebelp | string | 否 | 行项目 |
| Matnr | string | 否 | 物料号 |
| Amountnum | decimal? | 是 | 验收数量 |

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
- `Id`、`SrmProductDeliverReceiveId`

## 索引字段
- `SrmProductDeliverReceiveId`、`Attribute10`

## 关系
- WMS_SrmProductDeliverReceives（1:N）：`WMS_SrmProductDeliverReceiveLines.SrmProductDeliverReceiveId = WMS_SrmProductDeliverReceives.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
