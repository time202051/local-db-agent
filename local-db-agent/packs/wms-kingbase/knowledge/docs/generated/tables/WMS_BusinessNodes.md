# WMS_BusinessNodes 业务节点基础资料表

> 由 ABP 源码自动生成
## 用途
业务节点基础资料表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ParentId | Guid? | 是 | 父级业务节点ID；为空表示一级业务节点 |
| Code | string | 否 | 业务节点编码；同一父级下唯一 |
| Name | string | 否 | 业务节点名称 |
| Level | int | 否 | 节点层级：1=业务节点，2=子业务节点 |
| Sort | int | 否 | 排序号；数值越小越靠前 |
| IsEnabled | bool | 否 | 是否启用；停用后默认不进入业务选择树 |
| Remark | string? | 是 | 备注 |

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
- `Id`、`ParentId`

## 索引字段
- `Code`、`ParentId`、`Level`、`IsEnabled`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/business-node/business-node-pages — 分页查询业务节点
- GET /api/app/business-node/business-node-tree — 查询业务节点树
- GET /api/app/business-node/business-node-select — 获取一级业务节点下拉列表
- GET /api/app/business-node/sub-business-node-select/{businessNodeId} — 按一级业务节点获取二级子业务节点下拉列表
- GET /api/app/business-node/{id}/business-node — 根据 ID 获取业务节点详情
- PUT /api/app/business-node/{id}/business-node — 更新业务节点
- DELETE /api/app/business-node/{id}/business-node — 删除业务节点
- POST /api/app/business-node/business-node — 创建业务节点
- POST /api/app/business-node/{id}/set-business-node-enabled — 设置业务节点启停状态
- PUT /api/app/business-node/business-node-config — 更新数据
- POST /api/app/business-node/test-node
- GET /api/app/organization-unit/{id} — 根据Id获取
- PUT /api/app/organization-unit/{id} — 更新部门
- GET /api/app/organization-unit/list — 获取所有部门
- POST /api/app/organization-unit — 创建部门
<!-- api:end -->
