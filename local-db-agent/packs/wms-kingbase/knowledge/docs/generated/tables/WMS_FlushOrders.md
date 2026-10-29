# WMS_FlushOrders

> 由 ABP 源码自动生成
## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| BillNo | string | 否 | 订单号 |
| LineId | int | 否 | 行号 |
| BillNoYear | int | 否 | 订单年度 |
| CreateUser | string | 否 | 创建人 |
| PostingTime | DateTime? | 是 | SAP过账日期 |
| ZatType | ZatTypeEnum | 否 | 操作类型 |
| ZatTypeDesc | string | 否 | 操作类型描述 |
| ProductId | Guid? | 是 | <summary> 产品Id |
| ItemModel | string | 否 | 物料规格 |
| BatchNo | string | 否 | 物料批次 |
| Qty | decimal | 否 | 数量 |
| FlushQty | decimal | 否 | 冲销数量 |
| OrginalBillNo | string | 否 | 冲销原单 |
| OrginalBillNoYear | int | 否 | 冲销原单年度 |
| OrginalLineId | int | 否 | 冲销原单行号 |
| IsCreate | bool | 否 | 是否创建单据 |
| IsFinish | bool | 否 | 是否结束 |
| IsDealWith | bool | 否 | 是否被线程处理 |

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
- `Id`、`TenantId`、`LineId`、`ProductId`、`OrginalLineId`

## 索引字段
- `ProductId`、`IsFinish`、`IsDealWith`、`IsCreate`

## 关系
- WMS_Products（1:N）：`WMS_FlushOrders.ProductId = WMS_Products.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
