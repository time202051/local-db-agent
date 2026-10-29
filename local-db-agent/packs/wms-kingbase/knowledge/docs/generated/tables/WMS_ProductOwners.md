# WMS_ProductOwners 物料工厂

> 由 ABP 源码自动生成
## 用途
物料工厂

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ProductId | Guid | 否 | 物料ID |
| OwnerId | Guid | 否 | 工厂ID |
| IsBatch | bool | 否 | 批次管理 |

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
- `Id`、`ProductId`、`OwnerId`

## 关系
- WMS_Products（1:N）：`WMS_ProductOwners.ProductId = WMS_Products.Id`
- WMS_Owners（1:N）：`WMS_ProductOwners.OwnerId = WMS_Owners.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/product/product-owner-pages — 物料工厂分页查询
- POST /api/app/product/product-owner — 创建物料工厂
- PUT /api/app/product/product-owner/{productOwnerId} — 编辑物料工厂
- DELETE /api/app/product/product-owner/{productOwnerId} — 删除物料工厂
<!-- api:end -->
