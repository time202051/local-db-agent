# WMS_StockTransfers 库存调拨单

> 由 ABP 源码自动生成
## 用途
库存调拨单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| WarehouseId | Guid? | 是 | 仓库ID |
| OwnerCode | string | 否 | 工厂 |
| OwnerName | string | 否 | 工厂描述 |
| BillNo | string | 否 | 调拨单号 |
| OriginalBillNo | string | 否 | SAP调拨单号 |
| Mblnr | string? | 是 | 凭证号 |
| BusinessNode | string | 否 | 业务节点 |
| BusinessNodeDesc | string | 否 | 业务节点描述 |
| ApplicationType | string | 否 | 申请类型 |
| ApplicationTypeDesc | string | 否 | 申请类型描述 |
| MovementType | string | 否 | 移动类型 |
| DocumentDate | DateTime | 否 | 凭证日期 |
| DepartmentOfIssue | string | 否 | 申请部门 |
| StockTransferType | StockTransferTypeEnum | 否 | 调拨类型 |
| StockTransferBusinessType | StockTransferBusinessTypeEnum? | 是 | 业务类型 |
| StockTransferState | StockTransferStateEnum | 否 | 单据状态 |
| CreateUser | string | 否 | 创建人 |
| Remark | string | 否 | 备注 |
| TargetSpecialStock | string? | 是 | 目标特殊库存标识 |
| SendSapTime | DateTime? | 是 | 制单日期 |
| PassSapTime | DateTime? | 是 | 过账日期 |

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

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/pda-stock-transfer-app-servie/transfer-await-down-list — 获取调拨单待下架列表
- GET /api/app/pda-stock-transfer-app-servie/transfer-await-shelved-list — 获取调拨单待上架列表
- POST /api/app/pda-stock-transfer-app-servie/scan-material-qRCode-check — 扫描物料信息卡片码进行上下架校验/直接库内转移生成新的库内转移调拨单并返回操作数量
- POST /api/app/pda-stock-transfer-app-servie/pda-transfer-down — 库存调拨单实物库存下架
- POST /api/app/pda-stock-transfer-app-servie/compelted-transfer-down
- POST /api/app/pda-stock-transfer-app-servie/pda-transfer-shelved-batch — 库存调拨单实物库存上架（批量） 参考单条上架逻辑独立实现：明细/货位/容器/库区绑定等全部一次性批量加载， 内存循环逐条处理，库存变动/操作记录汇总批量落库，避免逐条调用产生 N 次数据库往返。 整个批量处于同一事务中，任一明细校验或处理失败时整体回滚。
- GET /api/app/stock-transfer/stock-transfer-type — 获取库存调拨单调拨类型下拉接口
- GET /api/app/stock-transfer/stock-transfer-business-select-type — 获取库存调拨单业务类型下拉接口
- GET /api/app/stock-transfer/stock-transfer-state-type — 获取库存调拨单状态
- POST /api/app/stock-transfer/stock-transfer-detail-full-pages — 获取库存调拨单(包含头和明细)分页数据信息
- GET /api/app/stock-transfer/transfer-head/{stockTransferId} — 根据调拨单Id获取库存调拨单(单头)信息
- POST /api/app/stock-transfer/stock-transfer-head-pages — 获取库存调拨单(单头)分页数据信息
- POST /api/app/stock-transfer/stock-transfer-detail-pages — 获取库存调拨单明细分页数据信息
- POST /api/app/stock-transfer/export-stock-transfer-detail-full — 库存调拨(包含头和明细)信息导出
- POST /api/app/stock-transfer/export-stock-transfer-head — 库存调拨单(单头)导出
- POST /api/app/stock-transfer/download-stock-transfer-template — 下载库存地点转换导入模板
- POST /api/app/stock-transfer/import-stock-transfer — 导入库存地点转换明细行(单头字段由接口传入,解析校验Excel后逐行返回,前端填入新增弹窗明细行,不直接建单)
- POST /api/app/stock-transfer/stock-transfer — 创建库存调拨单
- DELETE /api/app/stock-transfer/stock-transfer — 删除库存调拨单
- PUT /api/app/stock-transfer/stock-transfer/{stockTransferId} — 更新库存调拨单
<!-- api:end -->
