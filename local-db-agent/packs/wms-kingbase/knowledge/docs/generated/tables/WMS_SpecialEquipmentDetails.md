# WMS_SpecialEquipmentDetails 特种设备明细表

> 由 ABP 源码自动生成
## 用途
特种设备明细表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| SpecialEquipmentId | Guid | 否 | 申请表ID |
| EquipmentName | string | 否 | 设备名称 |
| UsageQuantity | decimal | 否 | 使用数量 |
| UsageDuration | decimal | 否 | 使用时长 |
| EquipmentType | string | 否 | 设备类型 |

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
- `Id`、`SpecialEquipmentId`

## 关系
- WMS_SpecialEquipments（1:N）：`WMS_SpecialEquipmentDetails.SpecialEquipmentId = WMS_SpecialEquipments.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/special-equipment/special-equipment-detail — 新增明细
<!-- api:end -->
