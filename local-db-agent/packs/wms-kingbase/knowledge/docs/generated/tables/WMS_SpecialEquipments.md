# WMS_SpecialEquipments 特种设备表

> 由 ABP 源码自动生成
## 用途
特种设备表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| ApplicationNo | string | 否 | 申请编号 |
| UsageLocation | string | 否 | 使用地点 |
| EquipmentName | string | 否 | 使用设备名称 |
| ApplyUserId | Guid? | 是 | 申请人ID |
| ApplicantDepartment | string | 否 | 申请人所在部门 |
| ExpectedStartTime | DateTime | 否 | 预计开始时间 |
| ExpectedEndTime | DateTime | 否 | 预计结束时间 |
| SpecialEquipmentStatus | SpecialEquipmentStatusEnum | 否 | 状态 |
| ApplicationTime | DateTime? | 是 | 申请时间 |
| ApprovalTime | DateTime? | 是 | 审批时间 |
| ApprovalText | string | 否 | 审批意见 |
| UsageRecordMaintenanceTime | DateTime? | 是 | 使用记录维护时间 |
| UsageRecordMaintainer | string | 否 | 使用记录维护人 |
| CreatorDepartment | string | 否 | 创建人所在部门 |
| ApplicationReason | string | 否 | 申请原因 |

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
- `Id`、`ApplyUserId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/special-equipment/special-equipment-pages — 特种设备分页查询
- POST /api/app/special-equipment/export-special-equipment — 特种设备导出
- POST /api/app/special-equipment/special-equipment-detail-pages — 特种设备明细分页查询
- POST /api/app/special-equipment/special-equipment — 创建特种设备
- POST /api/app/special-equipment/submit-approval — 提交审批
- POST /api/app/special-equipment/execute-approval — 执行审批
<!-- api:end -->
