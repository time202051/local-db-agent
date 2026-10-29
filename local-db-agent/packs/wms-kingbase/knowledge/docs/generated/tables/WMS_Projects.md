# WMS_Projects SAP项目

> 由 ABP 源码自动生成
## 用途
SAP项目

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Mandt | string | 否 | 集团 |
| Objnr | string | 否 | 对象号 |
| Stat | string | 否 | 对象状态 |
| Spras | string | 否 | 语言代码 |
| Inact | string | 否 | 指示符 |
| Pspnr | string | 否 | 项目号 |
| Post1 | string | 否 | 项目描述 |
| Vkokr | string | 否 | 控制范围 |
| Vbukr | string | 否 | 公司代码 |
| Werks | string | 否 | 工厂 |
| Plfaz | string | 否 | 计划开始日期 |
| Plsez | string | 否 | 计划完成日期 |
| Erdatis | DateTime? | 是 | 记录建立日期 |
| Aedat | DateTime? | 是 | 最后更改日期 |
| Txt04 | string | 否 | 单个状态 |
| Txt30 | string | 否 | 状态 |
| Pspid | string | 否 | 项目定义 |

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
- POST /api/app/data-sync/sync-project — 同步项目数据
- POST /api/app/project/project-pages — 字典数据分页查询
- POST /api/app/project/export-project — 项目导出
- POST /api/app/project/project — 创建项目
- DELETE /api/app/project/project/{projectId} — 删除项目
- PUT /api/app/project/project/{projectId} — 更新项目
- GET /api/app/warehouse/project-select — 项目下拉
<!-- api:end -->
