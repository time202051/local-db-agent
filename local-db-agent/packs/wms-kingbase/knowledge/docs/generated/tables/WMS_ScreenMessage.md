# WMS_ScreenMessage 大屏消息

> 由 ABP 源码自动生成
## 用途
大屏消息

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Identifying | string | 否 | 大屏唯一标识 |
| Title | string | 否 | 标题 |
| IsError | bool | 否 | 是否是异常消息 |

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
- DELETE /api/app/screen/{id} — 删除大屏配置
- POST /api/app/screen/write-screen-message — 写入大屏数据
- GET /api/app/screen/screen-message — 获取大屏数据
- GET /api/dashboard/screen — 检验作业监控大屏
<!-- api:end -->
