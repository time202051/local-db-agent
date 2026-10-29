# WMS_ContainerTypes 容器类型

> 由 ABP 源码自动生成
## 用途
容器类型

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ContainerTypeCode | string | 否 | 容器类型编码 |
| ContainerTypeName | string | 否 | 容器类型名称 |
| Code | string | 否 | 代码 |
| ValiteCode | string | 否 | 校验码 |
| ContainerShapeType | ContainerShapeTypeEnum | 否 | 容器属性 |
| Lang | decimal | 否 | 长 |
| Height | decimal | 否 | 高 |
| Width | decimal | 否 | 宽 |
| MaxWeight | decimal | 否 | 最大重量 |
| Maxvolume | decimal | 否 | 最大体积 |
| Enabled | bool | 否 | 状态 |
| Remark | string | 否 | 备注 |
| WcsCode | string | 否 | WCS代码 |
| AgvCode | string | 否 | AGV代码 |
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
- `Id`、`TenantId`

## 索引字段
- `ContainerTypeCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/region-container-type/{id} — 获取单条配置详情
- DELETE /api/app/region-container-type/{id} — 删除单条配置
- POST /api/app/region-container-type/list — 分页查询配置列表（支持动态查询）
- POST /api/app/region-container-type/delete-many — 批量删除配置
- POST /api/app/test-back/test-serach-container-type
- GET /api/app/warehouse/container-type-print-select — 获取容器类型打印下拉
- GET /api/app/warehouse/container-type-print-select-print — 获取容器类型打印下拉
- POST /api/app/warehouse/container-type — 创建容器类型
- POST /api/app/warehouse/export-container-type — 容器类型信息导出
- DELETE /api/app/warehouse/container-type/{containerTypeId} — 删除容器类型信息
- PUT /api/app/warehouse/container-type/{containerTypeId} — 编辑容器类型信息
- POST /api/app/warehouse/container-type-list — 获取容器类型分页数据信息（支持动态查询）
- GET /api/app/warehouse/container-type-select — 获取容器类型下拉框数据
- GET /api/app/warehouse/container-type-by-id/{containerTypeId} — 根据ID获取单条数据
<!-- api:end -->
