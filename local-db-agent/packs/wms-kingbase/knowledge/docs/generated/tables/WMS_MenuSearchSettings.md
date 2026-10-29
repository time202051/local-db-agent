# WMS_MenuSearchSettings 菜单查询设置

> 由 ABP 源码自动生成
## 用途
菜单查询设置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| SysMenuId | string | 否 | 菜单主键 |
| UserId | Guid | 否 | 用户主键 |
| SettingJson | string | 否 | 配置json |
| DefaultFilterJson | string? | 是 | 默认查询条件json |
| CustomSearch | string? | 是 | 查询方案 |
| AdminDefaultFilterJson | string? | 是 | 系统管理员默认筛选Json |
| IsAdminDefaultFilterJson | bool | 否 | 是否是系统管理员默认筛选Json |

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
- `UserId`、`SysMenuId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/menu-search-setting — 获取分页列表
- POST /api/app/menu-search-setting — 创建
- PUT /api/app/menu-search-setting — 更新
- GET /api/app/menu-search-setting/{id} — 根据ID获取详情
- DELETE /api/app/menu-search-setting/{id} — 删除
- GET /api/app/menu-search-setting/by-menu — 根据用户ID和菜单ID获取搜索设置
- DELETE /api/app/menu-search-setting/by-menu — 根据菜单ID删除当前用户的搜索设置
- GET /api/app/menu-search-setting/default-by-menu — 根据用户ID和菜单ID获取默认搜索设置
- GET /api/app/menu-search-setting/my-settings — 获取当前用户的所有搜索设置
- POST /api/app/menu-search-setting/save-menu-search-setting — 保存搜索条件通用接口
- POST /api/app/menu-search-setting/set-default-filter — 设置默认查询条件
<!-- api:end -->
