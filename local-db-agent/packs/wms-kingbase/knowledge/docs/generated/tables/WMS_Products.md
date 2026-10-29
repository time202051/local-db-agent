# WMS_Products 物料基础信息

> 由 ABP 源码自动生成
## 用途
物料基础信息

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 |  |
| ProductCode | string | 否 | 物料编码 |
| ProductName | string | 否 | 物料名称 |
| DrawingNo | string | 否 | 图号 |
| ProductDescribe | string | 否 | 物料描述 |
| Spec | string | 否 | 规格型号 |
| MaxStockQty | decimal | 否 | 库存上限 |
| MinStockQty | decimal | 否 | 库存下限 |
| MOQ | decimal | 否 | 起订量 |
| LeadTime | int | 否 | 采购提前日 |
| Lenth | decimal | 否 | 长 |
| Width | decimal | 否 | 宽 |
| Height | decimal | 否 | 高 |
| Weight | decimal | 否 | 重量 |
| Volume | decimal | 否 | 体积 |
| Meins | string | 否 | 基本计量单位 |
| Msehl | string | 否 | 基本计量单位描述 |
| MeteringRank | string | 否 | 计量等级 |
| UsageInstructions | string | 否 | 限用说明 |
| RangeUpperLimit | decimal | 否 | 量程上限 |
| RangeUpperFloor | decimal | 否 | 量程下限 |
| UseRange | string | 否 | 量程范围 |
| Brand | string | 否 | 品牌 |
| ProductClassId | Guid? | 是 | 物料分类ID |
| CreatedUser | string | 否 | 创建人 |
| Enabled | bool | 否 | 状态 |
| Spras | string | 否 | 语言代码 对应SAP字段：SPRAS |
| ZJtbm | string | 否 | 集团物料编码 对应SAP字段：ZJTBm |
| Bismt | string | 否 | 旧物料号 对应SAP字段：BISMT |
| Lvorm | string | 否 | 在客户级标记要删除的物料 对应SAP字段：LVORM |
| ZXingh | string | 否 | 型号 对应SAP字段：ZXINGH |
| ZSqcjz | string | 否 | 申请创建者 对应SAP字段：ZSQCJZ |
| ZBanben | string | 否 | 版本 对应SAP字段：ZBANBEN |
| ZPackcode | string | 否 | 包装代码 对应SAP字段：ZPACKCODE |
| ZMaktxen | string | 否 | 物品外文名称 对应SAP字段：ZMAKTXEN |
| ZJsbztx | string | 否 | 技术标准级别名称 对应SAP字段：ZJSBZTX |
| ZJsbznum | string | 否 | 技术标准号 对应SAP字段：ZJSBZNUM |
| ZPzbztx | string | 否 | 品种标准级别名称 对应SAP字段：ZPZBZTX |
| ZPzbznum | string | 否 | 品种标准号 对应SAP字段：ZPZBZNUM |
| ZClnum | string | 否 | 材料牌号 对应SAP字段：ZCLNUM |
| ZLjnum | string | 否 | 零件号 对应SAP字段：ZLJNUM |
| ZLjtx | string | 否 | 零件名称 对应SAP字段：ZLJTX |
| ZTiaom | string | 否 | 国际组织确认的13位条码 对应SAP字段：ZTIAOM |
| ZScbh | string | 否 | 生产单位自编号 对应SAP字段：ZSCBH |
| ZBznum | string | 否 | 标准号 对应SAP字段：ZBZNUM |
| ZBztx | string | 否 | 标准名称 对应SAP字段：ZBZTX |
| ZGzbh | string | 否 | 工装编号 对应SAP字段：ZGZBH |
| ZBzjdh | string | 否 | 标准级别代号 对应SAP字段：ZBZJDH |
| ZPysb | string | 否 | 配用设备 对应SAP字段：ZPYSB |
| ZLzjnum | string | 否 | 零组件号 对应SAP字段：ZLZJNUM |
| ZPingp | string | 否 | 品牌 对应SAP字段：ZPINGP |
| ZHgz | string | 否 | 产品合格证 对应SAP字段：ZHGZ |
| ZGyszT | string | 否 | 供应商状态 对应SAP字段：ZGYSZT |
| Wrkst | string | 否 | 基本物料 对应SAP字段：WRKST |
| Dattp | string | 否 | 货架寿命到期日期间标识 对应SAP字段：DATTP |
| Brgew | string | 否 | 毛重 对应SAP字段：BRGEW |
| Ntgew | string | 否 | 净重 对应SAP字段：NTGEW |
| Plifz | string | 否 | 计划交货时间（天） 对应SAP字段：PLIFZ |
| Eisbe | string | 否 | 安全库存 对应SAP字段：EISBE |
| ErSda | DateTime? | 是 | 创建日期 对应SAP字段：ERSDA |
| Laeda | DateTime? | 是 | 上次更改的日期 对应SAP字段：LAEDA |
| ManageCategories | string | 否 | 管理分类 |
| Categories | string | 否 | 分类 |
| DrawingVersion | string | 否 | 图纸班次号 |
| AssociatedModel | string | 否 | 关联型号 |
| ProductClassType | ProductClassTypeEnum? | 是 | 物料大类 |

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
- `Id`、`TenantId`、`ProductClassId`

## 索引字段
- `ProductCode`、`Enabled`

## 关系
- WMS_ProductClasss（1:N）：`WMS_Products.ProductClassId = WMS_ProductClasss.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/data-sync/sync-product — 同步物料数据
- POST /api/app/i-lT/export-iLTRecord-product — 盘点记录导出-根据物料分组
- GET /api/app/product/dic-by-unit — 获取单位字典
- POST /api/app/product/product-pages-sort — 获取产品分页信息数据-带排序
- POST /api/app/product/get-product-prints — 获取打印信息
- POST /api/app/product/product-pages — 获取产品分页信息数据
- POST /api/app/product/product — 创建产品
- PUT /api/app/product/product/{productId} — 编辑产品
- POST /api/app/product/delete-product — 删除产品
- GET /api/app/product/product-by-id/{productId} — 根据ID获取单条数据
- GET /api/app/product/product-by-code — 根据物料编码获取物料信息
- GET /api/app/product/product-select — 获取物料下拉框数据
- POST /api/app/product/import-product — 物料信息导入模板
- POST /api/app/product/down-product — 物料导入模板下载
- PUT /api/app/product/all-regular — 更新所有物料
- POST /api/app/product/product-check-type — 检测零件类别
- GET /api/app/purchase-inbound/product-qr-label — 打印物料标签(根据到货登记Id集合)
- GET /api/app/purchase-inbound/product-qr-label-by-detail-ids — 打印物料标签(根据到货登记明细Id集合)
- GET /api/app/purchase-inbound/product-qr-label-by-inbound-app-detail-ids — 打印物料标签(根据入库申请单明细Id集合)
- GET /api/app/purchase-inbound/product-qr-label-by-inspection-inbound-ids — 打印物料标签(根据检验入库单Id集合)
<!-- api:end -->
