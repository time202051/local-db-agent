# WMS_ArrivalRegistrations 到货登记单

> 由 ABP 源码自动生成
## 用途
到货登记单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| BillNo | string | 否 | 到货登记单号 |
| RegistrationTime | DateTime | 否 | 到货登记时间 |
| Status | ArrivalRegistrationStatusEnum | 否 | 单据状态 |
| Source | ArrivalRegistrationSourceEnum | 否 | 数据来源 |
| RegistrantId | Guid | 否 | 到货登记人ID |
| RegistrantName | string | 否 | 到货登记人姓名 |
| OwnerId | Guid | 否 | 公司ID |
| OwnerCode | string | 否 | 公司编码 |
| OwnerName | string | 否 | 公司名称 |
| LogisticsCompanyId | Guid? | 是 | 物流公司ID |
| LogisticsCompanyName | string? | 是 | 物流公司名称 |
| SupplierId | Guid? | 是 | 供应商ID |
| SupplierCode | string | 否 | 供应商编码 |
| SupplierName | string? | 是 | 供应商名称 |
| TotalBoxCount | int | 否 | 总箱数 |
| LicensePlateNo | string? | 是 | 车牌号 |
| DeliveryUnitContact | string? | 是 | 发货单位联系人 |
| DeliveryUnitContactPhone | string? | 是 | 发货单位联系人电话 |
| ReceivingUnitContact | string? | 是 | 收货单位联系人 |
| ReceivingUnitContactPhone | string? | 是 | 收货单位联系人电话 |
| DeliveryOrderNo | string? | 是 | 送货单号 |
| PurchaserName | string? | 是 | 采购员 |
| TempStorageLocationCode | string? | 是 | 暂存区库位编码 |
| ReceivingConclusion | ReceivingConclusionEnum | 否 | 收货结论 |
| OuterPackageStatus | string? | 是 | 来货外包装是否正常 |
| OuterPackageStatusRemark | string? | 是 | 来货外包装检查备注 |
| GoodsDeliveryConsistency | string? | 是 | 货物与送货单名称、数量是否一致 |
| GoodsDeliveryConsistencyRemark | string? | 是 | 货物与送货单一致性检查备注 |
| HasPackingList | string? | 是 | 是否有装箱单 |
| HasPackingListRemark | string? | 是 | 装箱单检查备注 |
| HasAttachedDocuments | string? | 是 | 是否有随件文件 |
| HasAttachedDocumentsRemark | string? | 是 | 随件文件检查备注 |
| InnerPackageStatus | string? | 是 | 来货内包装是否正常 |
| InnerPackageStatusRemark | string? | 是 | 来货内包装检查备注 |
| ProductDamageStatus | string? | 是 | 箱内物资是否有明显磕碰、划伤 |
| ProductDamageStatusRemark | string? | 是 | 箱内物资磕碰划伤检查备注 |
| OtherInspectionRemark | string? | 是 | 其他检查备注 |
| Remark | string? | 是 | 备注 |
| DemanderId | Guid? | 是 | 单证员Id |
| DemanderName | string | 否 | 单证员 |
| WarehouseId | Guid? | 是 | 仓库ID |
| GoodsType | int? | 是 | 货物类型 |
| AcceptanceType | int? | 是 | 验收类型 |
| CheckingUserId | Guid? | 是 | 清点人ID |

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
- `Id`、`TenantId`、`RegistrantId`、`OwnerId`、`LogisticsCompanyId`、`SupplierId`、`DemanderId`、`WarehouseId`、`CheckingUserId`

## 关系
- WMS_LogisticsCompanies（1:N）：`WMS_ArrivalRegistrations.LogisticsCompanyId = WMS_LogisticsCompanies.Id`
- WMS_Suppliers（1:N）：`WMS_ArrivalRegistrations.SupplierId = WMS_Suppliers.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/pda-purchase-inbound/arrival-registration-by-delivery-shipment — PDA扫描/输入交付发运单号创建到货登记单
- POST /api/app/pda-purchase-inbound/arrival-registration-pages — 到货登记单分页查询(包含头和明细)
- POST /api/app/purchase-inbound/arrival-registration — 创建到货登记单
- PUT /api/app/purchase-inbound/{id}/arrival-registration — 编辑到货登记单(仅暂存状态)
- GET /api/app/purchase-inbound/{id}/arrival-registration — 获取到货登记单头详情
- DELETE /api/app/purchase-inbound/{id}/arrival-registration — 删除到货登记单
- POST /api/app/purchase-inbound/generate-arrival-registration-serial-no — 按到货登记单号生成/复用明细单件码(外部调用)： 交付发运单号不为空、单件码为空且供应商批次不为空的明细行, 同物料+同供应商批次复用已有系统流水号,否则按 yyMMdd+4位流水 生成
- POST /api/app/purchase-inbound/{id}/manual-close-arrival-registration — 手动关闭到货登记
- POST /api/app/purchase-inbound/arrival-registration-pages — 分页查询到货登记列表
- POST /api/app/purchase-inbound/arrival-registration-status-pages — 按固定条件分页查询到货登记列表(支持状态筛选)
- POST /api/app/purchase-inbound/arrival-registration-detail-pages — 到货登记单明细分页查询
- POST /api/app/purchase-inbound/arrival-registration-full-pages — 到货登记单分页查询(包含头和明细)
- POST /api/app/purchase-inbound/export-arrival-registration-full — 导出到货登记单(包含头和明细)
- POST /api/app/purchase-inbound/export-arrival-registration — 导出到货登记列表
- POST /api/app/purchase-inbound/arrival-registration-header-backfill — 反填到货登记单头字段
- POST /api/app/purchase-inbound/batch-delete-arrival-registration-details — 物理删除到货登记明细(仅暂存单据,直接删除数据并释放采购订单占用数量)
- GET /api/app/purchase-inbound/arrival-registration-status-tracking/{arrivalRegistrationId} — 查询到货登记单明细在各业务节点的状态汇总
- POST /api/app/purchase-inbound/pda-arrival-registration-details — 到货登记单获取待清点数据
- GET /api/app/purchase-inbound/arrival-registration-info-card-print — 打印到货登记信息卡(根据到货登记Id集合)
- POST /api/app/purchase-inbound/download-arrival-registration-template — 下载到货登记导入模板
<!-- api:end -->
