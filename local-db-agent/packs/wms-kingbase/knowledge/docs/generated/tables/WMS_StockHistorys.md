# WMS_StockHistorys 库存流水

> 由 ABP 源码自动生成
## 用途
库存流水

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Warehouse | string | 否 | 仓库 |
| TenantId | Guid? | 是 | 租户ID |
| OrginalBillNo | string | 否 | 关联单号 |
| BusinessNode | string | 否 | 业务节点 |
| BusinessNodeDesc | string | 否 | 业务节点描述 |
| ApplicationType | string | 否 | 申请类型 |
| ApplicationTypeDesc | string | 否 | 申请类型描述 |
| HistoryType | HistoryTypeEnum | 否 | 作业类型 |
| ProductId | Guid? | 是 | 物料ID |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| OwnerCode | string | 否 | 工厂编码 |
| OwnerName | string | 否 | 工厂名称 |
| ItemBatch | string | 否 | SAP批次号 |
| SupplierBatch | string | 否 | 供应商批次 |
| SupplierCode | string | 否 | 供应商编码(取批次里面的) |
| SupplierName | string | 否 | 供应商名称(取批次里面的) |
| ProductionTime | DateTime? | 是 | 生产日期 |
| ReceivingTime | DateTime? | 是 | 收货日期 |
| ManufacturingVersion | string | 否 | 制造版次 |
| InspectionInfo | string | 否 | 制造符合性 |
| SpecialStock | string | 否 | 特殊库存 |
| RawQty | decimal | 否 | 变动前数量 |
| NewQty | decimal | 否 | 变动后数量 |
| CreateUser | string | 否 | 操作人 |
| StockFlag | StockFlagEnum | 否 | 冻结标识 |
| FrozenReason | string | 否 | 冻结原因 |
| InventoryType | string? | 是 | 库存类型 |

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
- `Id`、`TenantId`、`ProductId`

## 索引字段
- `ProductCode`、`ContainerCode`

## 关系
- WMS_Products（1:N）：`WMS_StockHistorys.ProductId = WMS_Products.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/collect-piece-plan/collect-piece-plan — 新增集件计划单
- PUT /api/app/collect-piece-plan/collect-piece-plan/{entityId} — 编辑集件计划单
- POST /api/app/stock/stock-history-pages — 库存变动分页
- POST /api/app/stock/export-stock-history — 库存变动导出
<!-- api:end -->
