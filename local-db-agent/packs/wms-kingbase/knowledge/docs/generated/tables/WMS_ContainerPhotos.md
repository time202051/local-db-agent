# WMS_ContainerPhotos 容器图片

> 由 ABP 源码自动生成
## 用途
容器图片

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ImgSavePath | string? | 是 | 图片保存路径 |
| SLImg1 | string? | 是 | 图片1 |
| SLImg2 | string? | 是 | 图片2 |
| SLImg3 | string? | 是 | 图片3 |
| SLImg4 | string? | 是 | 图片4 |
| SLImg5 | string? | 是 | 图片5 |
| SLImg6 | string? | 是 | 图片6 |
| SLImg7 | string? | 是 | 图片7 |
| SLImg8 | string? | 是 | 图片8 |
| SLImg9 | string? | 是 | 图片9 |
| SLImg10 | string? | 是 | 图片10 |

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
- `Id`、`TenantId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
