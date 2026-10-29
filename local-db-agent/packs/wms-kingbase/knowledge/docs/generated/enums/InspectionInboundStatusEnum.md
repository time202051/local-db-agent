# InspectionInboundStatusEnum 入库单状态

> 由 ABP 源码自动生成：`OLD.WMS.Domain.Shared\PurchaseInbound\InspectionInboundStatusEnum.cs`

## 说明
入库单状态

| 值 | 名称 | 含义 |
|---|---|---|
| 0 | summary |  |
| 1 | 暂存 |  |
| 2 | summary |  |
| 0 | Draft | 暂存 |
| 4 | summary | 暂存 |
| 5 | SAP接收失败 | 暂存 |
| 6 | summary | 暂存 |
| 10 | SapReceiveFailed | SAP生单失败 |
| 8 | summary | SAP接收失败 |
| 9 | SAP生单成功 | SAP接收失败 |
| 10 | summary | SAP接收失败 |
| 20 | SapReceiveSuccess | SAP生单成功 |
| 12 | summary | SAP生单成功 |
| 13 | 待清点 | SAP生单成功 |
| 14 | summary | SAP生单成功 |
| 21 | AwaitCheck | 待清点 |
| 16 | summary | 待清点 |
| 17 | 清点中 | 待清点 |
| 18 | summary | 待清点 |
| 22 | Checking | 清点中 |
| 20 | summary | 清点中 |
| 21 | 清点异常 | 清点中 |
| 22 | summary | 清点中 |
| 23 | CheckError | 清点异常 |
| 24 | summary | 清点异常 |
| 25 | 待上架 | 清点异常 |
| 26 | summary | 清点异常 |
| 30 | PendingShelving | 待上架 |
| 28 | summary | 待上架 |
| 29 | 上架中 | 待上架 |
| 30 | summary | 待上架 |
| 40 | Shelving | 上架中 |
| 32 | summary | 上架中 |
| 33 | 已全部上架 | 上架中 |
| 34 | summary | 上架中 |
| 50 | AllShelved | 已全部上架 |
| 36 | summary | 已全部上架 |
| 37 | 不允许入库 | 已全部上架 |
| 38 | summary | 已全部上架 |
| 51 | AllNotInAllow | 不允许入库 |
| 40 | summary | 不允许入库 |
| 41 | SAP部分过账成功 | 不允许入库 |
| 42 | summary | 不允许入库 |
| 52 | SapPartPostingSuccess | SAP部分过账成功 |
| 44 | summary | SAP部分过账成功 |
| 45 | SAP全部过账成功 | SAP部分过账成功 |
| 46 | summary | SAP部分过账成功 |
| 60 | SapPostingSuccess | SAP全部过账成功 |
| 48 | summary | SAP全部过账成功 |
| 49 | SAP过账失败 | SAP全部过账成功 |
| 50 | summary | SAP全部过账成功 |
| 70 | SapPostingFailed | SAP过账失败 |
| 52 | summary | SAP过账失败 |
| 53 | 已手动过账 | SAP过账失败 |
| 54 | summary | SAP过账失败 |
| 80 | ManualPosted | 已手动过账 |
