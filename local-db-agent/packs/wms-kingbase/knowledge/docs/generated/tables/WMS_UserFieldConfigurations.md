# WMS_UserFieldConfigurations 用户字段配置表

> 由 ABP 源码自动生成
## 用途
用户字段配置表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| UserId | Guid | 否 | 用户ID |
| PageKey | string | 否 | 页面/模块标识（如：StockIn、StockOut等） |
| SysMenuId | string | 否 | 菜单Id/组合菜单Id |
| FieldConfigJson | string | 否 | 字段配置JSON（存储字段名称和显示顺序） |

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
- `Id`、`TenantId`、`UserId`、`SysMenuId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/user-field-config/save-config — 保存字段配置
- GET /api/app/user-field-config/config — 获取字段配置
- GET /api/app/user-field-config/admin-config — 获取字段配置
- POST /api/app/user-field-config/reset-config — 重置为默认配置（删除用户自定义配置）
<!-- api:end -->
