# WMS_TemplateConfigDefaultValues 模板配置默认值

> 由 ABP 源码自动生成
## 用途
模板配置默认值

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TemplateConfigId | Guid | 否 | 模板配置Id |
| DefaultValueName | string | 否 | 默认值名称 |
| DefaultValueJson | string | 否 | 默认值JSON |

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

## 关系
- WMS_TemplateConfigs（1:N）：`WMS_TemplateConfigDefaultValues.TemplateConfigId = WMS_TemplateConfigs.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/cache-admin/cache-value — 查看指定 key 的缓存值（缓存经 JsonNewtonsoft 序列化为 UTF-8 JSON，此处读原始字节并解析回传）
- POST /api/app/template-config/template-config-default-value-pages — 分页查询模板配置默认值列表
- POST /api/app/template-config/export-template-config-default-value — 库存调拨信息导出
- GET /api/app/template-config/{id}/default-value — 根据Id获取模板配置默认值详情
- PUT /api/app/template-config/{id}/default-value — 更新模板配置默认值
- DELETE /api/app/template-config/{id}/default-value — 删除模板配置默认值
- POST /api/app/template-config/default-value — 创建模板配置默认值
- GET /api/app/tenant/{id}/default-connection-string
- PUT /api/app/tenant/{id}/default-connection-string
- DELETE /api/app/tenant/{id}/default-connection-string
- POST /api/app/test-back/test-default-info — 初始化虚拟托盘与库位
- GET /api/app/web-system/key-value-list
<!-- api:end -->
