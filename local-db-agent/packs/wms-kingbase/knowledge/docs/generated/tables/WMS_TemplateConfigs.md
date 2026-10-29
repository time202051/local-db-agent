# WMS_TemplateConfigs 模板配置

> 由 ABP 源码自动生成
## 用途
模板配置

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ParentTemplateId | Guid? | 是 | 父模板Id |
| TemplateName | string | 否 | 模板名称 |

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
- `Id`、`ParentTemplateId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/template-config/template-config-pages — 分页查询模板配置列表
- GET /api/app/template-config/{id} — 根据Id获取模板配置详情
- PUT /api/app/template-config/{id} — 更新模板配置
- DELETE /api/app/template-config/{id} — 删除模板配置
- GET /api/app/template-config/item-template-configs/{parentTemplateId} — 根据父模板配置Id获取所有子明细模板配置列表
- POST /api/app/template-config — 创建模板配置
<!-- api:end -->
