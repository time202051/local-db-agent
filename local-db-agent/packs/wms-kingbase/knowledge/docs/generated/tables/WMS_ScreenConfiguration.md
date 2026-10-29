# WMS_ScreenConfiguration 大屏配置信息

> 由 ABP 源码自动生成
## 用途
大屏配置信息

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Identifying | string | 否 | 大屏唯一标识 |
| ServiceType | ScreenServiceTypeEnum | 否 | 服务类别 |
| ServiceName | string | 否 | 服务名称 |
| ClientService | string | 否 | 客户端服务（前端配置的大屏页面） |
| ExternalIdentifying | string | 否 | 外部标识 |
| Expiration | int | 否 | 数据缓存过期时间（分钟） |

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
- GET /api/app/screen — 获取所有大屏信息
- POST /api/app/screen — 创建大屏配置
- GET /api/app/screen/config-all — 获取所有大屏配置信息
- GET /api/app/screen/screen-service — 获取大屏服务信息
- PUT /api/app/screen/{id} — 编辑大屏配置
<!-- api:end -->
