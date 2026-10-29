# WMS_CheckRecords 盘点记录

> 由 ABP 源码自动生成
## 用途
盘点记录

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| BillNo | string | 否 | 盘点单号 |
| WarehouseName | string | 否 | 仓库名称 |
| WarehouseId | Guid? | 是 | 仓库ID |
| ITT | InventoryTypeEnum | 否 | 盘点类型 |
| LineId | int | 否 | 行号 |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| SerialNumber | string | 否 | 序列号 |
| ManageCategories | string | 否 | 管理分类 |
| DrawingVersion | string | 否 | 图纸版次号 |
| AssociatedModel | string | 否 | 关联型号 |
| Pid1 | string | 否 | PID1 |
| Pid2 | string | 否 | PID2 |
| Pid3 | string | 否 | PID3 |
| ItemBatch | string | 否 | 批次号 |
| EngineType | string | 否 | 发动机型号 |
| EngineSerialNumber | string | 否 | 发动机序号 |
| TableNumber | string | 否 | 台份 |
| Haplont | string | 否 | 单元体 |
| ProductClassCode | string | 否 | 物料类别编码 |
| ProductClassName | string | 否 | 物料类别名称 |
| Qty | decimal | 否 | 账面数量 |
| ILTQty | decimal | 否 | 实盘数量 |
| DiffQty | decimal | 否 | 差异数量 |
| WarehouseLocationCode | string | 否 | 库位编码 |
| ContainerCode | string | 否 | 容器编码 |
| IltType | IltTypeEnum | 否 | 盘点结果 |
| CreateUser | string | 否 | 操作人 |
| ContainerPhotoId | Guid? | 是 | 容器图片ID |
| RegionCode | string | 否 | 区域编码 |
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
- `Id`、`TenantId`、`WarehouseId`、`LineId`、`ContainerPhotoId`

## 索引字段
- `ProductCode`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
