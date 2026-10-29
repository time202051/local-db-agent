# AssemblyDeliveryRequestStatusEnum 集件配送请求状态

> 由 ABP 源码自动生成：`OLD.WMS.Domain.Shared\AssemblyDelivery\AssemblyDeliveryRequestStatusEnum.cs`

## 说明
集件配送请求状态

| 值 | 名称 | 含义 |
|---|---|---|
| 0 | summary |  |
| 1 | 待处理 |  |
| 2 | 请求已创建 |  |
| 3 | 等待处理 |  |
| 4 | summary |  |
| 0 | Pending | 待处理 |
| 6 | summary | 待处理 - 请求已创建，等待处理 |
| 7 | 处理中 | 待处理 - 请求已创建，等待处理 |
| 8 | 正在执行配送任务 | 待处理 - 请求已创建，等待处理 |
| 9 | summary | 待处理 - 请求已创建，等待处理 |
| 1 | Processing | 处理中 |
| 11 | summary | 处理中 - 正在执行配送任务 |
| 12 | 已完成 | 处理中 - 正在执行配送任务 |
| 13 | 配送任务已完成 | 处理中 - 正在执行配送任务 |
| 14 | summary | 处理中 - 正在执行配送任务 |
| 2 | Completed | 已完成 |
| 16 | summary | 已完成 - 配送任务已完成 |
| 17 | 已取消 | 已完成 - 配送任务已完成 |
| 18 | 配送请求已取消 | 已完成 - 配送任务已完成 |
| 19 | summary | 已完成 - 配送任务已完成 |
| 99 | Cancelled | 已取消 |
