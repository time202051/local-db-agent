# WMS_InspectionInbounds 检验入库单

> 由 ABP 源码自动生成
## 用途
检验入库单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| BillNo | string | 否 | 检验入库单号 |
| SapBillNo | string? | 是 | SAP检验入库单号 |
| Mblnr | string? | 是 | 单据凭证号 |
| OwnerId | Guid | 否 | 工厂ID |
| OwnerCode | string | 否 | 工厂 |
| OwnerName | string | 否 | 工厂名称 |
| BusinessNodeDesc | string? | 是 | 业务节点描述 |
| ApplicationTypeDesc | string? | 是 | 申请类型描述 |
| MovementType | string? | 是 | 移动类型 |
| DocumentDate | DateTime | 否 | 凭证日期 |
| DepartmentOfIssue | string? | 是 | 申请部门 |
| CreateUser | string? | 是 | 创建人 |
| SendSapTime | DateTime? | 是 | 制单日期 |
| PassSapTime | DateTime? | 是 | 过账日期 |
| Status | InspectionInboundStatusEnum | 否 | 单据状态 |
| ShelvingCompletedTime | DateTime? | 是 | 上架完成时间 |
| ProductionOrderNo | string | 否 | 生产订单号 |
| Posnr | string | 否 | 生产订单行号 |
| WpCode | string | 否 | WP编码 |
| WpName | string | 否 | WP名称 |
| EngineSnCode | string | 否 | 领用台份 |
| EngineSnName | string | 否 | 领用台份阶段 |
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
- `Id`、`TenantId`、`OwnerId`、`WarehouseId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- PUT /api/app/purchase-inbound/inspection-inbound-temp-storage-location — 修改检验入库单暂存区库位编码
- POST /api/app/purchase-inbound/inspection-inbound-checking-pages — 非采购清点列表分页查询
- POST /api/app/purchase-inbound/export-inspection-inbound-checking — 导出非采购清点
- POST /api/app/purchase-inbound/batch-mark-no-inspection-required — PC/PDA批量标记无需检验(跳过SAP检验结果接口)
- POST /api/app/purchase-inbound/inspection-inbound — 创建检验入库单(支持跨入库申请单选择明细合并创建)
- PUT /api/app/purchase-inbound/{id}/inspection-inbound — 编辑检验入库单(采购场景，暂存状态全量替换明细)
- GET /api/app/purchase-inbound/{id}/inspection-inbound — 获取检验入库单(单头)详情
- DELETE /api/app/purchase-inbound/{id}/inspection-inbound — 删除检验入库单(暂存状态/SAP接收失败)
- POST /api/app/purchase-inbound/inspection-inbound-pages — 分页查询检验入库单列表
- POST /api/app/purchase-inbound/export-inspection-inbound — 导出检验入库单
- POST /api/app/purchase-inbound/inspection-inbound-detail-pages — 检验入库单明细分页查询
- POST /api/app/purchase-inbound/export-inspection-inbound-detail — 导出检验入库单明细
- POST /api/app/purchase-inbound/inspection-inbound-detail-full-pages — 检验入库单明细分页查询(包含头和明细)
- POST /api/app/purchase-inbound/export-inspection-inbound-detail-full — 导出检验入库单明细(包含头和明细)
- POST /api/app/purchase-inbound/revoke-inspection-inbound-shelving — 检验入库单撤销上架(传Id=整单撤销已上架明细；传DetailIds=撤销选中的明细行)
- POST /api/app/purchase-inbound/{id}/submit-inspection-inbound-to-sap — 检验入库单发送SAP生单
- POST /api/app/purchase-inbound/send-inspection-inbound-posting — 检验入库单发送SAP过账
- POST /api/app/purchase-inbound/send-inspection-inbound-posting-by-queue — 检验入库单异步过账(待过账明细超过300行时使用,每10行一组入队后台队列并行过账)
- POST /api/app/purchase-inbound/send-inspection-inbound-detail-posting-by-queue — 检验入库单明细后台队列过账(按勾选明细行入队,每10行一组并行过账)
- POST /api/app/purchase-inbound/pass-inspection-inbound — 检验入库单明细异步过账(由后台队列Job调用,只过账明细,单头状态在提交后由原子SQL刷新)
<!-- api:end -->
