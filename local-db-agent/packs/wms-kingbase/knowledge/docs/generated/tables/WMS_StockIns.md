# WMS_StockIns 入库单

> 由 ABP 源码自动生成
## 用途
入库单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| BillNo | string | 否 | 入库单号 |
| OrginalBillNo | string | 否 | 来源单号 |
| Number | string? | 是 | 台份 |
| Batch | string? | 是 | 台次 |
| EngineModel | string? | 是 | 发动机型号 |
| ProductOrderNo | string? | 是 | 生产订单号 |
| OrderDesc | string? | 是 | 订单描述 |
| WorkOrderNo | string? | 是 | 工单号 |
| WorkOrderDesc | string? | 是 | 工单描述 |
| RequestCreateTime | DateTime? | 是 | 请求创建时间 |
| Applicant | string? | 是 | 申请人 |
| Workstation | string? | 是 | 操作工位 |
| Remark | string? | 是 | 备注 |
| OrderBusinessType | StockInBusinessTypeEnum | 否 | 业务类型 |
| StockInOrderState | StockInOrderStateEnum | 否 | 单据状态 |
| SourceDepartment | string | 否 | 来源部门 |
| DeliveryPerson | string | 否 | 送料人 |
| WarehouseId | Guid | 否 | 仓库ID |
| IsCallBack | bool | 否 | 是否需要回传 |
| StockInTime | DateTime? | 是 | 入库日期 |
| CreateUser | string | 否 | 创建人 |
| GoodsType | int | 否 | 货物类型 |
| AcceptanceType | int | 否 | 验收类型 |

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

## 关系
- WMS_Warehouses（1:N）：`WMS_StockIns.WarehouseId = WMS_Warehouses.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/stock-in/stock-in-detail-pages — 获取入库单明细行详情
- GET /api/app/stock-in/stock-in-pages — 获取入库单单头信息
- GET /api/app/stock-in/stock-in-business-type — 获取入库单业务类型下拉接口
- GET /api/app/stock-in/stock-in-order-state-type — 获取入库单状态
- POST /api/app/stock-in/export-stock-in — 入库单详情导出
- POST /api/app/stock-in/down-stock-in-template — 入库单导入模板下载
- POST /api/app/stock-in/import-stock-in-old — 导入入库单
- POST /api/app/stock-in/batch-import-stock-in — 批量导入入库单
- POST /api/app/stock-in/build-self-stock-in — 自建入库单
- POST /api/app/stock-in/temp-store-stock-in — 暂存入库单信息
- PUT /api/app/stock-in/stock-in/{StockInId} — 更新入库单
- POST /api/app/stock-in/update-stock-in-detail — 编辑入库单明细
- POST /api/app/stock-in/delete-stock-in-detail — 删除入库单明细
- POST /api/app/stock-in/delete-stock-in — 删除入库单
- POST /api/app/stock-in/dipose-stock-in — 手动结束入库单
- POST /api/app/stock-in/get-menu-key-value
- GET /api/app/wms-tv-msg/stock-in-error
<!-- api:end -->
