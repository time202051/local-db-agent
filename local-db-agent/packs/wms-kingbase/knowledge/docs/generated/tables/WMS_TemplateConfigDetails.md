# WMS_TemplateConfigDetails 模板配置明细

> 由 ABP 源码自动生成
## 用途
模板配置明细

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TemplateConfigId | Guid | 否 | 模板配置Id |
| ControlName | string | 否 | 控件名 |
| ControlValue | string | 否 | 控件值 |
| ControlType | string | 否 | 控件类型 |
| EnumName | string | 否 | 控件枚举名称 |
| DataType | string | 否 | 控件数据类型 |

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
- `Id`、`TemplateConfigId`

## 索引字段
- `TemplateConfigId`、`ControlName`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
