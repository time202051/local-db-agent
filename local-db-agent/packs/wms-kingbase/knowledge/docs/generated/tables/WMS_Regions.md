# WMS_Regions 区域

> 由 ABP 源码自动生成
## 用途
区域

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| WarehouseId | Guid? | 是 | 仓库ID |
| RegionCode | string | 否 | 区域编码 |
| RegionName | string | 否 | 区域名称 |
| RegionAttributes | RegionTypeEnum | 否 | 区域属性 |
| Enabled | bool | 否 | 启用状态 |
| CreatedUser | string | 否 | 创建人 |
| Remark | string | 否 | 备注 |

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
- `Id`、`TenantId`、`WarehouseId`

## 索引字段
- `RegionCode`

## 关系
- WMS_Warehouses（1:N）：`WMS_Regions.WarehouseId = WMS_Warehouses.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/region-container-type/regions-by-container-type-id — 获取全部平库/立体库区域并标记该容器类型已准入/默认的项（用于容器类型配置弹窗）； containerTypeId 不传时返回全部区域且均未选（用于新增容器类型）
- POST /api/app/warehouse/export-region — 区域信息导出
- GET /api/app/warehouse/region-select — 获取区域下拉框数据
- GET /api/app/warehouse/agv-region-select — 获取AGV区域下拉框
- GET /api/app/warehouse/region-type-select — · 获取区域下拉框数据-根据所属区域属性
- GET /api/app/warehouse/region-pda-business-select — 获取pda业务下拉框
- GET /api/app/warehouse/region-enum-select — 获取区域属性下拉框数据
- POST /api/app/warehouse/region-list — 获取区域分页数据信息（支持动态查询）
- POST /api/app/warehouse/region — 创建区域
- PUT /api/app/warehouse/region/{regionId} — 编辑区域信息
- DELETE /api/app/warehouse/region/{regionId} — 删除区域信息
- GET /api/app/warehouse/region-by-id/{regionId} — 根据ID获取单条数据
<!-- api:end -->
