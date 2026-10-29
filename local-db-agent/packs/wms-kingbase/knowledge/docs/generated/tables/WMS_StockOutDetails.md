# WMS_StockOutDetails 出库单明细

> 由 ABP 源码自动生成
## 用途
出库单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| WarehouseId | Guid? | 是 | 仓库ID |
| LineId | int | 否 | 行号 |
| StockOutId | Guid | 否 | 出库单ID |
| OrderDetailState | OrderDetailStateEnum | 否 | 单据明细状态 |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| EngineSnCode | string? | 是 | 台份 |
| EngineSnName | string? | 是 | 台份阶段 |
| IssueEngineSnCode | string? | 是 | 领用台份 |
| IssueEngineSnName | string? | 是 | 领用台份阶段 |
| SapStorageLocationId | Guid? | 是 | 库存地点Id |
| ReceiveSapStorageLocationId | Guid? | 是 | 收货库存地点Id |
| SapWbsId | Guid? | 是 | WBS元素ID |
| IssueSapWbsId | Guid? | 是 | 领用WBS元素ID |
| SupplierId | Guid? | 是 | 供应商ID |
| SingleCode | string | 否 | 单件码 |
| Qty | decimal | 否 | 申请领用数量 |
| MarkQty | decimal | 否 | 已分配数量 |
| PickQty | decimal | 否 | 已拣货数量 |
| VerifyQty | decimal | 否 | 已复核数量 |
| IsPickTaskGenerated | bool | 否 | 是否生成拣货任务 |
| SmallSeq | string? | 是 | 小序号 |
| ManufacturingVersion | string? | 是 | 制造版次 |
| InspectionInfo | string? | 是 | 制造符合性 |
| BatchManage | string? | 是 | 批次管理 |
| SpecialStock | string? | 是 | 特殊库存 |
| InventoryType | string? | 是 | 库存类型 |
| Remark | string | 否 | 备注 |
| CreateUser | string | 否 | 创建人 |
| MarkState | OrderMarkStateEnum | 否 | 分配状态 |
| CostCode | string? | 是 | 成本中心 |
| CostName | string? | 是 | 成本中心名称 |
| ShiWuQuX | string? | 是 | 实物去向 |
| NeedAutoAllocation | bool | 否 | 是否自动分配 |
| PurchaseOrderNo | string? | 是 | 采购单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| Belnr | string? | 是 | 凭证号 |
| Buzei | string? | 是 | 凭证行项目号 |
| ContractNo | string? | 是 | 合同号 |
| GeneratedQty | decimal | 否 | 已生单数量 |

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
- `Id`、`WarehouseId`、`LineId`、`StockOutId`、`ProductId`、`ProductBatchId`、`SapStorageLocationId`、`ReceiveSapStorageLocationId`、`SapWbsId`、`IssueSapWbsId`、`SupplierId`

## 关系
- WMS_StockOuts（1:N）：`WMS_StockOutDetails.StockOutId = WMS_StockOuts.Id`
- WMS_Products（1:N）：`WMS_StockOutDetails.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_StockOutDetails.ProductBatchId = WMS_ProductBatchs.Id`
- WMS_Suppliers（1:N）：`WMS_StockOutDetails.SupplierId = WMS_Suppliers.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
