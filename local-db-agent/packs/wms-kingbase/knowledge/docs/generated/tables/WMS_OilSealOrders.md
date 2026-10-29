# WMS_OilSealOrders 油封单

> 由 ABP 源码自动生成
## 用途
油封单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| OilSealUnitType | OilSealUnitTypeEnum | 否 | 执行油封单位 |
| DepartmentId | Guid? | 是 | 内部油封部门ID |
| SupplierId | Guid? | 是 | 外部油封公司ID |
| PlanReturnDate | DateTime | 否 | 预计归还日期 |
| ProductId | Guid | 否 | 物料ID |
| ProductBatchId | Guid? | 是 | 批次ID |
| OwnerId | Guid? | 是 | 工厂ID |
| SerialNo | string | 否 | 单件码 |
| DeliveryShipNo | string | 否 | 交付发运单号 |
| Qty | decimal | 否 | 数量 |
| StockId | Guid? | 是 | 库存ID |
| ApplicationUser | string | 否 | 申请人 |
| ApplicationTime | DateTime | 否 | 申请时间 |
| OilSealDate | DateTime? | 是 | 油封时间 |

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
- `Id`、`DepartmentId`、`SupplierId`、`ProductId`、`ProductBatchId`、`OwnerId`、`StockId`

## 关系
- WMS_Products（1:N）：`WMS_OilSealOrders.ProductId = WMS_Products.Id`
- WMS_ProductBatchs（1:N）：`WMS_OilSealOrders.ProductBatchId = WMS_ProductBatchs.Id`
- WMS_Owners（1:N）：`WMS_OilSealOrders.OwnerId = WMS_Owners.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/oil-seal/oil-seal-order-pages — 油封单分页查询
- POST /api/app/oil-seal/export-oil-seal-order — 油封单导出
- GET /api/app/pda-oil-seal/oil-seal-list-for-down — 油封下架列表
- POST /api/app/pda-oil-seal/oil-seal-down — 油封下架
- POST /api/app/pda-oil-seal/oil-seal-work-order — 油封转工单
- GET /api/app/pda-oil-seal/oil-seal-list-for-up — 油封上架列表
- POST /api/app/pda-oil-seal/oil-seal-up — 油封上架
- POST /api/app/stock/oil-seal-alarm-pages — 油封告警分页
- POST /api/app/stock/export-oil-seal-alarm — 油封告警导出
<!-- api:end -->
