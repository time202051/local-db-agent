# WMS_Picks 拣货单

> 由 ABP 源码自动生成
## 用途
拣货单

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| WarehouseId | Guid? | 是 | 仓库ID |
| PickNo | string | 否 | 拣货单号 |
| Priority | BorrowPriorityEnum | 否 | 任务等级 |
| PickState | PickStateEnum | 否 | 拣货状态 |
| VerifyState | VerifyStateEnum | 否 | 复核状态 |
| ReAssignReason | string | 否 | 转派原因 |
| PickUserId | Guid? | 是 | 拣货人ID |
| AssignUserId | Guid? | 是 | 分配人ID |
| PrintCount | int | 否 | 打印次数 |
| TotalRows | int | 否 | 总行数 |
| Remark | string | 否 | 备注 |
| StartExecuteTime | DateTime? | 是 | 开始执行时间 |
| EndFinishTime | DateTime? | 是 | 结束完成时间 |

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
- `Id`、`WarehouseId`、`PickUserId`、`AssignUserId`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/pda-stock-out/pick-list — 获取拣货信息
- GET /api/app/pda-stock-out/today-pick-list — 获取当天已完成拣货单
- POST /api/app/pda-stock-out/pick — 拣货
- GET /api/app/stock-out/pick-state — 获取拣货单状态
- GET /api/app/stock-out/pick-user-select — 获取拣货人下拉
- GET /api/app/stock-out/pick-by-id/{entityId} — 根据Id获取拣货单
- POST /api/app/stock-out/pick-pages — 获取拣货单分页数据信息
- POST /api/app/stock-out/export-pick — 拣货单导出
- POST /api/app/stock-out/generate-pick — 生成拣货单
- POST /api/app/stock-out/manual-pick-for-web — PC拣选
- POST /api/app/stock-out/cancel-pick — 取消拣选单
- POST /api/app/stock-out/rush-pick — 拣货单加急
- GET /api/app/stock-out/pick-list-for-print — 打印拣货单(拣货单表头)
- POST /api/app/warehouse/refresh-cargo-pick-seq — 更新当前区域拣货顺序
<!-- api:end -->
