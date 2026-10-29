# WMS_ApiInterfaceConfigs

> 由 ABP 源码自动生成
## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| InterfaceName | string | 否 | 接口名称 |
| Environment | string | 否 | 接口环境 |
| InterfaceType | InterfaceTypeEnum | 否 | 接口类型 |
| EndpointUrl | string | 否 | 接口地址 |
| MethodName | string | 否 | 方法名 |
| AuthType | AuthTypeEnum | 否 | 认证类型 |
| Username | string | 否 | 用户名 |
| Password | string | 否 | 密码 |
| TimeoutSeconds | int | 否 | 超时时间 |
| Remark | string | 否 | 备注 |

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
- `InterfaceName`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/config/windows-account-info — 获取当前应用所在机器的 Windows 域账户信息（应用进程运行的账户，如 域\用户名）
- GET /api/app/config/hangfire-executor-config — 获取后台任务执行机配置（数据库单行；MachineName 为空表示不限制）
- PUT /api/app/config/hangfire-executor-config — 设置后台任务执行机（单行配置；改动需重启应用生效，MachineName 传空表示不限制）
<!-- api:end -->
