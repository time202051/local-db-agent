# WMS_InboundApplications 入库申请单

> 由 ABP 源码自动生成
## 用途
入库申请单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| BillNo | string | 否 | 入库申请单号 |
| SapBillNo | string? | 是 | SAP入库申请单号 |
| Mblnr | string? | 是 | 单据凭证号 |
| Mjahr | string? | 是 | 单据凭证年度 |
| OwnerId | Guid | 否 | 工厂ID |
| OwnerCode | string | 否 | 工厂 |
| OwnerName | string | 否 | 工厂名称 |
| BusinessNode | string? | 是 | 业务节点 |
| ApplicationType | string? | 是 | 申请类型 |
| MovementType | string? | 是 | 移动类型 |
| BusinessNodeDesc | string? | 是 | 业务节点描述 |
| ApplicationTypeDesc | string? | 是 | 申请类型描述 |
| DocumentDate | DateTime | 否 | 凭证日期 |
| DepartmentOfIssue | string? | 是 | 申请部门 |
| CreateUser | string? | 是 | 创建人 |
| SendSapTime | DateTime? | 是 | 制单日期 |
| PassSapTime | DateTime? | 是 | 过账日期 |
| DepartmentId | Guid? | 是 | 需求部门ID |
| DepartmentName | string? | 是 | 需求部门名称 |
| DemanderId | Guid? | 是 | 需求者ID |
| DemanderName | string? | 是 | 需求者姓名 |
| Status | InboundApplicationStatusEnum | 否 | 单据状态 |
| ApplicantId | Guid | 否 | 入库申请员ID |
| ApplicantName | string | 否 | 入库申请员姓名 |
| ApplicationTime | DateTime | 否 | 申请时间 |
| SapReceipt | string? | 是 | SAP回执信息 |
| Remark | string? | 是 | 备注 |
| WarehouseId | Guid? | 是 | 仓库ID |
| InboundApplicationSource | InboundApplicationSourceEnum | 否 | 单据类型 |

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
- `Id`、`TenantId`、`OwnerId`、`DepartmentId`、`DemanderId`、`ApplicantId`、`WarehouseId`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/purchase-inbound/inbound-application-pages — 分页查询入库申请单列表
- POST /api/app/purchase-inbound/export-inbound-application — 导出入库申请单
- GET /api/app/purchase-inbound/{id}/inbound-application — 获取入库申请单详情(单头)
- PUT /api/app/purchase-inbound/{id}/inbound-application — 编辑入库申请单
- DELETE /api/app/purchase-inbound/{id}/inbound-application — 删除入库申请单(已撤销/申请失败状态)
- POST /api/app/purchase-inbound/inbound-application-detail-pages — 入库申请单明细分页查询
- POST /api/app/purchase-inbound/export-inbound-application-detail — 导出入库申请单明细
- POST /api/app/purchase-inbound/inbound-application-detail-full-pages — 入库申请单明细分页查询(包含头和明细)
- POST /api/app/purchase-inbound/export-inbound-application-detail-full — 导出入库申请单明细(包含头和明细)
- GET /api/app/purchase-inbound/inbound-application-default-options — 获取入库申请单默认业务节点和申请类型
- POST /api/app/purchase-inbound/inbound-application — 创建入库申请单
- POST /api/app/purchase-inbound/batch-delete-inbound-application-details — 物理删除入库申请明细(直接删除数据并回退到货登记已申请入库数量、释放采购订单占用)
- POST /api/app/purchase-inbound/{id}/submit-inbound-application — 入库申请单发送SAP生单(手动/自动通用)
- POST /api/app/purchase-inbound/send-inbound-application-posting — 入库申请单发送SAP过账(手动/自动通用)
- POST /api/app/purchase-inbound/send-inbound-application-posting-by-queue — 入库申请单异步过账(待过账明细超过300行时使用,每10行一组入队后台队列并行过账)
- POST /api/app/purchase-inbound/send-inbound-application-posting-detail-by-queue — 入库申请单明细后台队列过账(按勾选明细行入队,每10行一组并行过账)
- POST /api/app/purchase-inbound/pass-inbound-application — 入库申请单明细异步过账(由后台队列Job调用,只过账明细,单头状态在提交后由原子SQL刷新)
- POST /api/app/purchase-inbound/send-inbound-application-posting-detail — 入库申请单明细发送SAP过账
- POST /api/app/purchase-inbound/manual-post-inbound-application-detail — 入库申请单明细手动过账(不调用SAP,本地标记已过账并联动到货登记/检验登记)
- POST /api/app/purchase-inbound/refresh-inbound-application-sap-posting-result — 批量刷新入库申请单明细SAP过账结果(重新解析响应并回填应反填的字段和状态)
<!-- api:end -->
