# WMS_NonPurchaseInboundOrders 非采购入库单

> 由 ABP 源码自动生成
## 用途
非采购入库单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| BillNo | string | 否 | WMS入库单号 |
| SapBillNo | string? | 是 | SAP入库单号 |
| OwnerId | Guid | 否 | 工厂ID |
| OwnerName | string | 否 | 工厂名称 |
| StorageLocationId | Guid | 否 | 库存地点ID |
| StorageLocationName | string? | 是 | 库存地点名称 |
| SupplierId | Guid | 否 | 供应商ID |
| SupplierName | string | 否 | 供应商名称 |
| Status | NonPurchaseInboundStatusEnum | 否 | 单据状态 |
| BusinessNode | string | 否 | 业务节点 |
| SubBusinessNode | string | 否 | 子业务节点 |
| ApplicationType | string | 否 | 申请类型 |
| StockType | InboundStockTypeEnum | 否 | 特殊库存标识 |
| ApplicantId | Guid | 否 | 申请人ID |
| ApplicantName | string | 否 | 申请人姓名 |
| SapReceipt | string? | 是 | SAP回执信息 |
| Remark | string? | 是 | 备注 |
| WarehouseId | Guid? | 是 | 仓库ID |

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
- `Id`、`TenantId`、`OwnerId`、`StorageLocationId`、`SupplierId`、`ApplicantId`、`WarehouseId`

## 索引字段
- `BillNo`、`IsDeleted`、`Status`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/non-purchase-inbound/non-purchase-inbound-pages — 分页查询非采购入库单列表（只查 SourceType=NonPurchase 的行）
- GET /api/app/non-purchase-inbound/{id}/non-purchase-inbound — 获取非采购入库单详情（不含明细，明细通过分页接口单独查询）
- PUT /api/app/non-purchase-inbound/{id}/non-purchase-inbound — 修改非采购入库单（含状态校验）
- DELETE /api/app/non-purchase-inbound/{id}/non-purchase-inbound — 删除非采购入库单（含状态校验）
- POST /api/app/non-purchase-inbound/non-purchase-inbound — 新增非采购入库单（含业务节点与申请类型联动和存货类型自动判断）
- POST /api/app/non-purchase-inbound/{id}/submit-non-purchase-inbound-to-sap — 提交SAP（预留）
- POST /api/app/non-purchase-inbound/{id}/send-non-purchase-inbound-posting — 发送SAP过账（预留）
- POST /api/app/non-purchase-inbound/{id}/manual-post-non-purchase-inbound — 手动过账
- GET /api/app/non-purchase-inbound/export-non-purchase-inbound — 导出非采购入库单
- GET /api/app/pda-purchase-inbound/by-bill-no — PDA按单号获取到货登记详情(扫到货信息卡二维码后调用)
- POST /api/app/pda-purchase-inbound/reset-checking — PDA扫码清点 - 重置清点(清空当前明细的异常处理信息、异常数量、清点数量，仅限未清点完成的明细行)
- POST /api/app/purchase-inbound/temp-storage-shelve — PC/PDA到货登记(暂存→已到货确认/暂存区上架)
- POST /api/app/purchase-inbound/{id}/cancel-arrival — 取消到货(已到货确认→暂存)
- POST /api/app/purchase-inbound/handle-abnormal — 到货登记异常处理入口(把未清点数量转为异常数量，并填写处理原因、处理说明和是否允许入库)
- POST /api/app/purchase-inbound/arrival-checking-workbench-pages — PC端到货清点列表分页查询
- POST /api/app/purchase-inbound/batch-set-checking-user — 批量指派到货登记单清点人
- POST /api/app/purchase-inbound/set-arrival-checking-allow-inbound — 更新清点明细是否允许入库
- POST /api/app/purchase-inbound/export-arrival-checking-workbench — 导出到货清点列表明细
- POST /api/app/purchase-inbound/batch-qualified — PC/PDA批量检验合格(合格数=入库申请总数,不合格数=0)
- POST /api/app/purchase-inbound/batch-unqualified — PC/PDA批量检验不合格(合格数=0,不合格数=入库申请总数)
<!-- api:end -->
