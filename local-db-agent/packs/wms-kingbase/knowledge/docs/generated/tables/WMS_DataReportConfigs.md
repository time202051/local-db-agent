# WMS_DataReportConfigs 数据报表配置

> 由 ABP 源码自动生成
## 用途
数据报表配置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ReportCode | string | 否 | 报表编码 |
| ReportName | string | 否 | 报表名称 |
| QuerySql | string | 否 | 查询SQL |

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
- `ReportCode`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/data-report/db-type-select — 获取数据类型下拉
- POST /api/app/data-report/data-report-config-pages — 数据报表配置分页查询
- GET /api/app/data-report/data-report-config — 获取数据报表配置列表
- PUT /api/app/data-report/role-report-list/{roleId} — 更新角色相关报表列表
- POST /api/app/data-report — 创建数据报表配置
- PUT /api/app/data-report/{id} — 编辑数据报表配置
- DELETE /api/app/data-report/{id} — 删除数据报表配置
- POST /api/app/data-report/data-report-pages — 数据报表执行分页查询
- POST /api/app/data-report/export-data-report — 数据报表执行导出
- POST /api/app/pda-purchase-inbound/report-checking-abnormal — PDA扫码清点 - 异常提报
<!-- api:end -->
