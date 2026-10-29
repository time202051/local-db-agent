# WMS_CustomTables 自定义表元数据

> 由 ABP 源码自动生成
## 用途
自定义表元数据

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TableName | string | 否 | 表英文编码，不包含ct_前缀 |
| PhysicalTableName | string | 否 | 物理表名，格式为custom.ct_xxx |
| DisplayName | string | 否 | 表中文显示名 |
| Description | string? | 是 | 表描述 |

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
- `TableName`、`PhysicalTableName`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/database-editor/tables — 获取所有表名
- POST /api/app/database-editor/table-data-pages — 获取表数据
- GET /api/app/database-table/table-list — 分页查询自定义表列表，只返回 custom_ 前缀的表
- GET /api/app/database-table/table-detail — 获取数据库表结构详情，包含所有字段信息。 表名必须以 custom_ 前缀开头。
- POST /api/app/database-table/table — 自定义创建数据库表，表名自动拼接 custom_ 前缀，同时创建表注释和列注释。 所有表统一创建在数据库默认 schema 下。
- POST /api/app/database-table/drop-table — 删除数据库表。表名必须以 custom_ 前缀开头，非 custom_ 前缀的表不允许删除。
- GET /api/app/database-table/table-data — 分页查询表数据，支持关键词搜索和字段筛选
- POST /api/app/database-table/table-data — 插入一行数据，自动赋值 Id(GuidV7)、CreationTime、CreatorId
- PUT /api/app/database-table/table-data — 更新一行数据，通过主键 Id 定位行，自动维护 LastModificationTime 和 LastModifierId
- DELETE /api/app/database-table/table-data — 删除一行数据，通过主键 Id 定位行
<!-- api:end -->
