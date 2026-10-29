# WMS_BillTypes 单据类型

> 由 ABP 源码自动生成
## 用途
单据类型

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| BillTypeCode | string | 否 | 编码 |
| BillTypeName | string | 否 | 描述 |
| BillCategory | BillCategoryEnum | 否 | 策略 |

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

## 索引字段
- `BillTypeCode`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/bill-type/bill-type-pages — 单据类型分页查询
- POST /api/app/bill-type/export-bill-type — 单据类型导出
- POST /api/app/bill-type/bill-type — 创建单据类型
- DELETE /api/app/bill-type/bill-type/{billTypeId} — 删除单据类型
- PUT /api/app/bill-type/bill-type/{billTypeId} — 更新单据类型
<!-- api:end -->
