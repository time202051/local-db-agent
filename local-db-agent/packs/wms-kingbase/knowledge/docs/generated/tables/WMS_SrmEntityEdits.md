# WMS_SrmEntityEdits 构型修改表

> 由 ABP 源码自动生成
## 用途
构型修改表

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| OrderformCode | string | 否 | 合同号 |
| Ebeln | string | 否 | 采购订单号 |
| ComponentName | string | 否 | 零组件名称 |
| ComponentFigureNumber | string | 否 | 零组件编号 |
| Oldid | string | 否 | 变更前ID |
| Tfzpc | string | 否 | 台份装配次 |
| FlowNo | string | 否 | 流程号 |
| OldFlowNo | string | 否 | 原始流程号 |
| AddressNo | string | 否 | 位置号 |
| ProjectNo | string | 否 | 项目型号 |
| PackageNo | string | 否 | 分包目录编号 |
| LastUpdateDate | DateTime? | 是 | 必须字段 |
| LastUpdatedBy | string | 否 | 必须字段 |
| CreationDate | DateTime? | 是 | 必须字段 |
| CreatedBy | string | 否 | 必须字段 |
| LastUpdateIp | string | 否 | 必须字段 |
| Version | decimal? | 是 | 必须字段 |
| Attribute01 | string | 否 | 来源表 |
| Attribute02 | string | 否 | 更改类型 |
| Attribute03 | string | 否 | 备用字段 |
| Attribute04 | string | 否 | 备用字段 |
| Attribute05 | string | 否 | 备用字段 |
| Attribute06 | string | 否 | 备用字段 |
| Attribute07 | string | 否 | 备用字段 |
| Attribute08 | string | 否 | 备用字段 |
| Attribute09 | string | 否 | 备用字段 |
| Attribute10 | string | 否 | 备用字段 |

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
- `Id`

## 索引字段
- `FlowNo`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。
