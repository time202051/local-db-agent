# WMS_HomePublicNotices 首页公示表

> 由 ABP 源码自动生成
## 用途
首页公示表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Title | string | 否 | 公示标题 |
| Content | string | 否 | 公示内容 |

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
- POST /api/app/home-public-notice/home-public-notice-pages — 公示分页查询
- GET /api/app/home-public-notice/{id} — 获取公示详情
- PUT /api/app/home-public-notice/{id} — 更新公示（只能修改自己创建的公示）
- DELETE /api/app/home-public-notice/{id} — 删除公示
- POST /api/app/home-public-notice — 创建公示
<!-- api:end -->
