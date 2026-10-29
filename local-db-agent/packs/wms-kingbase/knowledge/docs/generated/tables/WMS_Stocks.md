# WMS_Stocks 库存

> 由 ABP 源码自动生成
## 用途
库存

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ProductClassId | Guid? | 是 | 物料类别ID |
| ProductId | Guid | 否 | 物料ID |
| OwnerId | Guid | 否 | 工厂ID |
| SapWbsId | Guid? | 是 | SAP-WBS元素ID |
| EngineSnCode | string | 否 | 台份号 |
| ProductBatchId | Guid? | 是 | 物料批次ID |
| ContainerId | Guid? | 是 | 容器ID |
| SapStorageLocationId | Guid | 否 | SAP库存地点ID |
| ProductionTime | DateTime? | 是 | 生产日期 |
| ReceivingTime | DateTime? | 是 | 收货日期 |
| CabinetNumber | string | 否 | 隔板号 |
| SerialNo | string | 否 | 单件码 |
| Qty | decimal | 否 | 数量 |
| LockQty | decimal | 否 | 占用数量 |
| TotalQty | decimal | 否 | 库存数量 |
| Remark | string | 否 | 备注 |
| ManufacturingVersion | string | 否 | 制造版次 |
| InspectionInfo | string | 否 | 制造符合性 |
| SpecialStock | string | 否 | 特殊库存 |
| SpecialStockNumber | string | 否 | WBS元素 |
| StockFlag | StockFlagEnum | 否 | 冻结标识 |
| FrozenReason | string | 否 | 冻结原因 |

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
- `Id`、`TenantId`、`ProductClassId`、`ProductId`、`OwnerId`、`SapWbsId`、`ProductBatchId`、`ContainerId`、`SapStorageLocationId`

## 索引字段
- `ContainerId`、`ArrivalRegistrationBillNo`

## 关系
- WMS_Products（1:N）：`WMS_Stocks.ProductId = WMS_Products.Id`
- WMS_Containers（1:N）：`WMS_Stocks.ContainerId = WMS_Containers.Id`
- WMS_ProductClasss（1:N）：`WMS_Stocks.ProductClassId = WMS_ProductClasss.Id`
- WMS_Owners（1:N）：`WMS_Stocks.OwnerId = WMS_Owners.Id`
- WMS_ProductBatchs（1:N）：`WMS_Stocks.ProductBatchId = WMS_ProductBatchs.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/dict-data/special-stock-select — 特殊库存下拉
- POST /api/app/i-lT/stock-for-periodic-count — 【周期盘点】查询可盘点的库存列表（与库存查询返回一致，额外排除锁定和在盘库存）
- POST /api/app/i-lT/stock-for-dynamic-count — 【动态盘点】查询指定时间范围内有出入库变动的库存 通过 StockHistory 流水表筛选发生过出入库操作（上架/下架/拣选/出库等）的 ProductId/CargoLocationCode， 联合匹配 Stock 表定位有变动的库存行。返回与库存查询一致的 DomainStockDto。
- POST /api/app/oil-seal/stock-period-log-pages — 三期录入流水分页查询
- POST /api/app/oil-seal/export-stock-period-log — 三期录入流水导出
- GET /api/app/pda-purchase-inbound/in-stock-shelving-list — 获取入库单(检验入库单)列表(待上架,分页)
- GET /api/app/pda-purchase-inbound/today-in-stock-shelving-list — 获取当天已完成入库单(检验入库单,分页)
- GET /api/app/pda-purchase-inbound/in-stock-shelving-detail-list — 获取入库单(检验入库单)明细列表(分页)
- GET /api/app/pda-purchase-inbound/in-stock-shelving-detail-by-id/{inspectionInboundDetailId} — 获取单条入库单(检验入库单)明细
- POST /api/app/pda-stock-transfer-app-servie/scan-material-qr-code-stock-info — 扫描物料二维码获取可调拨库存
- POST /api/app/product/export-stock — 物料信息导出
- PUT /api/app/purchase-inbound/unstocked-reason — 维护到货登记未入库原因
- POST /api/app/stock/page-list-sort — 分页查询库存分页(PC/PDA共用 支持动态排序)
- GET /api/app/stock/print-label — 根据库存ID集合获取库存打印标签数据列表
- POST /api/app/stock/export-stock — 库存导出（支持 xlsx/csv/html，通过 input.ExportFormat 指定，默认 xlsx）
- GET /api/app/stock/three-date-alarm-count — 计算三期报警记录数
- POST /api/app/stock/recheck-alarm-pages — 复验告警分页
- POST /api/app/stock/export-recheck-alarm — 复验告警导出
- POST /api/app/stock/expire-alarm-pages — 生产日期告警分页
- POST /api/app/stock/export-expire-alarm — 生产日期告警导出
<!-- api:end -->
