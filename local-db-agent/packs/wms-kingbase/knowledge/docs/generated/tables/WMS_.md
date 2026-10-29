# WMS_ 查询方案

> 由 ABP 源码自动生成
## 用途
查询方案

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| SysMenuId | string | 否 | 菜单主键 |
| UserId | Guid | 否 | 用户主键 |
| SchemeName | string | 否 | 方案名称 |
| IsDefault | bool | 否 | 是否默认方案 |
| FilterJson | string | 否 | 查询条件JSON |

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
- `Id`、`SysMenuId`、`UserId`

## 索引字段
- `UserId`、`SysMenuId`、`IsDefault`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/search-scheme — 获取查询方案
- POST /api/app/search-scheme — 创建
- GET /api/app/search-scheme/default/{sysMenuId} — 获取默认查询方案
- POST /api/app/search-scheme/{id}/set-default — 设置默认方案
- POST /api/app/search-scheme/{id}/cancel-default — 取消设置默认方案
- PUT /api/app/search-scheme/{id} — 更新
- DELETE /api/app/search-scheme/{id} — 删除
<!-- api:end -->
