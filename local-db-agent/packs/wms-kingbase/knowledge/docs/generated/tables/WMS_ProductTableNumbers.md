# WMS_ProductTableNumbers 台份

> 由 ABP 源码自动生成
## 用途
台份

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TableNumber | string | 否 | 台份 |
| TableNumberStage | string | 否 | 台份阶段 |
| Airworthiness | bool | 否 | 是否适航批 |
| CreateUser | string | 否 | 创建人 |

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
- `TableNumber`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/public-enum/enums — 获取所有枚举信息
<!-- api:end -->
