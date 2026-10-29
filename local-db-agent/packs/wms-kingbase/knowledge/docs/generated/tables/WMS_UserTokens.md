# WMS_UserTokens Represents an authentication token for a user.

> 由 ABP 源码自动生成
## 用途
Represents an authentication token for a user.

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| UserId | Guid | 否 | Gets or sets the primary key of the user that the token belongs to. |
| LoginProvider | string | 否 | Gets or sets the LoginProvider this token is from. |
| Name | string | 否 | Gets or sets the name of the token. |
| Value | string | 否 | Gets or sets the token value. |

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
- `Id`、`TenantId`、`UserId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/identity-role/{id}
- PUT /api/app/identity-role/{id}
- POST /api/app/identity-role
- GET /api/app/identity-user/{id}
- PUT /api/app/identity-user/{id}
- POST /api/app/identity-user
- GET /api/app/identity-user/{id}/roles
- GET /api/app/identity-user/assignable-roles — 查询可用角色
- POST /api/app/identity-user/find-by-username
- POST /api/app/identity-user/find-by-email
- GET /api/app/identity-user/currenct-user-select — 获取当前登录用户下拉
<!-- api:end -->
