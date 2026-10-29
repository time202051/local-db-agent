# WMS_PrintConfigs 打印配置

> 由 ABP 源码自动生成
## 用途
打印配置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| PrintDevName | string | 否 | 打印设备名称 |
| SetUserId | Guid | 否 | 配置人ID |
| SetUserName | string | 否 | 配置人名称 |

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
- `Id`、`TenantId`、`SetUserId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/config/item-code-print-url-a — 获取打印单件码地址（拼接单件码系统单点登录+跳转地址） loginName 取应用进程运行的域账户用户名；类型 in=入库(billno)、out=出库(outbillno) 系统地址从配置读取：ItemCodePrint:LoginBaseUrl / ItemCodePrint:RedirectBaseUrl
- GET /api/app/config/item-code-print-url-p — 获取打印单件码地址（拼接单件码系统单点登录+跳转地址） loginName 取应用进程运行的域账户用户名；类型 in=入库(billno)、out=出库(outbillno) 系统地址从配置读取：ItemCodePrint:LoginBaseUrl / ItemCodePrint:RedirectBaseUrl
<!-- api:end -->
