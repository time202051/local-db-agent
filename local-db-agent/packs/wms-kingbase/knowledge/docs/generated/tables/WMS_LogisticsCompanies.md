# WMS_LogisticsCompanies 物流公司

> 由 ABP 源码自动生成
## 用途
物流公司

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| LogisticsCompanyCode | string | 否 | 物流公司编码 |
| LogisticsCompanyName | string | 否 | 物流公司名称 |
| LogisticsCompanyType | string? | 是 | 物流公司类型 |
| TransportScope | string? | 是 | 运输范围 |
| TransportQualification | string? | 是 | 运输资质 |
| Enabled | bool | 否 | 状态 |
| CreatedUser | string | 否 | 创建人 |
| Remark | string? | 是 | 备注 |

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

## 索引字段
- `LogisticsCompanyCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/warehouse/logistics-company — 创建物流公司
- DELETE /api/app/warehouse/logistics-company/{logisticsCompanyId} — 删除物流公司信息
- PUT /api/app/warehouse/logistics-company/{logisticsCompanyId} — 编辑物流公司信息
- POST /api/app/warehouse/logistics-company-list — 获取物流公司分页数据信息（支持动态查询）
- POST /api/app/warehouse/export-logistics-company — 物流公司导出
- GET /api/app/warehouse/logistics-company-select — 获取物流公司下拉框数据
- GET /api/app/warehouse/logistics-company-by-id/{logisticsCompanyId} — 根据ID获取单条物流公司数据
<!-- api:end -->
