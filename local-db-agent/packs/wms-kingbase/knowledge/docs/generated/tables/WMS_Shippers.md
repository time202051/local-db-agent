# WMS_Shippers 出货方

> 由 ABP 源码自动生成
## 用途
出货方

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ShipperType | ShipperTypeEnum | 否 | 出货方类型 |
| ShipperCode | string | 否 | 出货方编码 |
| ShipperName | string | 否 | 出货方名称 |
| ShipperSimpleName | string | 否 | 出货方简称 |
| FixedShippingPort | string | 否 | 固定发货口编码 |
| OrgId | Guid? | 是 | 公司ID |
| IsTurnoverNox | bool | 否 | 周转箱 |
| ContactsOne | string | 否 | 联系人1 |
| TelephoneOne | string | 否 | 联系电话1 |
| ContactsTwo | string | 否 | 联系人2 |
| TelephoneTwo | string | 否 | 联系电话2 |
| Address | string | 否 | 地址 |
| Longitude | decimal | 否 | 经度 |
| Latitude | decimal | 否 | 纬度 |
| Enabled | bool | 否 | 状态 |
| Language | string | 否 | 语言 |
| Remark | string | 否 | 备注 |
| CreatedUser | string | 否 | 创建人 |
| DistributeLine | string | 否 | 线路 |

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
- `ShipperCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/warehouse/shipper — 创建出货方
- POST /api/app/warehouse/export-shipper — 出货方信息导出
- DELETE /api/app/warehouse/shipper/{shipperId} — 删除出货方信息
- PUT /api/app/warehouse/shipper/{shipperId} — 编辑出货方信息
- POST /api/app/warehouse/shipper-list — 获取出货方分页数据信息（支持动态查询）
- GET /api/app/warehouse/shipper-select — 获取出货方下拉框数据
- GET /api/app/warehouse/shipper-type-select — 获取出货方下拉框数据
- GET /api/app/warehouse/shipper-by-id/{shipperId} — 根据ID获取单条数据
<!-- api:end -->
