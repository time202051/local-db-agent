# WMS_ProductRegulars 物料正则表达式

> 由 ABP 源码自动生成
## 用途
物料正则表达式

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ProductType | ProductClassTypeEnum | 否 | 物料大类 |
| ProductName | string | 否 | 用途名称 |
| Regular | string | 否 | 正则表达式 |
| Priority | int | 否 | 优先级 |

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
- GET /api/app/product/product-regular-pages — 获取工厂分页数据信息
- POST /api/app/product/product-regular — 新增零件正则表达式
- PUT /api/app/product/product-regular — 更新零件正则表达式
- DELETE /api/app/product/product-regular/{productRegularId} — 删除零件正则表达式
<!-- api:end -->
