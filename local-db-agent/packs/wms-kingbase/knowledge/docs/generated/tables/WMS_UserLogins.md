# WMS_UserLogins 表示用户的登录名及其关联的提供程序。

> 由 ABP 源码自动生成
## 用途
表示用户的登录名及其关联的提供程序。

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| UserId | Guid | 否 | 获取或设置与此登录名关联的用户的主键。 |
| LoginProvider | string | 否 | 获取或设置登录的登录提供程序（例如facebook、google） |
| ProviderKey | string | 否 | 获取或设置此登录的唯一提供程序标识符。 |
| ProviderDisplayName | string | 否 | 获取或设置此登录的UI中使用的友好名称。 |

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
- GET /api/app/account-user/current-user — 获取当前用户信息
- GET /api/app/account-user/user-organization-unit/{userId}
- POST /api/app/audit-logging/audit-log-pages — 审计日志分页
- POST /api/app/audit-logging/export-audit-log — 审计日志导出
- POST /api/app/audit-logging/api-log-pages — 接口日志分页
- POST /api/app/audit-logging/export-api-log — 接口日志导出
- GET /api/app/identity/edd — 返回私钥
- POST /api/app/identity/login — 登录
- POST /api/app/identity/pda-login-info — PDA获取登录信息
- POST /api/app/identity/import-user-roles — 用户角色导入：读取 Excel 第一个 Sheet，第一列账户(用户名)、第二列姓名(仅核对展示)、第三列角色(多个角色用英文/中文逗号分割)。 按用户名匹配用户、按角色名匹配角色，只补充缺失的用户角色关系（可重复导入）； 某行用户不存在或角色名不存在时该行整体不导入，在返回消息中逐行列出失败原因。
- DELETE /api/app/identity-role/{id}
- GET /api/app/identity-role
- DELETE /api/app/identity-user/{id}
- POST /api/app/identity-user/user-pages — 用户分页查询(动态查询)
- GET /api/app/identity-user — 用户分页查询
- PUT /api/app/identity-user/{id}/roles
- POST /api/app/identity-user/update-pass-word — 更新密码
- POST /api/app/identity-user/reset-password/{userId} — 重置密码
- PUT /api/app/identity-user/identity-user-role-many — 批量新增用户角色(增量模式:入参角色为需要新增的角色,用户已拥有的角色跳过,不删除用户已有角色)
<!-- api:end -->
