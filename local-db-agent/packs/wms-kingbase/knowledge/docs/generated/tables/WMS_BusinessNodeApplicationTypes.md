# WMS_BusinessNodeApplicationTypes 业务节点申请类型表

> 由 ABP 源码自动生成
## 用途
业务节点申请类型表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| SubBusinessNodeId | Guid | 否 | 所属二级子业务节点ID |
| Code | string | 否 | 申请类型编码；同一二级子业务节点下唯一 |
| Description | string | 否 | 申请类型描述 |
| MovementType | string | 否 | 移动类型 |
| ProductStock | string? | 是 | 物料库存 |
| Sort | int | 否 | 排序号；数值越小越靠前 |
| IsEnabled | bool | 否 | 是否启用；停用后默认不进入业务选择 |
| Remark | string? | 是 | 备注 |
| businessNodeConfig | BusinessNodeConfig? | 是 | 支持可空 |

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
- `Id`、`SubBusinessNodeId`

## 索引字段
- `SubBusinessNodeId`、`Code`、`IsEnabled`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/abp/application-configuration
- GET /api/abp/application-localization
- GET /api/app/business-node/business-node-application-type-select/{subBusinessNodeId} — 按二级子业务节点获取申请类型下拉列表
- GET /api/app/business-node/application-type-select-by-first-node/{businessNodeId} — 根据一级业务节点获取申请类型下拉列表
- POST /api/app/business-node/business-node-application-type-pages — 分页查询业务节点申请类型
- GET /api/app/business-node/{id}/business-node-application-type — 根据 ID 获取业务节点申请类型详情
- PUT /api/app/business-node/{id}/business-node-application-type — 更新业务节点申请类型
- DELETE /api/app/business-node/{id}/business-node-application-type — 删除业务节点申请类型
- POST /api/app/business-node/business-node-application-type — 创建业务节点申请类型
- POST /api/app/business-node/{id}/set-business-node-application-type-enabled — 设置业务节点申请类型启停状态
- GET /api/app/database-table/data-type-select — 数据类型下拉
<!-- api:end -->
