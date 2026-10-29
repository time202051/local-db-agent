# WMS_DeliveryShipments 交付发运单

> 由 ABP 源码自动生成
## 用途
交付发运单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户Id |
| DeliveryShipmentNo | string | 否 | 交付发运单号 |
| Status | DeliveryShipmentStatusEnum | 否 | 交付发运单状态 |
| OwnerCode | string | 否 | 公司(货主) |
| LogisticsCompanyName | string | 否 | 物流公司 |
| SupplierCode | string | 否 | 供应商编码 |
| TotalBoxCount | int | 否 | 总箱数/外包袋数 |
| DeliveryUnitContact | string | 否 | 发货单位联系人 |
| DeliveryUnitContactPhone | string | 否 | 发货单位联系人电话 |
| ReceivingUnitContact | string | 否 | 收货单位联系人 |
| ReceivingUnitContactPhone | string | 否 | 收货单位联系人电话 |
| DeliveryOrderNo | string | 否 | 送货单号 |
| PurchaserName | string | 否 | 采购员 |

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
- `Id`、`TenantId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/delivery-shipment/delivery-shipment-pages — 获取交付发运单分页数据
- GET /api/app/delivery-shipment/{id}/by-id — 根据ID获取交付发运单
- POST /api/app/delivery-shipment/delivery-shipment-detail-pages — 获取交付发运单明细分页数据信息
- POST /api/app/delivery-shipment/export-delivery-shipment — 导出交付发运单
- POST /api/app/delivery-shipment — 创建交付发运单
- PUT /api/app/delivery-shipment — 更新交付发运单
- DELETE /api/app/delivery-shipment/{id} — 删除交付发运单
- DELETE /api/app/delivery-shipment/many — 批量删除交付发运单
- POST /api/app/delivery-shipment/sync-from-srm — SRM同步交付发运单
- POST /api/app/purchase-inbound/{id}/refresh-delivery-shipment-serial-no — 获取交付发运单单件码回填到货登记明细(仅暂存状态)
- POST /api/app/purchase-inbound/delivery-shipment-source-pages — 直连外部Oracle SRM数据库，查询视图 V_DELIVERY_SHIPMENT_SOURCE / V_DELIVERY_SHIPMENT_SOURCE_SWS
- POST /api/app/purchase-inbound/local-delivery-shipment-source-pages — 交付发运来源分页查询(新SRM系统)
- POST /api/app/purchase-inbound/delivery-shipment-source-detail-candidate-pages — 分页查询交付发运来源明细候选
<!-- api:end -->
