# WMS_Stagings 工作台

> 由 ABP 源码自动生成
## 用途
工作台

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| StagingCode | string | 否 | 立体柜编码 |
| StagingName | string | 否 | 立体柜名称 |
| StagingType | StagingTypeEnum | 否 | 工作台类型 |
| CreatedUser | string | 否 | 创建人 |
| RegionId | Guid? | 是 | 区域ID |
| Enabled | bool | 否 | 启用状态 |
| AutoStart | bool | 否 | 自动下达任务 |
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
- `Id`、`TenantId`、`RegionId`

## 索引字段
- `StagingCode`

## 关系
- WMS_Regions（1:N）：`WMS_Stagings.RegionId = WMS_Regions.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/warehouse/staging-type-select — 获取工作台下拉框数据
- POST /api/app/warehouse/staging — 创建工作台
- POST /api/app/warehouse/export-staging — 工作台信息导出
- DELETE /api/app/warehouse/staging/{stagingId} — 删除工作台信息
- PUT /api/app/warehouse/staging/{stagingId} — 编辑工作台信息
- POST /api/app/warehouse/staging-list — 获取工作台分页数据信息（支持动态查询）
- GET /api/app/warehouse/staging-select — 获取工作台下拉框数据
- GET /api/app/warehouse/staging-by-id/{stagingId} — 根据ID获取单条数据
<!-- api:end -->
