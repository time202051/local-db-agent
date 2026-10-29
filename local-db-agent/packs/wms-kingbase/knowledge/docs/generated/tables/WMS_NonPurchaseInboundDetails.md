# WMS_NonPurchaseInboundDetails 非采购入库单明细

> 由 ABP 源码自动生成
## 用途
非采购入库单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| NonPurchaseInboundOrderId | Guid | 否 | 非采购入库单ID |
| MaterialCode | string | 否 | 物料编码 |
| MaterialName | string | 否 | 物料名称 |
| Quantity | decimal | 否 | 数量 |
| Unit | string | 否 | 单位 |
| WbsElement | string? | 是 | WBS元素 |
| EngineSet | string? | 是 | 台份 |
| CostCenterId | Guid? | 是 | 成本中心ID |
| CostCenterName | string? | 是 | 成本中心名称 |
| SupplierBatchNo | string | 否 | 供应商批号 |
| OilSealPeriodDays | int? | 是 | 油封期天数 |
| LastOilSealDate | DateTime? | 是 | 上次油封日期 |
| ProductionDate | DateTime? | 是 | 生产日期 |
| ExpirationDate | DateTime? | 是 | 失效日期 |
| ShelfLifeDays | int? | 是 | 保质期天数 |
| ReinspectionPeriodDays | int? | 是 | 复验期天数 |
| LastReinspectionDate | DateTime? | 是 | 上次复验日期 |
| NextReinspectionDate | DateTime? | 是 | 下次复验日期 |
| ShelvedQuantity | decimal | 否 | 已上架数量 |
| ShelvingStatus | ShelvingStatusEnum | 否 | 上架状态 |

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
- `Id`、`TenantId`、`NonPurchaseInboundOrderId`、`CostCenterId`

## 索引字段
- `NonPurchaseInboundOrderId`、`MaterialCode`

## 关系
- WMS_NonPurchaseInboundOrders（1:N）：`WMS_NonPurchaseInboundDetails.NonPurchaseInboundOrderId = WMS_NonPurchaseInboundOrders.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/non-purchase-inbound/non-purchase-inbound-detail-pages — 非采购入库单明细分页查询
- POST /api/app/pda-purchase-inbound/submit-checking-data — PDA扫码清点 - 提交清点数据(部分清点，累加清点数量)
- POST /api/app/pda-purchase-inbound/complete-checking — PDA扫码清点 - 完成清点(单条明细)
- POST /api/app/purchase-inbound/acceptance-flow-source-detail-candidate-pages — 分页查询验收流程来源明细候选
- POST /api/app/purchase-inbound/submit-arrival-checking — 提交清点数量
- POST /api/app/purchase-inbound/complete-arrival-checking — 完成清点
- POST /api/app/purchase-inbound/inspetion-inbound-check-details — 检验入库单获取待清点数据
- POST /api/app/purchase-inbound/batch-commit-check — 批量清点完成
- POST /api/app/purchase-inbound/batch-temp-check — 批量暂存清点
<!-- api:end -->
