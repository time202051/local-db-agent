# WMS_InboundApplicationDetails 入库申请单明细

> 由 ABP 源码自动生成
## 用途
入库申请单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| InboundApplicationId | Guid | 否 | 入库申请单ID |
| ArrivalRegistrationId | Guid? | 是 | 到货登记单ID |
| ArrivalRegistrationDetailId | Guid? | 是 | 到货登记明细ID |
| SupplierId | Guid? | 是 | 供应商ID |
| ArrivalRegistrationBillNo | string | 否 | 到货登记单号 |
| LineNo | int | 否 | 行号 |
| ProductId | Guid | 否 | 物料Id |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| InboundApplicationQuantity | decimal | 否 | 入库申请数量 |
| PurchaseOrderNo | string? | 是 | 采购订单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| AcceptanceFlowNo | string? | 是 | 验收流程单号 |
| AcceptanceFlowLineNo | string? | 是 | 验收流程单行号 |
| DeliveryShipmentNo | string? | 是 | 交付发运单号 |
| DeliveryShipmentLineNo | string? | 是 | 交付发运单行号 |
| Unit | string | 否 | 单位 |
| SupplierBatchNo | string | 否 | 供应商批号 |
| StorageLocationId | Guid? | 是 | 库存地点ID |
| StorageLocationCode | string? | 是 | 库存地点编码 |
| WbsElement | string? | 是 | WBS元素 |
| SapWbsId | Guid? | 是 | WBS |
| EngineSet | string? | 是 | 台份 |
| EngineSetStage | string? | 是 | 台份阶段 |
| SpecialStock | string | 否 | 特殊库存标识 |
| InventoryType | string? | 是 | 库存类型 |
| SerialNo | string? | 是 | 单件码 |
| SapInternalBatchNo | string? | 是 | SAP批次号 |
| LineMblnr | string? | 是 | 凭证号 |
| Zeile | string? | 是 | 凭证行号 |
| ReferenceZelie | string? | 是 | 质检参考凭证行号 |
| Prueflos | string? | 是 | 检验批号 |
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
| ShortText | string? | 是 | PS短描述 |
| ProjectDefinition | string? | 是 | 项目定义 |
| IsConformityInspectionItem | string? | 是 | 是否符合性检查件 |
| DetailStatus | InboundApplicationDetailStatusEnum | 否 | 明细状态 |
| SapStatus | SapStatusEnum | 否 | SAP过账状态 |
| SapReceipt | string? | 是 | SAP回执信息 |
| SapQsInfo | string | 否 | SAP质检信息 |
| SapTableInfo | string | 否 | SAP批次信息 |
| SapPurchaseOrderId | Guid? | 是 | 采购订单外键 |

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
- `Id`、`TenantId`、`InboundApplicationId`、`ArrivalRegistrationId`、`ArrivalRegistrationDetailId`、`SupplierId`、`ProductId`、`StorageLocationId`、`SapWbsId`、`SapPurchaseOrderId`

## 关系
- WMS_InboundApplications（1:N）：`WMS_InboundApplicationDetails.InboundApplicationId = WMS_InboundApplications.Id`
- WMS_ArrivalRegistrationDetails（1:N）：`WMS_InboundApplicationDetails.ArrivalRegistrationDetailId = WMS_ArrivalRegistrationDetails.Id`
- WMS_Products（1:N）：`WMS_InboundApplicationDetails.ProductId = WMS_Products.Id`
- WMS_Suppliers（1:N）：`WMS_InboundApplicationDetails.SupplierId = WMS_Suppliers.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
