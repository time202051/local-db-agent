# WMS_InventoryAnomalyInfos 库存异常信息

> 由 ABP 源码自动生成
## 用途
库存异常信息

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| AbnormalNo | string | 否 | 异常编码 |
| RegionId | Guid | 否 | 区域ID |
| Region | WarehouseInfo.Entitys.Region | 否 | 区域 |
| AbnormalType | AbnormalTypeEnum | 否 | 异常类型 |
| WorkType | WorkTypeEnum | 否 | 作业类型 |
| PickNo | string | 否 | 业务单号 |
| ProductId | Guid | 否 | 物料ID |
| OwnerId | Guid | 否 | 工厂ID |
| WarehouseId | Guid | 否 | 仓库ID |
| ContainerId | Guid? | 是 | 容器ID |
| CabinetNumber | string | 否 | 隔口号 |
| Qty | decimal | 否 | 异常数量 |
| TaskProductBatch | string | 否 | 任务批次 |
| StockProductBatch | string | 否 | 库存批次 |
| CreatePerson | string | 否 | 创建人 |
| Remark | string | 否 | 备注 |
| ConfirmStatus | bool | 否 | 确认状态 |

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
- `Id`、`TenantId`、`RegionId`、`ProductId`、`OwnerId`、`WarehouseId`、`ContainerId`

## 索引字段
- `AbnormalNo`、`ConfirmStatus`

## 关系
- WMS_Containers（1:N）：`WMS_InventoryAnomalyInfos.ContainerId = WMS_Containers.Id`
- WMS_Products（1:N）：`WMS_InventoryAnomalyInfos.ProductId = WMS_Products.Id`
- WMS_Owners（1:N）：`WMS_InventoryAnomalyInfos.OwnerId = WMS_Owners.Id`
- WMS_Warehouses（1:N）：`WMS_InventoryAnomalyInfos.WarehouseId = WMS_Warehouses.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
