# WMS_Grades 等级

> 由 ABP 源码自动生成
## 用途
等级

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| GradeCode | string | 否 | 等级编码 |
| GradeName | string | 否 | 等级名称 |
| Priority | int | 否 | 优先级 |
| Enabled | bool | 否 | 状态 |
| Remark | string | 否 | 备注 |
| CreatedUser | string | 否 | 创建人 |

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

<!-- api:start -->
## 相关接口
- POST /api/app/warehouse/grade — 创建等级
- POST /api/app/warehouse/export-grade — 等级信息导出
- DELETE /api/app/warehouse/grade/{gradeId} — 删除等级信息
- PUT /api/app/warehouse/grade/{gradeId} — 编辑等级信息
- POST /api/app/warehouse/grade-list — 获取等级分页数据信息（支持动态查询）
- GET /api/app/warehouse/grade-select — 获取等级下拉框数据
- GET /api/app/warehouse/grade-by-id/{gradeId} — 根据ID获取单条数据
<!-- api:end -->
