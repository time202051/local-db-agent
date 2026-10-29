# WMS_DeliveryShipmentDetails 交付发运单明细

> 由 ABP 源码自动生成
## 用途
交付发运单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| DeliveryShipmentId | Guid | 否 | 交付发运单Id |
| LineNo | int | 否 | 行号 |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string? | 是 | 物料名称 |
| ExpectedQuantity | decimal | 否 | 数量 |
| PurchaseOrderNo | string? | 是 | 采购订单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| AcceptanceFlowNo | string? | 是 | 验收流程申请单号 |
| AcceptanceFlowLineNo | string? | 是 | 验收流程申请单行号 |
| DeliveryShipmentLineNo | string? | 是 | 交付发运单行号 |
| Unit | string? | 是 | 单位 |
| SupplierBatchNo | string? | 是 | 供应商批次 |
| WbsElement | string? | 是 | WBS元素 |
| EngineSet | string? | 是 | 台份 |
| SpecialStock | string? | 是 | 特殊库存 |
| SerialNo | string? | 是 | 单件码/收货批次 |
| DrawingNo | string? | 是 | 图号 |
| EngineSetStage | string? | 是 | 台份阶段 |
| ManufacturingBatchNo | string? | 是 | 制造版次 |
| PackageBoxNo | string? | 是 | 包装箱号 |
| LastOilSealDate | DateTime? | 是 | 上次油封日期 |
| NextOilSealDate | DateTime? | 是 | 下次油封日期 |
| ContractNo | string? | 是 | 合同号 |
| ProductionDate | DateTime? | 是 | 生产日期 |
| ShelfLifeDays | int? | 是 | 保质期 |
| IsConformityInspectionItem | bool | 否 | 是否符合性检查件 |
| ConfigFlowNo | string? | 是 | 交付发运单构型编号 |
| IsDelivery | bool | 否 | 是否发货 |
| Status | DeliveryShipmentDetailStatusEnum | 否 | 明细状态 |

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
- `Id`、`DeliveryShipmentId`

## 关系
- WMS_DeliveryShipments（1:N）：`WMS_DeliveryShipmentDetails.DeliveryShipmentId = WMS_DeliveryShipments.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
