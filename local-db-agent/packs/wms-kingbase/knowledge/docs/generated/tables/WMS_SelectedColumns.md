# WMS_SelectedColumns 报表选中列

> 由 ABP 源码自动生成
## 用途
报表选中列

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| DataReportConfigId | Guid | 否 | 报表配置ID |
| ColumnName | string | 否 | 列名称 |
| ColumnText | string | 否 | 列文本 |
| ColumnWidth | int? | 是 | 列宽度 |
| ColumnSort | int | 否 | 列排序 |
| ColumnVisible | bool | 否 | 列可见 |

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
- `Id`、`DataReportConfigId`

## 索引字段
- `DataReportConfigId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/database-editor/columns — 获取表所有列
- POST /api/app/database-table/column — 给已有表新增字段，同时创建列注释。 目标表必须以 custom_ 前缀开头。
- POST /api/app/database-table/drop-column — 删除已有表的字段。目标表必须以 custom_ 前缀开头。
<!-- api:end -->
