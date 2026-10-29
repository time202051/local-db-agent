# WMS_HomeWarehouseInfos 首页库房信息表

> 由 ABP 源码自动生成
## 用途
首页库房信息表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Content | string | 否 | 库房信息内容 |
| EndTime | DateTime | 否 | 结束时间 |

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
- POST /api/app/home-warehouse-info/home-warehouse-info-pages — 库房信息分页查询
- GET /api/app/home-warehouse-info/{id} — 获取库房信息详情
- PUT /api/app/home-warehouse-info/{id} — 更新库房信息
- DELETE /api/app/home-warehouse-info/{id} — 删除库房信息
- POST /api/app/home-warehouse-info — 创建库房信息
<!-- api:end -->
