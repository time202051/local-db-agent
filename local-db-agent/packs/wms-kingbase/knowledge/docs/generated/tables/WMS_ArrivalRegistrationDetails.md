# WMS_ArrivalRegistrationDetails 到货登记明细

> 由 ABP 源码自动生成
## 用途
到货登记明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| ArrivalRegistrationId | Guid | 否 | 到货登记单ID |
| LineNo | int | 否 | 行号 |
| ProductId | Guid | 否 | 物料Id |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| ExpectedQuantity | decimal | 否 | 预计收货数量 |
| ArrivalQuantity | decimal | 否 | 到货数量 |
| CheckedQuantity | decimal | 否 | 清点数量 |
| AbnormalQuantity | decimal | 否 | 异常数量 |
| AbnormalReason | string? | 是 | 异常原因 |
| AbnormalHandlingReason | string? | 是 | 异常处理原因 |
| AbnormalHandlingNote | string? | 是 | 异常处理说明 |
| AppliedInboundQuantity | decimal | 否 | 已申请入库数量 |
| PurchaseOrderNo | string? | 是 | 采购订单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| AcceptanceFlowNo | string? | 是 | 验收流程申请单号 |
| AcceptanceFlowLineNo | string? | 是 | 验收流程申请单行号 |
| DeliveryShipmentNo | string? | 是 | 交付发运单号 |
| DeliveryShipmentLineNo | string? | 是 | 交付发运单行号 |
| Unit | string | 否 | 单位 |
| SupplierBatchNo | string? | 是 | 供应商批次 |
| WbsElement | string? | 是 | WBS元素 |
| EngineSet | string? | 是 | 台份 |
| EngineSetStage | string? | 是 | 台份阶段 |
| SpecialStock | string | 否 | 特殊库存标识 |
| SerialNo | string? | 是 | 单件码 |
| SapInternalBatchNo | string? | 是 | SAP批次号 |
| DrawingNo | string? | 是 | 图号 |
| AcceptanceNo | string? | 是 | 验收单号 |
| ConfigFlowNo | string? | 是 | 交付发运构型编号 |
| ManufacturingBatchNo | string? | 是 | 制造版次 |
| PackageBoxNo | string? | 是 | 包装箱号 |
| OilSealPeriodDays | int? | 是 | 油封期天数 |
| LastOilSealDate | DateTime? | 是 | 上次油封日期 |
| NextOilSealDate | DateTime? | 是 | 下次油封日期 |
| ExpirationDate | DateTime? | 是 | 失效日期 |
| ProductionDate | DateTime? | 是 | 生产日期 |
| ShelfLifeDays | int? | 是 | 保质期天数 |
| ReinspectionPeriodDays | int? | 是 | 复验期天数 |
| LastReinspectionDate | DateTime? | 是 | 上次复验日期 |
| NextReinspectionDate | DateTime? | 是 | 下次复验日期 |
| ContractNo | string? | 是 | 合同号 |
| ShortText | string? | 是 | WBS短描述 |
| IsConformityInspectionItem | string? | 是 | 是否符合性检查件 |
| DetailStatus | ArrivalRegistrationDetailStatusEnum | 否 | 明细状态 |
| CheckResultStatus | CheckResultEnum? | 是 | 清点结果状态 |
| PurcharseUserName | string | 否 | 采购人员 |
| WarehouseId | Guid? | 是 | 仓库ID |

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
- `Id`、`TenantId`、`ArrivalRegistrationId`、`ProductId`、`WarehouseId`

## 关系
- WMS_ArrivalRegistrations（1:N）：`WMS_ArrivalRegistrationDetails.ArrivalRegistrationId = WMS_ArrivalRegistrations.Id`
- WMS_Products（1:N）：`WMS_ArrivalRegistrationDetails.ProductId = WMS_Products.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/pda-purchase-inbound/arrival-detail-by-product — PDA扫描物料标签二维码查询到货登记明细(PDA清点页扫物料卡后展示明细信息)
- POST /api/dashboard/arrival-track-report-pages — 到货跟踪报表分页查询
<!-- api:end -->
