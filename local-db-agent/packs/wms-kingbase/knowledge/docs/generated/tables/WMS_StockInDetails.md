# WMS_StockInDetails 入库单明细

> 由 ABP 源码自动生成
## 用途
入库单明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| LineId | int | 否 | 行号 |
| TenantId | Guid? | 是 | 租户ID |
| StockInId | Guid | 否 | 入库单ID |
| ProductId | Guid | 否 | 物料ID |
| DrawNo | string | 否 | 物料图号 |
| OBJID | string | 否 | OBJID |
| MaterialDrawing | string | 否 | 件号 |
| MaterialDesc | string | 否 | 物料描述 |
| MaterialType | string | 否 | 物料类型 |
| MaterialNo | string | 否 | 物料号 |
| PID1 | string | 否 | 条码 |
| StockInReason | string | 否 | 入库原因 |
| DrawVersion | string | 否 | 图版次号 |
| ProductBatchId | Guid | 否 | 物料批次ID |
| ProductClassId | Guid? | 是 | 单元体ID |
| Qty | decimal | 否 | 单据数量 |
| ReceiveQty | decimal | 否 | 入库数量 |
| CancelQty | decimal | 否 | 取消数量 |
| ProductionTime | DateTime? | 是 | 生产日期 |
| StockInTime | DateTime? | 是 | 入库时间 |
| CreateUser | string | 否 | 创建人 |
| Remark | string? | 是 | 备注 |
| StockInType | string | 否 | 入库类型 |
| am1Warehouse | string | 否 | 报废最终位置 |
| State | StockInOrderStateEnum | 否 | 状态 |
| Airworthiness | Boolean? | 是 | 是否适航批 |
| LastOilSealTime | DateTime? | 是 | 上次油封日期 |
| LastInspectionTime | DateTime? | 是 | 上次送检日期 |
| LastMaintenanceTime | DateTime? | 是 | 上次维保日期 |
| LastRegularTime | DateTime? | 是 | 上次班检日期 |
| InspectionPerson | string | 否 | 送检责任人 |
| OildSeaPerson | string | 否 | 油封责任人 |
| MaintenancePerson | string | 否 | 维保责任人 |
| RegularPerson | string? | 是 | 班检责任人 |
| NextOilSealTime | DateTime? | 是 | 下次油封日期 |
| NextInspectionTime | DateTime? | 是 | 下次送检日期 |
| NextMaintenanceTime | DateTime? | 是 | 下次维保日期 |
| NextRegularTime | DateTime? | 是 | 下次班检日期 |
| BatchNo | string | 否 | 批次号 |
| SerialNumber | string | 否 | 序列号 |
| PublicClassType | ProductClassTypeEnum? | 是 | 公共分类类型 |
| IsIsolate | bool | 否 | 是否隔离 |
| GuaranteeDay | int? | 是 | 保质期 |
| UseLife | decimal? | 是 | 使用寿命 |
| UseLifeUnit | UseLifeUnitEnum? | 是 | 使用寿命单位 |
| SupplierCode | string | 否 | 供应商编码 |
| DesignUnit | string | 否 | 设计台份 |
| ApplicationUnit | string | 否 | 应用台份 |

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
- `Id`、`LineId`、`TenantId`、`StockInId`、`ProductId`、`ProductBatchId`、`ProductClassId`

## 关系
- WMS_StockIns（1:N）：`WMS_StockInDetails.StockInId = WMS_StockIns.Id`
- WMS_Products（1:N）：`WMS_StockInDetails.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_StockInDetails.ProductBatchId = WMS_ProductBatchs.Id`
- WMS_ProductClasss（1:N）：`WMS_StockInDetails.ProductClassId = WMS_ProductClasss.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
