# WMS_HomeTodos 首页待办表

> 由 ABP 源码自动生成
## 用途
首页待办表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Title | string | 否 | 待办标题 |
| Content | string | 否 | 待办内容 |
| Priority | TodoPriorityEnum | 否 | 待办优先级 |
| IsCompleted | bool | 否 | 是否已办 |
| CompletionTime | DateTime? | 是 | 处理/办理时间 |
| TodoDate | DateTime | 否 | 待办所属日期 |

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
- POST /api/app/home-todo/home-todo-pages — 待办分页查询（排序：等级升序 > 待办所属日期升序 > 待办创建日期）
- GET /api/app/home-todo/{id} — 获取待办详情
- PUT /api/app/home-todo/{id} — 更新待办
- DELETE /api/app/home-todo/{id} — 删除待办
- POST /api/app/home-todo — 创建待办
<!-- api:end -->
