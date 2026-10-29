# WMS_InspectionInboundDetails 检验入库单明细

> 由 ABP 源码自动生成
## 用途
检验入库单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| InspectionInboundId | Guid? | 是 | 检验入库单ID |
| SapProductionOrderId | Guid? | 是 | SAP生产订单ID |
| StockOutDetailId | Guid? | 是 | 生产出库单ID |
| SapPurchaseOrderId | Guid? | 是 | 采购订单ID |
| SapInboundApplicationNo | string | 否 | SAP入库申请单号 |
| ArrivalRegistrationBillNo | string | 否 | 到货登记单号 |
| ArrivalRegistrationDetailId | Guid? | 是 | 到货登记明细ID |
| InboundApplicationId | Guid? | 是 | 入库申请单ID |
| InboundApplicationDetailId | Guid? | 是 | 入库申请单明细ID |
| SupplierId | Guid? | 是 | 供应商ID |
| LineNo | int | 否 | 行号 |
| ProductId | Guid | 否 | 物料Id |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| Quantity | decimal | 否 | 数量 |
| Unit | string? | 是 | 单位 |
| WbsElement | string? | 是 | WBS元素 |
| SapWbsId | Guid? | 是 | WBS元素ID |
| EngineSet | string? | 是 | 台份 |
| EngineSetStage | string? | 是 | 台份阶段 |
| SpecialStock | string | 否 | 特殊库存标识 |
| InventoryType | string? | 是 | 库存类型 |
| PurchaseOrderNo | string? | 是 | 采购订单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| AcceptanceFlowNo | string? | 是 | 验收流程单号 |
| SapInternalBatchNo | string? | 是 | SAP批次号 |
| LineMblnr | string? | 是 | 凭证号 |
| Zeile | string? | 是 | 凭证行项目号 |
| SupplierBatchNo | string | 否 | 供应商批号 |
| StorageLocationId | Guid? | 是 | 库存地点ID |
| StorageLocationCode | string? | 是 | 库存地点编码 |
| DrawingNo | string? | 是 | 图号 |
| ShelvedQuantity | decimal | 否 | 已上架数量 |
| ShelvingStatus | ShelvingStatusEnum | 否 | 上架状态 |
| CheckResultStatus | CheckResultEnum | 否 | 清点结果状态 |
| SerialNo | string? | 是 | 单件码 |
| OilSealPeriodDays | int? | 是 | 油封期天数 |
| LastOilSealDate | DateTime? | 是 | 上次油封日期 |
| NextOilSealDate | DateTime? | 是 | 下次油封日期 |
| ExpirationDate | DateTime? | 是 | 失效日期 |
| ProductionDate | DateTime? | 是 | 生产日期 |
| ShelfLifeDays | int? | 是 | 保质期天数 |
| ReinspectionPeriodDays | int? | 是 | 复验期天数 |
| LastReinspectionDate | DateTime? | 是 | 上次复验日期 |
| NextReinspectionDate | DateTime? | 是 | 下次复验日期 |
| ReferenceVoucherNo | string? | 是 | 参考凭证的凭证号(入库申请单) |
| ReferenceVoucherItem | string? | 是 | 参考凭证项目(入库申请单) |
| ReferenceVoucherYear | string? | 是 | 参考凭证年度 |
| InspectionBatchNo | string? | 是 | 检验批次号 |
| IsConformityInspectionItem | string? | 是 | 是否符合性检查件 |
| ManufacturingBatchNo | string? | 是 | 制造版次 |
| ContractNo | string? | 是 | 合同号 |
| QualityInspectionId | Guid | 否 | 质检登记ID |
| SapStatus | SapStatusEnum | 否 | SAP过账状态 |
| SapReceipt | string? | 是 | SAP回执信息 |

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
- `Id`、`TenantId`、`InspectionInboundId`、`SapProductionOrderId`、`StockOutDetailId`、`SapPurchaseOrderId`、`ArrivalRegistrationDetailId`、`InboundApplicationId`、`InboundApplicationDetailId`、`SupplierId`、`ProductId`、`SapWbsId`、`StorageLocationId`、`QualityInspectionId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
