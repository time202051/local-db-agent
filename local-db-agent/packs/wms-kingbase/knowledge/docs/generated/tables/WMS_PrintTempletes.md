# WMS_PrintTempletes 打印模板

> 由 ABP 源码自动生成
## 用途
打印模板

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| MenuId | Guid | 否 | 菜单ID |
| TempleteJson | string | 否 | 模板JSON |
| TempleteName | string | 否 | 模板名称 |
| SourceUrl | string | 否 | 数据源地址 |
| SourceType | SourceTypeEnum | 否 | 数据源方式 |
| Remark | string | 否 | 备注 |

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
- `Id`、`TenantId`、`MenuId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
