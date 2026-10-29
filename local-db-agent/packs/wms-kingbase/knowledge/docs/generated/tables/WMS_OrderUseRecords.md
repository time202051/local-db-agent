# WMS_OrderUseRecords 订单使用记录

> 由 ABP 源码自动生成
## 用途
订单使用记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| SourceBillNo | string | 否 | 来源单号 |
| SourceLineNo | int? | 是 | 来源单行号 |
| PurchaseOrderNo | string? | 是 | 采购订单号 |
| PurchaseOrderLineNo | string? | 是 | 采购订单行号 |
| ProductionOrderId | Guid? | 是 | 生产订单Id |
| ProductionOrderNo | string? | 是 | 生产订单号 |
| Quantity | decimal | 否 | 操作数量(占用:正数 释放:负数) |
| Remark | string? | 是 | 操作备注 |
| OperatorUserId | Guid? | 是 | 操作人Id |
| OperatorUserName | string? | 是 | 操作人姓名 |

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
- `Id`、`TenantId`、`ProductionOrderId`、`OperatorUserId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/purchase-inbound/order-use-record-pages — 分页查询订单使用记录列表
- POST /api/app/purchase-inbound/export-order-use-record — 导出订单使用记录列表
<!-- api:end -->
