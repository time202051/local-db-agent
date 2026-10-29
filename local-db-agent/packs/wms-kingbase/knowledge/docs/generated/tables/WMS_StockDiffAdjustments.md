# WMS_StockDiffAdjustments 盘点差异调整单

> 由 ABP 源码自动生成
## 用途
盘点差异调整单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| BillNo | string | 否 | 盘点调整单号 |
| SapBillNo | string | 否 | SAP盘点调整单号 |
| StockDiffAdjustmentType | StockDiffAdjustmentTypeEnum | 否 | 调整类型 |
| State | StockDiffAdjustmentStateEnum | 否 | 单据状态 |
| OwnerCode | string | 否 | 工厂 |
| OwnerName | string | 否 | 工厂名称 |
| BusinessNode | string | 否 | 业务节点 |
| BusinessNodeDesc | string? | 是 | 业务节点描述 |
| ApplicationType | string | 否 | 申请类型 |
| ApplicationTypeDesc | string? | 是 | 申请类型描述 |
| MovementType | string | 否 | 移动类型 |
| DepartmentPerson | string | 否 | 申请人 |
| DepartmentOfIssue | string | 否 | 申请部门 |
| VoucherDate | DateTime | 否 | 凭证日期 |
| Mblnr | string? | 是 | 凭证号 |
| Remark | string? | 是 | 备注 |
| SendSapTime | DateTime? | 是 | 制单日期 |
| PassSapTime | DateTime? | 是 | 过账日期 |

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
- POST /api/app/i-lT/batch-adjust-count-diff — 【盘点差异调整】批量手动调整盘点差异（按实盘数量修正库存） 仅允许对已完成且存在差异、未调整过的盘点单执行
- POST /api/app/stock-diff-adjustment/select-stock-diff-adjustment-page — 获取可生成调整单的盘点单分页（支持动态查询） 条件：已完成盘点、存在未调整差异、差异类型与入参一致(过滤已经生成调整单的盘点单)
- POST /api/app/stock-diff-adjustment/stock-diff-adjustment-page — 盘点差异调整单分页
- GET /api/app/stock-diff-adjustment/stock-diff-adjustment/{stockDiffAdjustmentId} — 获取盘点差异调整单(单头)数据信息
- POST /api/app/stock-diff-adjustment/export-stock-diff-adjustment — 盘点差异调整单导出
- POST /api/app/stock-diff-adjustment/export-stock-diff-adjustment-full — 盘点差异调整单(包含头+明细)导出
- POST /api/app/stock-diff-adjustment — 创建盘点差异调整单
- DELETE /api/app/stock-diff-adjustment — 批量删除盘点差异调整单
- PUT /api/app/stock-diff-adjustment/{id} — 更新盘点差异调整单
- POST /api/app/stock-diff-adjustment/send-to-sap — 批量推送SAP生单
- POST /api/app/stock-diff-adjustment/pass-to-sap — 批量推送SAP过账
- POST /api/app/stock-diff-adjustment/manual-pass — 批量手工过账（不调用SAP，直接调整库存）
<!-- api:end -->
