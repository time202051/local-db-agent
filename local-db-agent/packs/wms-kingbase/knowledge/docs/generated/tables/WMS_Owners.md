# WMS_Owners 工厂

> 由 ABP 源码自动生成
## 用途
工厂

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| OwnerCode | string | 否 | 工厂 |
| OwnerName | string | 否 | 工厂名称 |
| IsDefault | bool | 否 | 是否默认 |
| Enabled | bool | 否 | 是否启用 |
| OrgId | Guid? | 是 | 公司ID |
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
- `Id`、`TenantId`、`OrgId`

## 索引字段
- `OwnerCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/product/owner — 创建工厂
- POST /api/app/product/export-owner — 工厂信息导出
- DELETE /api/app/product/owner/{ownerId} — 删除工厂信息
- PUT /api/app/product/owner/{ownerId} — 编辑工厂信息
- GET /api/app/product/owner-pages — 获取工厂分页数据信息
- GET /api/app/product/owner-select — 获取工厂下拉框数据
- GET /api/app/product/owner-select-by-code — 获取工厂下拉框数据(编码)
- GET /api/app/product/owner-by-id/{ownerId} — 根据ID获取单条数据
<!-- api:end -->
