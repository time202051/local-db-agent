# WMS_ProductBatchs 物料批次

> 由 ABP 源码自动生成
## 用途
物料批次

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| TenantId | Guid? | 是 | 租户ID |
| ItemBatch | string | 否 | 批次号/序列号 |
| SupplierBatch | string | 否 | 供应商批次 |
| SupplierId | Guid? | 是 | 供应商ID |
| ProductId | Guid | 否 | 物料ID |

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
- `Id`、`TenantId`、`SupplierId`、`ProductId`

## 索引字段
- `ItemBatch`

## 关系
- WMS_Suppliers（1:N）：`WMS_ProductBatchs.SupplierId = WMS_Suppliers.Id`
- WMS_Products（1:N）：`WMS_ProductBatchs.ProductId = WMS_Products.Id`

## 查询注意
- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/stock/product-batch-pages — 零件批次分页
- POST /api/app/stock/product-batch — 创建零件批次
- PUT /api/app/stock/{id}/product-batch — 编辑零件批次
- POST /api/app/stock/export-product-batch — 导出零件批次
- POST /api/app/stock/import-product-batch-sap — 导入更新物料批次的SAP批次。 Excel 三列：物料编码、供应商批次、SAP批次。 按 物料编码 + 供应商批次 定位【SAP批次为空】的物料批次行并刷入 SAP批次(ItemBatch)： 已有SAP批次的行不参与匹配；SAP批次为空的候选行必须唯一，0行或多行都不更新（结果中标注原因）。 成功与失败行都逐行返回，供前端表格展示。
- POST /api/app/stock/download-product-batch-sap-template — 下载物料批次SAP批次导入模板(表头：物料编码、供应商批次、SAP批次)
- POST /api/app/stock/import-product-batch-engine-set — 导入物料批次的台份/制造版次。 Excel 四列：物料编码、SAP批次号、台份、制造版次。 按 物料编码 + SAP批次号 定位物料批次行，批次行的台份/制造版次为空时回填 Excel 对应值： 逐字段判断，Excel 未填的列跳过，批次行已有值的字段不覆盖；同一物料+SAP批次对应多条批次行(不同供应商批次)时， 所有空值行一起回填；台份号不做主数据存在性校验。 成功与失败行都逐行返回，供前端表格展示。 大文件支持：按块(每块3000行)查询与保存，IN 值控制在小块内；更新走 BulkExtensions 批量写库， 查询全部 AsNoTracking，十几万行导入也不会打爆数据库与内存。
- POST /api/app/stock/download-product-batch-engine-set-template — 下载物料批次台份/制造版次导入模板(表头：物料编码、SAP批次号、台份、制造版次)
- POST /api/app/test-back/init-product-batch — 初始化批次（针对大数据量优化，支持 20 万+ 记录）
<!-- api:end -->
