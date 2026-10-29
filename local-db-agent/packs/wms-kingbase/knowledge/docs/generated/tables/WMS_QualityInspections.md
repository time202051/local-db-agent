# WMS_QualityInspections 质检登记

> 由 ABP 源码自动生成
## 用途
质检登记

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| ArrivalRegistrationBillNo | string | 否 | 到货登记单号 |
| ArrivalRegistrationDetailId | Guid | 否 | 到货登记明细ID |
| InboundApplicationNo | string | 否 | 入库申请单号 |
| SapInboundApplicationNo | string | 否 | SAP入库申请单号 |
| InboundLineNo | string | 否 | 入库单行号 |
| SapInspectionBatchNo | string? | 是 | SAP检验批号 |
| SapInternalBatch | string? | 是 | SAP内部批号 |
| DrawingNo | string? | 是 | 图号 |
| UsageDecisionCode | string? | 是 | 使用决策代码 |
| CodeEvaluation | string? | 是 | 代码评估 |
| QualityScore | decimal? | 是 | 质量记分 |
| InspectionBatchQuantity | decimal? | 是 | 检验批数量 |
| SupplierBatchNo | string | 否 | 供应商批号 |
| QualifiedQuantity | decimal | 否 | 合格数 |
| UnqualifiedQuantity | decimal | 否 | 不合格数 |
| ApplicationTotalQuantity | decimal | 否 | 入库申请总数 |
| SupplierId | Guid | 否 | 供应商ID |
| SupplierName | string | 否 | 供应商名称 |
| OwnerId | Guid | 否 | 工厂ID |
| OwnerName | string | 否 | 工厂名称 |
| PurchaserId | Guid? | 是 | 采购员ID |
| PurchaserName | string? | 是 | 采购员姓名 |
| RegistrantId | Guid? | 是 | 到货登记人ID |
| RegistrantName | string? | 是 | 到货登记人姓名 |
| ApplicantId | Guid? | 是 | 入库申请员ID |
| ApplicantName | string? | 是 | 入库申请员姓名 |
| Status | QualityInspectionStatusEnum | 否 | 状态 |
| SapReceipt | string? | 是 | SAP回执 |
| InspectionTime | DateTime? | 是 | 检验时间 |
| InspectorId | Guid? | 是 | 检验人ID |
| InspectorName | string? | 是 | 检验人姓名 |
| InboundApplicationId | Guid | 否 | 入库申请单ID |
| InboundApplicationDetailId | Guid | 否 | 入库申请单明细ID |
| ProductId | Guid | 否 | 物料Id |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |

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
- `Id`、`TenantId`、`ArrivalRegistrationDetailId`、`SupplierId`、`OwnerId`、`PurchaserId`、`RegistrantId`、`ApplicantId`、`InspectorId`、`InboundApplicationId`、`InboundApplicationDetailId`、`ProductId`

## 关系
- WMS_ArrivalRegistrationDetails（1:N）：`WMS_QualityInspections.ArrivalRegistrationDetailId = WMS_ArrivalRegistrationDetails.Id`
- WMS_Products（1:N）：`WMS_QualityInspections.ProductId = WMS_Products.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/purchase-inbound/quality-inspection-pages — PC/PDA分页查询检验登记列表
- PUT /api/app/purchase-inbound/quality-inspection — PC/PDA更新检验结果(合格数/不合格数)
- POST /api/app/purchase-inbound/submit-quality-inspection — PC/PDA提交检验结果到SAP(同步入口,待提交记录超过300行请使用异步入口 SubmitQualityInspectionByQueueAsync)
- POST /api/app/purchase-inbound/submit-quality-inspection-by-queue — 提交检验结果到SAP异步入口(待提交记录超过300行时使用,每10条一组入队后台队列并行提交)
- POST /api/app/purchase-inbound/submit-quality-inspection-batch/{operationUserId} — 提交检验结果到SAP异步处理(由后台队列Job调用,操作人由入队方传入)
- POST /api/app/purchase-inbound/resubmit-quality-inspection — 重新发起检验(不合格品维修后重新入库申请)
- POST /api/app/purchase-inbound/export-quality-inspection — 导出检验登记
- POST /api/app/purchase-inbound/import-quality-inspection — 导入检验结果
<!-- api:end -->
