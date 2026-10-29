# WMS_StockOuts 出库订单

> 由 ABP 源码自动生成
## 用途
出库订单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| BillNo | string | 否 | 出库单号 |
| Werks | string | 否 | 工厂 |
| OwnerName | string | 否 | 工厂描述 |
| OriginalBillNo | string | 否 | SAP领用出库单号 |
| BusinessNode | string | 否 | 业务节点 |
| BusinessNodeDesc | string | 否 | 业务节点描述 |
| ApplicationType | string | 否 | 申请类型 |
| ApplicationTypeDesc | string | 否 | 申请类型描述 |
| MovementType | string | 否 | 移动类型 |
| OrderState | OrderStateEnum | 否 | 单据状态 |
| MarkState | OrderMarkStateEnum | 否 | 分配状态 |
| WarehouseId | Guid? | 是 | 仓库ID |
| StockOutTime | DateTime? | 是 | 出库日期 |
| DocumentDate | DateTime | 否 | 凭证日期 |
| Mblnr | string? | 是 | 凭证号 |
| CreateUser | string | 否 | 创建人 |
| ConfirmUser | string | 否 | 确认人 |
| PlanUseTime | DateTime? | 是 | 预计使用时间 |
| ErrorMessage | string | 否 | 异常信息 |
| Remark | string | 否 | 备注 |
| ProductionOrderNo | string | 否 | 生产订单号 |
| Posnr | string | 否 | 生产订单行号 |
| WpCode | string | 否 | WP编码 |
| WpName | string | 否 | WP名称 |
| EngineSnCode | string | 否 | 领用台份 |
| EngineSnName | string | 否 | 领用台份阶段 |
| SapStorageLocationId | Guid? | 是 | SAP库存地点Id |
| SpecialStock | string? | 是 | 特殊库存 |
| IsFinish | bool | 否 | 是否完成 |
| DepartmentOfIssue | string | 否 | 申请部门 |
| DepartmentPerson | string | 否 | 申请人 |
| LastCheckTime | DateTime? | 是 | 上一次齐套行检查时间 |
| KitCheckRate | string | 否 | 齐套率 |
| SendBpmUser | string? | 是 | 发送BPM人 |
| SendBpmTime | DateTime? | 是 | 发送BPM时间 |
| BpmApprovalUser | string? | 是 | BPM审批人 |
| BpmApprovalTime | DateTime? | 是 | BPM审批时间 |
| BpmApprovalResult | string? | 是 | BPM审批结果 |
| SendSapTime | DateTime? | 是 | 制单日期 |
| PassSapTime | DateTime? | 是 | 过账日期 |
| NeedApproval | bool | 否 | 是否需要审批 |

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
- `Id`、`WarehouseId`、`SapStorageLocationId`

## 索引字段
- `BillNo`、`IsDeleted`

## 关系
- WMS_Warehouses（1:N）：`WMS_StockOuts.WarehouseId = WMS_Warehouses.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/pda-stock-out/verify-list — 获取复核信息
- POST /api/app/pda-stock-out/verify — 复核
- POST /api/app/purchase-inbound/stock-out-quality-info — 获取出库订单数量
- GET /api/app/stock-out/stock-out-order-state-type — 获取出库单状态
- GET /api/app/stock-out/stock-out-by-id/{entityId} — 根据Id获取出库单
- POST /api/app/stock-out/stock-out-pages — 获取出库订单分页数据信息
- POST /api/app/stock-out/stock-out-detail-pages — 获取出库订单明细分页数据信息
- POST /api/app/stock-out/single-stock-out-detail-pages — 获取出库订单明细分页数据信息
- POST /api/app/stock-out/get-product-stock-out-detail-pages — 获取生产领用出库单明细分页数据信息
- POST /api/app/stock-out/manual-stock-out-detail-pages — 手动分配出库单明细
- POST /api/app/stock-out/export-stock-out — 出库信息导出
- POST /api/app/stock-out/export-stock-out-detail — 出库单明细导出
- POST /api/app/stock-out/download-stock-out-detail-template — 下载出库单明细导入模板
- POST /api/app/stock-out/stock-out — 创建出库单
- DELETE /api/app/stock-out/stock-out — 删除出库单
- PUT /api/app/stock-out/stock-out/{stockOutId} — 更新出库单
- POST /api/app/stock-out/import-stock-out-detail — 导入出库单明细
- POST /api/app/stock-out/kit-check — 齐套性检查
- POST /api/app/stock-out/send-to-oa — 发送BPM审批
- POST /api/app/stock-out/batch-send-to-oa — 批量发送BPM审批 逐单独立事务处理：成功的单据即时提交，失败的单据不影响已成功的单据。
<!-- api:end -->
