# WMS_Menus 菜单

> 由 ABP 源码自动生成
## 用途
菜单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ParentId | Guid? | 是 | 父级Id. <see cref="WebMenu"/> 如果此Menu是根，则为Null。 |
| Code | string | 否 | 此菜单的层次代码。 示例: "00001.00042.00005"。 这是Menu的唯一代码。 如果Menu层次结构发生更改，则它是可变的。 |
| DisplayName | string | 否 | 显示此菜单的名称。 |
| Jump | string? | 是 | 此菜单的资源路径 如果有子菜单且不是按钮，则可以为空 |
| Icon | string? | 是 | 此菜单的Icon标记 |
| Sort | int | 否 | 此菜单的排序值 |
| Type | WebMenuType | 否 | 此菜单的类型 |
| IsSystem | bool | 否 | 此菜单是系统菜单 如果是系统菜单，禁止删除 |
| SystemId | Guid? | 是 | 此菜单所属的系统模块 |
| IsEnabled | bool | 否 | 已启用 |
| TemplateConfigDefaultValueId | Guid? | 是 | 模板默认值Id |
| IsHide | bool | 否 | 是否隐藏 |

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
- `Id`、`ParentId`、`SystemId`、`TemplateConfigDefaultValueId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/web-menu/{id}
- PUT /api/app/web-menu/{id}
- DELETE /api/app/web-menu/{id}
- GET /api/app/web-menu/by-display-name/{SystemId}
- GET /api/app/web-menu/button-list
- GET /api/app/web-menu/list
- GET /api/app/web-menu/list-tree/{systemId}
- GET /api/app/web-menu
- POST /api/app/web-menu
- GET /api/app/web-menu/list-tree
- POST /api/app/web-menu/many-create
- POST /api/app/web-menu/copy-buttons
- POST /api/app/web-menu/batch-update-sort
- POST /api/app/web-menu/init-borwer-button
- PUT /api/app/web-menu-permission
- GET /api/app/web-menu-permission/menus-tree-all
- GET /api/app/web-menu-permission/current-menus-tree
- GET /api/app/web-system/{id}
- PUT /api/app/web-system/{id}
- GET /api/app/web-system/find-by-code
<!-- api:end -->
