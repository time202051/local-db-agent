# WMS_ShelvingRecords 上架明细

> 由 ABP 源码自动生成
## 用途
上架明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| SourceBillNo | string | 否 | 来源单号 |
| SapBillNo | string? | 是 | SAP单号 |
| SourceBillType | SourceBillTypeEnum | 否 | 来源单据类型 |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| DrawingNo | string? | 是 | 图号 |
| Unit | string | 否 | 单位 |
| CargoLocationCode | string | 否 | 货位编码 |
| ContainerCode | string? | 是 | 容器编码 |
| ShelvedQuantity | decimal | 否 | 上架数量 |
| ShelvingTime | DateTime | 否 | 上架时间 |
| ShelvingUserName | string | 否 | 上架人姓名 |
| PostId | string | 否 | WBS元素 |
| Post1 | string | 否 | WBS短描述 |
| EngineSet | string? | 是 | 台份 |
| EngineSetStage | string? | 是 | 台份阶段 |
| SpecialStock | string | 否 | 特殊库存标识 |
| InventoryType | string? | 是 | 库存类型 |
| SapInternalBatchNo | string? | 是 | SAP批次号 |
| SupplierBatchNo | string | 否 | 供应商批号 |
| SerialNo | string? | 是 | 单件码 |
| StorageLocationCode | string? | 是 | 库存地点编码 |
| OilSealPeriodDays | int? | 是 | 油封周期(天) |
| LastOilSealDate | DateTime? | 是 | 油封开始日期 |
| NextOilSealDate | DateTime? | 是 | 油封结束日期 |
| ExpirationDate | DateTime? | 是 | 失效日期 |
| ProductionDate | DateTime? | 是 | 生产日期 |
| ShelfLifeDays | int? | 是 | 保质期(天) |
| ReinspectionPeriodDays | int? | 是 | 复验周期(天) |
| LastReinspectionDate | DateTime? | 是 | 复验开始日期 |
| NextReinspectionDate | DateTime? | 是 | 复验结束日期 |
| ShelvingStatus | ShelvingRecordStatusEnum | 否 | 上架状态 |

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
- `Id`、`TenantId`、`PostId`

## 索引字段
- `SourceBillNo`、`SourceDetailId`、`SourceBillType`、`StockId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/purchase-inbound/shelving-record — PC/PDA手动上架(入库单上架)
- POST /api/app/purchase-inbound/shelving-record-pages — 分页查询上架明细
- POST /api/app/purchase-inbound/export-shelving-record — 导出上架明细
<!-- api:end -->
