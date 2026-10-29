# WMS_CustomTableFields 自定义表字段元数据

> 由 ABP 源码自动生成
## 用途
自定义表字段元数据

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| CustomTableId | Guid | 否 | 所属自定义表Id |
| FieldName | string | 否 | 字段英文编码 |
| DisplayName | string | 否 | 字段中文显示名 |
| DataType | CustomTableFieldDataType | 否 | 字段数据库类型 |
| ControlType | CustomTableFieldControlType | 否 | 字段控件类型 |
| IsRequired | bool | 否 | 是否必填 |
| IsUnique | bool | 否 | 是否唯一 |
| Length | int? | 是 | 字段长度 |
| Precision | int? | 是 | 小数位数 |
| DefaultValue | string? | 是 | 默认值 |
| OptionsJson | string? | 是 | 下拉选项JSON |
| Sort | int | 否 | 排序号 |
| IsEnabled | bool | 否 | 是否启用 |
| Description | string? | 是 | 字段描述 |

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
- `Id`、`CustomTableId`

## 索引字段
- `CustomTableId`、`FieldName`、`Sort`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
