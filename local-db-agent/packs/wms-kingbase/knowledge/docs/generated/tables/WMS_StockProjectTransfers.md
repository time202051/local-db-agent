# WMS_StockProjectTransfers 库存项目调拨单

> 由 ABP 源码自动生成
## 用途
库存项目调拨单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TransferNo | string | 否 | 调拨单号 |
| SapBillNo | string? | 是 | SAP调拨单号 |
| TransferStatus | TransferStatusEnum | 否 | 单据状态 |
| Werks | string | 否 | 工厂 |
| BusinessNode | string | 否 | 业务节点 |
| BusinessNodeDesc | string | 否 | 业务节点描述 |
| ApplicationTypeDesc | string | 否 | 申请类型描述 |
| ApplicationType | string | 否 | 申请类型 |
| MovementType | string | 否 | 移动类型 |
| DepartmentOfIssue | string | 否 | 申请部门 |
| DepartmentPerson | string | 否 | 申请人 |
| VoucherDate | DateTime | 否 | 凭证日期 |
| SendSapTime | DateTime? | 是 | 制单日期 |
| PassSapTime | DateTime? | 是 | 过账日期 |
| Remark | string | 否 | 备注 |

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
- `Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/stock-project-transfer/stock-project-transfer-by-id/{entityId} — 根据Id获取项目调拨单
- POST /api/app/stock-project-transfer/stock-project-transfer-pages — 调拨单分页查询
- POST /api/app/stock-project-transfer/export-stock-project-transfer — 项目间调拨单导出
- POST /api/app/stock-project-transfer/stock-project-transfer — 创建调拨单
- PUT /api/app/stock-project-transfer/stock-project-transfer/{stockTransferId} — 更新调拨单
- DELETE /api/app/stock-project-transfer/d-stock-project-transfer/{stockTransferId} — 删除项目间/物料调拨
- POST /api/app/stock-project-transfer/send-stock-project-transfer/{stockTransferId} — 单据推送SAP
- POST /api/app/stock-project-transfer/pass-stock-project-transfer — 过账推送SAP
<!-- api:end -->
