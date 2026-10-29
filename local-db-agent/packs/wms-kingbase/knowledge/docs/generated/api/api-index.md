# API 索引

> 由本地 Swagger 生成：JWT Token Authentication API v1
> 接口 956 个；已映射 856 个；外部接口 57 个；未映射 43 个。

## AbpApiDefinition
- GET /api/abp/api-definition → 未映射

## AbpApplicationConfiguration
- GET /api/abp/application-configuration → WMS_BusinessNodeApplicationTypes

## AbpApplicationLocalization
- GET /api/abp/application-localization → WMS_BusinessNodeApplicationTypes

## AccountUser
- GET /api/app/account-user/current-user — 获取当前用户信息 → WMS_UserLogins
- GET /api/app/account-user/user-organization-unit/{userId} → WMS_UserLogins

## Agv
- POST /api/agv/reportPairTaskStatus — 双目标点任务 → 外部接口
- POST /api/agv/reportTaskStatus — 单目标点任务 → 外部接口

## ApiDescription
- GET /api/app/api-description/api-description — 获取接口信息 → 未映射

## AreaSapStorageLocation
- DELETE /api/app/area-sap-storage-location/{id} — 删除关联 → WMS_Area_SapStorageLocation
- DELETE /api/app/area-sap-storage-location/by-area-id/{areaId} — 根据库区ID删除所有关联 → WMS_Area_SapStorageLocation
- DELETE /api/app/area-sap-storage-location/by-sap-storage-location-id/{sapStorageLocationId} — 根据SAP库存地点ID删除所有关联 → WMS_Area_SapStorageLocation
- DELETE /api/app/area-sap-storage-location/many — 批量删除关联 → WMS_Area_SapStorageLocation
- GET /api/app/area-sap-storage-location — 获取所有关联列表 → WMS_Area_SapStorageLocation
- GET /api/app/area-sap-storage-location/{id} — 获取单个关联详情 → WMS_Area_SapStorageLocation
- GET /api/app/area-sap-storage-location/by-area-id/{areaId} — 根据库区ID获取关联列表 → WMS_Area_SapStorageLocation
- GET /api/app/area-sap-storage-location/by-sap-storage-location-id-select/{sapStorageLocationId} — 根据SAP库存地点ID获取关联下拉框 → WMS_Area_SapStorageLocation
- GET /api/app/area-sap-storage-location/by-sap-storage-location-id/{sapStorageLocationId} — 根据SAP库存地点ID获取关联列表 → WMS_Area_SapStorageLocation
- POST /api/app/area-sap-storage-location — 创建关联 → WMS_Area_SapStorageLocation
- POST /api/app/area-sap-storage-location/export-area-sap-storage-location — 库区与SAP库存地点关联导出 → WMS_Area_SapStorageLocation
- POST /api/app/area-sap-storage-location/list — 分页查询关联列表（支持动态查询） → WMS_Area_SapStorageLocation
- POST /api/app/area-sap-storage-location/many — 批量创建关联 → WMS_Area_SapStorageLocation
- PUT /api/app/area-sap-storage-location/{id} — 更新关联（仅更新备注） → WMS_Area_SapStorageLocation

## AuditLogging
- POST /api/app/audit-logging/api-log-pages — 接口日志分页 → WMS_UserLogins
- POST /api/app/audit-logging/audit-log-pages — 审计日志分页 → WMS_UserLogins
- POST /api/app/audit-logging/entity-change-pages — 实体变更分页 → WMS_CustomTableSchemaChangeLogs
- POST /api/app/audit-logging/export-api-log — 接口日志导出 → WMS_UserLogins
- POST /api/app/audit-logging/export-audit-log — 审计日志导出 → WMS_UserLogins
- POST /api/app/audit-logging/export-operation-log — 操作日志导出 → WMS_OperationLogs
- POST /api/app/audit-logging/operation-pages — 操作日志分页 → WMS_OperationLogs

## BatchIsolation
- DELETE /api/app/batch-isolation/batch-isolation/{batchIsolationId} — 删除批次隔离 → WMS_BatchIsolations
- POST /api/app/batch-isolation/batch-isolation — 创建批次隔离 → WMS_BatchIsolations
- POST /api/app/batch-isolation/batch-isolation-pages — 批次隔离分页查询 → WMS_BatchIsolations
- POST /api/app/batch-isolation/download-batch-isolation-template — 下载批次隔离导入模板 → WMS_BatchIsolations
- POST /api/app/batch-isolation/export-batch-isolation — 批次隔离导出 → WMS_BatchIsolations
- POST /api/app/batch-isolation/import-batch-isolation — 导入批次隔离（按工厂+图号+供应商批次匹配，存在则更新，不存在则新增） → WMS_BatchIsolations
- PUT /api/app/batch-isolation/batch-isolation/{batchIsolationId} — 更新批次隔离 → WMS_BatchIsolations

## BillType
- DELETE /api/app/bill-type/bill-type/{billTypeId} — 删除单据类型 → WMS_BillTypes
- POST /api/app/bill-type/bill-type — 创建单据类型 → WMS_BillTypes
- POST /api/app/bill-type/bill-type-pages — 单据类型分页查询 → WMS_BillTypes
- POST /api/app/bill-type/export-bill-type — 单据类型导出 → WMS_BillTypes
- PUT /api/app/bill-type/bill-type/{billTypeId} — 更新单据类型 → WMS_BillTypes

## Bpm
- POST /api/open/bpm_to_wms/bpm-callback → 外部接口

## BusinessNode
- DELETE /api/app/business-node/{id}/business-node — 删除业务节点 → WMS_BusinessNodes
- DELETE /api/app/business-node/{id}/business-node-application-type — 删除业务节点申请类型 → WMS_BusinessNodeApplicationTypes
- GET /api/app/business-node/{id}/business-node — 根据 ID 获取业务节点详情 → WMS_BusinessNodes
- GET /api/app/business-node/{id}/business-node-application-type — 根据 ID 获取业务节点申请类型详情 → WMS_BusinessNodeApplicationTypes
- GET /api/app/business-node/application-type-select-by-first-node/{businessNodeId} — 根据一级业务节点获取申请类型下拉列表 → WMS_BusinessNodeApplicationTypes
- GET /api/app/business-node/business-node-application-type-select/{subBusinessNodeId} — 按二级子业务节点获取申请类型下拉列表 → WMS_BusinessNodeApplicationTypes
- GET /api/app/business-node/business-node-select — 获取一级业务节点下拉列表 → WMS_BusinessNodes
- GET /api/app/business-node/business-node-tree — 查询业务节点树 → WMS_BusinessNodes
- GET /api/app/business-node/sub-business-node-select/{businessNodeId} — 按一级业务节点获取二级子业务节点下拉列表 → WMS_BusinessNodes
- POST /api/app/business-node/{id}/set-business-node-application-type-enabled — 设置业务节点申请类型启停状态 → WMS_BusinessNodeApplicationTypes
- POST /api/app/business-node/{id}/set-business-node-enabled — 设置业务节点启停状态 → WMS_BusinessNodes
- POST /api/app/business-node/business-node — 创建业务节点 → WMS_BusinessNodes
- POST /api/app/business-node/business-node-application-type — 创建业务节点申请类型 → WMS_BusinessNodeApplicationTypes
- POST /api/app/business-node/business-node-application-type-pages — 分页查询业务节点申请类型 → WMS_BusinessNodeApplicationTypes
- POST /api/app/business-node/business-node-pages — 分页查询业务节点 → WMS_BusinessNodes
- POST /api/app/business-node/test-node → WMS_BusinessNodes
- PUT /api/app/business-node/{id}/business-node — 更新业务节点 → WMS_BusinessNodes
- PUT /api/app/business-node/{id}/business-node-application-type — 更新业务节点申请类型 → WMS_BusinessNodeApplicationTypes
- PUT /api/app/business-node/business-node-config — 更新数据 → WMS_BusinessNodes

## BusinessTask
- GET /api/app/business-task/{id}/business-task-photo-paths — 获取任务照片 → WMS_BussinessTasks
- POST /api/app/business-task/business-task-pages — 获取任务分页数据信息 → WMS_BussinessTasks
- POST /api/app/business-task/cancel-task-id — 取消任务 → WMS_BussinessTasks
- POST /api/app/business-task/export-business-task — 任务信息导出 → WMS_BussinessTasks
- POST /api/app/business-task/reset-task — 重发 → WMS_BussinessTasks

## CacheAdmin
- DELETE /api/app/cache-admin/cache — 删除指定 key 的缓存 → 未映射
- DELETE /api/app/cache-admin/cache-by-prefix — 按 key 前缀批量删除缓存（如 "Screens:"、枚举缓存前缀等） → 未映射
- GET /api/app/cache-admin/cache-list — 查询已登记的缓存列表（keyword 为空返回全部，否则按 key 模糊匹配） → 未映射
- GET /api/app/cache-admin/cache-summary — 按前缀聚合统计缓存数量（前缀取 key 中第一个冒号之前的部分） → 未映射
- GET /api/app/cache-admin/cache-value — 查看指定 key 的缓存值（缓存经 JsonNewtonsoft 序列化为 UTF-8 JSON，此处读原始字节并解析回传） → WMS_TemplateConfigDefaultValues
- POST /api/app/cache-admin/clear-all-caches — 清空当前进程内所有已登记的缓存 → 未映射

## CollectPiecePlan
- DELETE /api/app/collect-piece-plan/collect-piece-plan/{entityId} — 删除集件计划单 → 未映射
- POST /api/app/collect-piece-plan/check-import-collect-piece-plan — 集件计划单导入 - 第一步：检查导入数据状况 → 未映射
- POST /api/app/collect-piece-plan/collect-piece-plan — 新增集件计划单 → WMS_StockHistorys
- POST /api/app/collect-piece-plan/collect-piece-plan-pages — 集件计划单分页查询 → 未映射
- POST /api/app/collect-piece-plan/download-collect-piece-plan-import-template — 下载集件计划单导入模板 → WMS_DataTemplates
- POST /api/app/collect-piece-plan/export-collect-piece-plan — 集件计划单导出 → 未映射
- POST /api/app/collect-piece-plan/import-collect-piece-plan — 集件计划单导入 - 第二步：执行导入 → 未映射
- POST /api/app/collect-piece-plan/kit-check-collect-piece-plan — 齐套检查：对选中的集件计划单批量计算并回写 物料编码、台份库存数量、标准件/适航库库存、库存版次、领用单信息与库存状态。 → 未映射
- PUT /api/app/collect-piece-plan/collect-piece-plan/{entityId} — 编辑集件计划单 → WMS_StockHistorys

## Config
- GET /api/app/config/common-select — 获取通用枚举下拉(带分页) → WMS_BackgroundWorkerConfigs
- GET /api/app/config/hangfire-executor-config — 获取后台任务执行机配置（数据库单行；MachineName 为空表示不限制） → WMS_ApiInterfaceConfigs
- GET /api/app/config/item-code-print-url-a — 获取打印单件码地址（拼接单件码系统单点登录+跳转地址） loginName 取应用进程运行的域账户用户名；类型 in=入库(billno)、out=出库(outbillno) 系统地址从配置读取：ItemCodePrint:LoginBaseUrl / ItemCodePrint:RedirectBaseUrl → WMS_PrintConfigs
- GET /api/app/config/item-code-print-url-p — 获取打印单件码地址（拼接单件码系统单点登录+跳转地址） loginName 取应用进程运行的域账户用户名；类型 in=入库(billno)、out=出库(outbillno) 系统地址从配置读取：ItemCodePrint:LoginBaseUrl / ItemCodePrint:RedirectBaseUrl → WMS_PrintConfigs
- GET /api/app/config/windows-account-info — 获取当前应用所在机器的 Windows 域账户信息（应用进程运行的账户，如 域\用户名） → WMS_ApiInterfaceConfigs
- POST /api/app/config/background-worker-config-pages — 获取后台工作配置分页信息 → WMS_BackgroundWorkerConfigs
- POST /api/app/config/data-base-back — 数据库备份 → WMS_BackgroundWorkerConfigs
- POST /api/app/config/export-background-worker-config — 后台工作配置信息导出 → WMS_BackgroundWorkerConfigs
- POST /api/app/config/return-base-info — 返回数据库备份基础数据 → WMS_BackgroundWorkerConfigs
- PUT /api/app/config/{id}/background-worker-config — 修改后台工作任务配置 → WMS_BackgroundWorkerConfigs
- PUT /api/app/config/hangfire-executor-config — 设置后台任务执行机（单行配置；改动需重启应用生效，MachineName 传空表示不限制） → WMS_ApiInterfaceConfigs

## ContainerLocationChangeRecord
- POST /api/app/container-location-change-record/list — 获取容器库位变动记录分页数据（支持动态查询） → WMS_Containers

## Cost
- DELETE /api/app/cost/cost/{costId} — 删除成本中心 → WMS_Costs
- GET /api/app/cost/cost-select — 成本中心下拉 → WMS_Costs
- POST /api/app/cost/cost — 创建成本中心 → WMS_Costs
- POST /api/app/cost/cost-pages — 成本中心分页查询 → WMS_Costs
- POST /api/app/cost/export-cost — 成本中心导出 → WMS_Costs
- PUT /api/app/cost/cost/{costId} — 更新成本中心 → WMS_Costs

## DatabaseEditor
- GET /api/app/database-editor/columns — 获取表所有列 → WMS_SelectedColumns
- GET /api/app/database-editor/tables — 获取所有表名 → WMS_CustomTables
- POST /api/app/database-editor/save-data — 保存数据（支持新增、更新、删除） → WMS_DataSyncRecords
- POST /api/app/database-editor/table-data-pages — 获取表数据 → WMS_CustomTables

## DatabaseTable
- DELETE /api/app/database-table/table-data — 删除一行数据，通过主键 Id 定位行 → WMS_CustomTables
- GET /api/app/database-table/data-type-select — 数据类型下拉 → WMS_BusinessNodeApplicationTypes
- GET /api/app/database-table/table-data — 分页查询表数据，支持关键词搜索和字段筛选 → WMS_CustomTables
- GET /api/app/database-table/table-detail — 获取数据库表结构详情，包含所有字段信息。 表名必须以 custom_ 前缀开头。 → WMS_CustomTables
- GET /api/app/database-table/table-list — 分页查询自定义表列表，只返回 custom_ 前缀的表 → WMS_CustomTables
- POST /api/app/database-table/column — 给已有表新增字段，同时创建列注释。 目标表必须以 custom_ 前缀开头。 → WMS_SelectedColumns
- POST /api/app/database-table/drop-column — 删除已有表的字段。目标表必须以 custom_ 前缀开头。 → WMS_SelectedColumns
- POST /api/app/database-table/drop-table — 删除数据库表。表名必须以 custom_ 前缀开头，非 custom_ 前缀的表不允许删除。 → WMS_CustomTables
- POST /api/app/database-table/table — 自定义创建数据库表，表名自动拼接 custom_ 前缀，同时创建表注释和列注释。 所有表统一创建在数据库默认 schema 下。 → WMS_CustomTables
- POST /api/app/database-table/table-data — 插入一行数据，自动赋值 Id(GuidV7)、CreationTime、CreatorId → WMS_CustomTables
- PUT /api/app/database-table/table-data — 更新一行数据，通过主键 Id 定位行，自动维护 LastModificationTime 和 LastModifierId → WMS_CustomTables

## DataReport
- DELETE /api/app/data-report/{id} — 删除数据报表配置 → WMS_DataReportConfigs
- GET /api/app/data-report/data-report-config — 获取数据报表配置列表 → WMS_DataReportConfigs
- GET /api/app/data-report/db-type-select — 获取数据类型下拉 → WMS_DataReportConfigs
- POST /api/app/data-report — 创建数据报表配置 → WMS_DataReportConfigs
- POST /api/app/data-report/data-report-config-pages — 数据报表配置分页查询 → WMS_DataReportConfigs
- POST /api/app/data-report/data-report-pages — 数据报表执行分页查询 → WMS_DataReportConfigs
- POST /api/app/data-report/export-data-report — 数据报表执行导出 → WMS_DataReportConfigs
- PUT /api/app/data-report/{id} — 编辑数据报表配置 → WMS_DataReportConfigs
- PUT /api/app/data-report/role-report-list/{roleId} — 更新角色相关报表列表 → WMS_DataReportConfigs

## DataSync
- DELETE /api/app/data-sync/{id}/data-sync-record — 删除数据同步 → WMS_DataSyncRecords
- POST /api/app/data-sync/data-sync-record — 创建数据同步 → WMS_DataSyncRecords
- POST /api/app/data-sync/data-sync-record-pages — 数据同步分页查询 → WMS_DataSyncRecords
- POST /api/app/data-sync/sync-cost — 同步成本中心数据 → WMS_Costs
- POST /api/app/data-sync/sync-employee — 单独同步中台人员数据。 → WMS_DataSyncRecords
- POST /api/app/data-sync/sync-engine-sn — 同步台份主数据 → WMS_DataSyncRecords
- POST /api/app/data-sync/sync-organization-unit — 同步中台组织数据。 → WMS_DataSyncRecords
- POST /api/app/data-sync/sync-product — 同步物料数据 → WMS_Products
- POST /api/app/data-sync/sync-project — 同步项目数据 → WMS_Projects
- POST /api/app/data-sync/sync-sap-mat-doc — 同步物料凭证行项目数据 → WMS_DataSyncRecords
- POST /api/app/data-sync/sync-storage-location — 同步库存地点 → WMS_Area_SapStorageLocation
- POST /api/app/data-sync/sync-supplier — 同步供应商数据 → WMS_Suppliers
- POST /api/app/data-sync/sync-wbs — 同步WBS数据 → WMS_DataSyncRecords
- PUT /api/app/data-sync/{id}/data-sync-record — 更新数据同步 → WMS_DataSyncRecords

## DeliveryShipment
- DELETE /api/app/delivery-shipment/{id} — 删除交付发运单 → WMS_DeliveryShipments
- DELETE /api/app/delivery-shipment/many — 批量删除交付发运单 → WMS_DeliveryShipments
- GET /api/app/delivery-shipment/{id}/by-id — 根据ID获取交付发运单 → WMS_DeliveryShipments
- POST /api/app/delivery-shipment — 创建交付发运单 → WMS_DeliveryShipments
- POST /api/app/delivery-shipment/delivery-shipment-detail-pages — 获取交付发运单明细分页数据信息 → WMS_DeliveryShipments
- POST /api/app/delivery-shipment/delivery-shipment-pages — 获取交付发运单分页数据 → WMS_DeliveryShipments
- POST /api/app/delivery-shipment/export-delivery-shipment — 导出交付发运单 → WMS_DeliveryShipments
- POST /api/app/delivery-shipment/sync-from-srm — SRM同步交付发运单 → WMS_DeliveryShipments
- PUT /api/app/delivery-shipment — 更新交付发运单 → WMS_DeliveryShipments

## DictData
- DELETE /api/app/dict-data/dict-data/{dictDataId} — 删除字典数据 → WMS_DictDatas
- GET /api/app/dict-data/dict-data-select — 按字典类型编码获取字典数据下拉 → WMS_DictDatas
- GET /api/app/dict-data/special-stock-select — 特殊库存下拉 → WMS_Stocks
- POST /api/app/dict-data/dict-data — 创建字典数据 → WMS_DictDatas
- POST /api/app/dict-data/dict-data-pages — 字典数据分页查询 → WMS_DictDatas
- POST /api/app/dict-data/export-dict-data — 字典数据导出 → WMS_DictDatas
- PUT /api/app/dict-data/dict-data/{dictDataId} — 更新字典数据 → WMS_DictDatas

## DictType
- DELETE /api/app/dict-type/dict-type/{dictTypeId} — 删除字典类型 → WMS_DictTypes
- POST /api/app/dict-type/dict-type — 创建字典类型 → WMS_DictTypes
- POST /api/app/dict-type/dict-type-pages — 字典类型分页查询 → WMS_DictTypes
- POST /api/app/dict-type/export-dict-type — 字典类型导出 → WMS_DictTypes
- PUT /api/app/dict-type/dict-type/{dictTypeId} — 更新字典类型 → WMS_DictTypes

## DocumentCenter
- DELETE /api/app/document-center/document/{ProductClassId} — 删除文档 → WMS_DocumentCenters
- POST /api/app/document-center/document-center — 创建文档 → WMS_DocumentCenters

## EngineSn
- DELETE /api/app/engine-sn/{id} — 删除 → 未映射
- DELETE /api/app/engine-sn/many — 批量删除 → 未映射
- GET /api/app/engine-sn/{id} — 根据ID获取详情 → 未映射
- GET /api/app/engine-sn/{id}/phase-by-id — 根据台份ID获取台份阶段 → 未映射
- GET /api/app/engine-sn/by-engine-sn — 根据台份获取列表 → 未映射
- GET /api/app/engine-sn/by-engine-sn-and-phase — 根据台份和阶段获取详情 → 未映射
- POST /api/app/engine-sn — 创建 → 未映射
- POST /api/app/engine-sn/export-engine-sn — 台份导出 → 未映射
- POST /api/app/engine-sn/list — 获取分页列表（支持动态查询） → 未映射
- PUT /api/app/engine-sn/{id} — 更新 → 未映射

## FileAttachment
- DELETE /api/app/file-attachment/{id} — 删除附件（同时删除物理文件） → WMS_FileAttachment
- GET /api/app/file-attachment/{id} — 根据Id获取附件详情 → WMS_FileAttachment
- GET /api/app/file-attachment/by-entity/{entityId} — 根据实体表名和实体Id查询所有附件（不分页） → WMS_FileAttachment
- POST /api/app/file-attachment/{id}/download — 下载文件 → WMS_FileAttachment
- POST /api/app/file-attachment/batch-delete — 批量删除附件 → WMS_FileAttachment
- POST /api/app/file-attachment/batch-upload-files/{entityId} — 批量上传文件（前端FormData方式） → WMS_FileAttachment
- POST /api/app/file-attachment/entity-pages — 根据实体表名和实体Id查询附件列表（分页） → WMS_FileAttachment
- POST /api/app/file-attachment/upload — 上传文件（字节流方式） → WMS_FileAttachment
- POST /api/app/file-attachment/upload-file-for-pdf — 上传PrintPdf文件（字节流方式），同一EntityId只保留一条记录，先删后增 → WMS_FileAttachment
- POST /api/app/file-attachment/upload-file/{entityId} — 直接上传文件（前端FormData方式） → WMS_FileAttachment
- PUT /api/app/file-attachment/{id} — 更新附件信息（可修改实体表名、实体Id等） → WMS_FileAttachment

## HomeDocument
- DELETE /api/app/home-document/{id} — 删除文档 → WMS_HomeDocuments
- GET /api/app/home-document/{id} — 获取文档详情 → WMS_HomeDocuments
- POST /api/app/home-document — 创建文档 → WMS_HomeDocuments
- POST /api/app/home-document/home-document-pages — 文档分页查询 → WMS_HomeDocuments
- PUT /api/app/home-document/{id} — 更新文档 → WMS_HomeDocuments

## HomeNotice
- DELETE /api/app/home-notice/{id} — 删除公告 → WMS_HomeNotices
- GET /api/app/home-notice/{id} — 获取公告详情 → WMS_HomeNotices
- POST /api/app/home-notice — 创建公告 → WMS_HomeNotices
- POST /api/app/home-notice/home-notice-pages — 公告分页查询 → WMS_HomeNotices
- PUT /api/app/home-notice/{id} — 更新公告 → WMS_HomeNotices

## HomePublicNotice
- DELETE /api/app/home-public-notice/{id} — 删除公示 → WMS_HomePublicNotices
- GET /api/app/home-public-notice/{id} — 获取公示详情 → WMS_HomePublicNotices
- POST /api/app/home-public-notice — 创建公示 → WMS_HomePublicNotices
- POST /api/app/home-public-notice/home-public-notice-pages — 公示分页查询 → WMS_HomePublicNotices
- PUT /api/app/home-public-notice/{id} — 更新公示（只能修改自己创建的公示） → WMS_HomePublicNotices

## HomeTodo
- DELETE /api/app/home-todo/{id} — 删除待办 → WMS_HomeTodos
- GET /api/app/home-todo/{id} — 获取待办详情 → WMS_HomeTodos
- POST /api/app/home-todo — 创建待办 → WMS_HomeTodos
- POST /api/app/home-todo/home-todo-pages — 待办分页查询（排序：等级升序 > 待办所属日期升序 > 待办创建日期） → WMS_HomeTodos
- PUT /api/app/home-todo/{id} — 更新待办 → WMS_HomeTodos

## HomeWarehouseInfo
- DELETE /api/app/home-warehouse-info/{id} — 删除库房信息 → WMS_HomeWarehouseInfos
- GET /api/app/home-warehouse-info/{id} — 获取库房信息详情 → WMS_HomeWarehouseInfos
- POST /api/app/home-warehouse-info — 创建库房信息 → WMS_HomeWarehouseInfos
- POST /api/app/home-warehouse-info/home-warehouse-info-pages — 库房信息分页查询 → WMS_HomeWarehouseInfos
- PUT /api/app/home-warehouse-info/{id} — 更新库房信息 → WMS_HomeWarehouseInfos

## Identity
- GET /api/app/identity/edd — 返回私钥 → WMS_UserLogins
- POST /api/app/identity/import-user-roles — 用户角色导入：读取 Excel 第一个 Sheet，第一列账户(用户名)、第二列姓名(仅核对展示)、第三列角色(多个角色用英文/中文逗号分割)。 按用户名匹配用户、按角色名匹配角色，只补充缺失的用户角色关系（可重复导入）； 某行用户不存在或角色名不存在时该行整体不导入，在返回消息中逐行列出失败原因。 → WMS_UserLogins
- POST /api/app/identity/login — 登录 → WMS_UserLogins
- POST /api/app/identity/pda-login-info — PDA获取登录信息 → WMS_UserLogins

## IdentityRole
- DELETE /api/app/identity-role/{id} → WMS_UserLogins
- GET /api/app/identity-role → WMS_UserLogins
- GET /api/app/identity-role/{id} → WMS_UserTokens
- GET /api/app/identity-role/list → 未映射
- POST /api/app/identity-role → WMS_UserTokens
- POST /api/app/identity-role/role-pages — 角色查询(动态查询) → 未映射
- PUT /api/app/identity-role/{id} → WMS_UserTokens

## IdentityUser
- DELETE /api/app/identity-user/{id} → WMS_UserLogins
- GET /api/app/identity-user — 用户分页查询 → WMS_UserLogins
- GET /api/app/identity-user/{id} → WMS_UserTokens
- GET /api/app/identity-user/{id}/roles → WMS_UserTokens
- GET /api/app/identity-user/assignable-roles — 查询可用角色 → WMS_UserTokens
- GET /api/app/identity-user/currenct-user-select — 获取当前登录用户下拉 → WMS_UserTokens
- POST /api/app/identity-user → WMS_UserTokens
- POST /api/app/identity-user/find-by-email → WMS_UserTokens
- POST /api/app/identity-user/find-by-username → WMS_UserTokens
- POST /api/app/identity-user/reset-password/{userId} — 重置密码 → WMS_UserLogins
- POST /api/app/identity-user/update-pass-word — 更新密码 → WMS_UserLogins
- POST /api/app/identity-user/user-pages — 用户分页查询(动态查询) → WMS_UserLogins
- PUT /api/app/identity-user/{id} → WMS_UserTokens
- PUT /api/app/identity-user/{id}/roles → WMS_UserLogins
- PUT /api/app/identity-user/identity-user-role-many — 批量新增用户角色(增量模式:入参角色为需要新增的角色,用户已拥有的角色跳过,不删除用户已有角色) → WMS_UserLogins

## ILT
- GET /api/app/i-lT/cargo-location-select — 获取货位信息下拉框 → WMS_CargoLocations
- GET /api/app/i-lT/pda-count-task-list — 【PDA】分页获取待盘点/盘点中的任务列表 → WMS_ILTs
- POST /api/app/i-lT/batch-adjust-count-diff — 【盘点差异调整】批量手动调整盘点差异（按实盘数量修正库存） 仅允许对已完成且存在差异、未调整过的盘点单执行 → WMS_StockDiffAdjustments
- POST /api/app/i-lT/batch-cancel-count-order-asyn — 【盘点单管理】批量取消盘点单 → WMS_ILTs
- POST /api/app/i-lT/batch-set-count-order — 【盘点单管理】批量设置盘点人和备注 → WMS_ILTs
- POST /api/app/i-lT/batch-submit-count-result — 【盘点单管理】批量提交盘点结果（提交即完成） → WMS_ILTs
- POST /api/app/i-lT/cancel-count-order/{iltId} — 【盘点单管理】取消盘点单 → WMS_ILTs
- POST /api/app/i-lT/count-diff-pages — 【盘点差异调整】查询已完成且有差异的盘点单（支持动态查询） → WMS_ILTs
- POST /api/app/i-lT/count-order-pages — 【盘点单管理】分页查询盘点单（支持动态查询） → WMS_ILTs
- POST /api/app/i-lT/dynamic-count-order — 【动态盘点】制单 → WMS_ILTs
- POST /api/app/i-lT/export-iLTRecord — 盘点记录导出 → WMS_ILTs
- POST /api/app/i-lT/export-iLTRecord-product — 盘点记录导出-根据物料分组 → WMS_Products
- POST /api/app/i-lT/periodic-count-order — 【周期盘点】制单 → WMS_ILTs
- POST /api/app/i-lT/re-count-order — 【盘点差异调整】复盘 — 对有差异的盘点单重新生成新盘点单 → WMS_ILTs
- POST /api/app/i-lT/stock-for-dynamic-count — 【动态盘点】查询指定时间范围内有出入库变动的库存 通过 StockHistory 流水表筛选发生过出入库操作（上架/下架/拣选/出库等）的 ProductId/CargoLocationCode， 联合匹配 Stock 表定位有变动的库存行。返回与库存查询一致的 DomainStockDto。 → WMS_Stocks
- POST /api/app/i-lT/stock-for-periodic-count — 【周期盘点】查询可盘点的库存列表（与库存查询返回一致，额外排除锁定和在盘库存） → WMS_Stocks
- POST /api/app/i-lT/submit-pda-count-result — 【PDA】提交盘点结果（提交即完成） → WMS_ILTs

## MenuSearchSetting
- DELETE /api/app/menu-search-setting/{id} — 删除 → WMS_MenuSearchSettings
- DELETE /api/app/menu-search-setting/by-menu — 根据菜单ID删除当前用户的搜索设置 → WMS_MenuSearchSettings
- GET /api/app/menu-search-setting — 获取分页列表 → WMS_MenuSearchSettings
- GET /api/app/menu-search-setting/{id} — 根据ID获取详情 → WMS_MenuSearchSettings
- GET /api/app/menu-search-setting/by-menu — 根据用户ID和菜单ID获取搜索设置 → WMS_MenuSearchSettings
- GET /api/app/menu-search-setting/default-by-menu — 根据用户ID和菜单ID获取默认搜索设置 → WMS_MenuSearchSettings
- GET /api/app/menu-search-setting/my-settings — 获取当前用户的所有搜索设置 → WMS_MenuSearchSettings
- POST /api/app/menu-search-setting — 创建 → WMS_MenuSearchSettings
- POST /api/app/menu-search-setting/save-menu-search-setting — 保存搜索条件通用接口 → WMS_MenuSearchSettings
- POST /api/app/menu-search-setting/set-default-filter — 设置默认查询条件 → WMS_MenuSearchSettings
- PUT /api/app/menu-search-setting — 更新 → WMS_MenuSearchSettings

## Mes
- POST /api/open/mes_to_wms/bpm-callback → 外部接口

## NonPurchaseInbound
- DELETE /api/app/non-purchase-inbound/{id}/non-purchase-inbound — 删除非采购入库单（含状态校验） → WMS_NonPurchaseInboundOrders
- GET /api/app/non-purchase-inbound/{id}/non-purchase-inbound — 获取非采购入库单详情（不含明细，明细通过分页接口单独查询） → WMS_NonPurchaseInboundOrders
- GET /api/app/non-purchase-inbound/export-non-purchase-inbound — 导出非采购入库单 → WMS_NonPurchaseInboundOrders
- POST /api/app/non-purchase-inbound/{id}/manual-post-non-purchase-inbound — 手动过账 → WMS_NonPurchaseInboundOrders
- POST /api/app/non-purchase-inbound/{id}/send-non-purchase-inbound-posting — 发送SAP过账（预留） → WMS_NonPurchaseInboundOrders
- POST /api/app/non-purchase-inbound/{id}/submit-non-purchase-inbound-to-sap — 提交SAP（预留） → WMS_NonPurchaseInboundOrders
- POST /api/app/non-purchase-inbound/non-purchase-inbound — 新增非采购入库单（含业务节点与申请类型联动和存货类型自动判断） → WMS_NonPurchaseInboundOrders
- POST /api/app/non-purchase-inbound/non-purchase-inbound-detail-pages — 非采购入库单明细分页查询 → WMS_NonPurchaseInboundDetails
- POST /api/app/non-purchase-inbound/non-purchase-inbound-pages — 分页查询非采购入库单列表（只查 SourceType=NonPurchase 的行） → WMS_NonPurchaseInboundOrders
- PUT /api/app/non-purchase-inbound/{id}/non-purchase-inbound — 修改非采购入库单（含状态校验） → WMS_NonPurchaseInboundOrders

## OfflineJob
- DELETE /api/app/offline-job/{id} — 删除离线作业 → WMS_OfflineJob
- GET /api/app/offline-job — 分页查询离线作业列表（返回Custom字段配置） → WMS_OfflineJob
- GET /api/app/offline-job/{id} — 根据Id获取离线作业详情 → WMS_OfflineJob
- POST /api/app/offline-job — 创建离线作业 → WMS_OfflineJob
- POST /api/app/offline-job/batch-create — 批量创建离线作业 → WMS_OfflineJob
- POST /api/app/offline-job/batch-delete — 批量删除离线作业 → WMS_OfflineJob
- POST /api/app/offline-job/export — 导出离线作业（列自定义动态导出Excel） → WMS_OfflineJob
- PUT /api/app/offline-job/{id} — 更新离线作业 → WMS_OfflineJob

## OilSeal
- POST /api/app/oil-seal/export-oil-seal-order — 油封单导出 → WMS_OilSealOrders
- POST /api/app/oil-seal/export-stock-period-log — 三期录入流水导出 → WMS_Stocks
- POST /api/app/oil-seal/oil-seal-order-pages — 油封单分页查询 → WMS_OilSealOrders
- POST /api/app/oil-seal/stock-period-log-pages — 三期录入流水分页查询 → WMS_Stocks

## OrganizationUnit
- DELETE /api/app/organization-unit/{id} — 删除部门 → 未映射
- GET /api/app/organization-unit — 获取部门分页 → 未映射
- GET /api/app/organization-unit/{id} — 根据Id获取 → WMS_BusinessNodes
- GET /api/app/organization-unit/list — 获取所有部门 → WMS_BusinessNodes
- GET /api/app/organization-unit/list-tree — 获取需求部门下拉数据 → 未映射
- POST /api/app/organization-unit — 创建部门 → WMS_BusinessNodes
- PUT /api/app/organization-unit/{id} — 更新部门 → WMS_BusinessNodes

## PdaOffline
- GET /api/app/pda-offline/pick-task-list → WMS_PickTasks

## PdaOilSeal
- GET /api/app/pda-oil-seal/oil-seal-list-for-down — 油封下架列表 → WMS_OilSealOrders
- GET /api/app/pda-oil-seal/oil-seal-list-for-up — 油封上架列表 → WMS_OilSealOrders
- POST /api/app/pda-oil-seal/oil-seal-down — 油封下架 → WMS_OilSealOrders
- POST /api/app/pda-oil-seal/oil-seal-up — 油封上架 → WMS_OilSealOrders
- POST /api/app/pda-oil-seal/oil-seal-work-order — 油封转工单 → WMS_OilSealOrders

## PdaPurchaseInbound
- GET /api/app/pda-purchase-inbound/arrival-detail-by-product — PDA扫描物料标签二维码查询到货登记明细(PDA清点页扫物料卡后展示明细信息) → WMS_ArrivalRegistrationDetails
- GET /api/app/pda-purchase-inbound/by-bill-no — PDA按单号获取到货登记详情(扫到货信息卡二维码后调用) → WMS_NonPurchaseInboundOrders
- GET /api/app/pda-purchase-inbound/in-stock-shelving-detail-by-id/{inspectionInboundDetailId} — 获取单条入库单(检验入库单)明细 → WMS_Stocks
- GET /api/app/pda-purchase-inbound/in-stock-shelving-detail-list — 获取入库单(检验入库单)明细列表(分页) → WMS_Stocks
- GET /api/app/pda-purchase-inbound/in-stock-shelving-list — 获取入库单(检验入库单)列表(待上架,分页) → WMS_Stocks
- GET /api/app/pda-purchase-inbound/today-in-stock-shelving-list — 获取当天已完成入库单(检验入库单,分页) → WMS_Stocks
- POST /api/app/pda-purchase-inbound/arrival-registration-by-delivery-shipment — PDA扫描/输入交付发运单号创建到货登记单 → WMS_ArrivalRegistrations
- POST /api/app/pda-purchase-inbound/arrival-registration-pages — 到货登记单分页查询(包含头和明细) → WMS_ArrivalRegistrations
- POST /api/app/pda-purchase-inbound/complete-checking — PDA扫码清点 - 完成清点(单条明细) → WMS_NonPurchaseInboundDetails
- POST /api/app/pda-purchase-inbound/report-checking-abnormal — PDA扫码清点 - 异常提报 → WMS_DataReportConfigs
- POST /api/app/pda-purchase-inbound/reset-checking — PDA扫码清点 - 重置清点(清空当前明细的异常处理信息、异常数量、清点数量，仅限未清点完成的明细行) → WMS_NonPurchaseInboundOrders
- POST /api/app/pda-purchase-inbound/submit-checking-data — PDA扫码清点 - 提交清点数据(部分清点，累加清点数量) → WMS_NonPurchaseInboundDetails

## PdaStockOut
- GET /api/app/pda-stock-out/pick-list — 获取拣货信息 → WMS_Picks
- GET /api/app/pda-stock-out/pick-task-by-id/{pickTaskId} — 获取单条拣货任务 → WMS_PickTasks
- GET /api/app/pda-stock-out/pick-task-list — 获取拣货任务信息(分页) → WMS_PickTasks
- GET /api/app/pda-stock-out/today-pick-list — 获取当天已完成拣货单 → WMS_Picks
- GET /api/app/pda-stock-out/verify-list — 获取复核信息 → WMS_StockOuts
- POST /api/app/pda-stock-out/pick — 拣货 → WMS_Picks
- POST /api/app/pda-stock-out/verify — 复核 → WMS_StockOuts

## PdaStockTransferAppServie
- GET /api/app/pda-stock-transfer-app-servie/transfer-await-down-list — 获取调拨单待下架列表 → WMS_StockTransfers
- GET /api/app/pda-stock-transfer-app-servie/transfer-await-shelved-list — 获取调拨单待上架列表 → WMS_StockTransfers
- POST /api/app/pda-stock-transfer-app-servie/compelted-transfer-down → WMS_StockTransfers
- POST /api/app/pda-stock-transfer-app-servie/pda-transfer-down — 库存调拨单实物库存下架 → WMS_StockTransfers
- POST /api/app/pda-stock-transfer-app-servie/pda-transfer-shelved-batch — 库存调拨单实物库存上架（批量） 参考单条上架逻辑独立实现：明细/货位/容器/库区绑定等全部一次性批量加载， 内存循环逐条处理，库存变动/操作记录汇总批量落库，避免逐条调用产生 N 次数据库往返。 整个批量处于同一事务中，任一明细校验或处理失败时整体回滚。 → WMS_StockTransfers
- POST /api/app/pda-stock-transfer-app-servie/scan-material-qr-code-stock-info — 扫描物料二维码获取可调拨库存 → WMS_Stocks
- POST /api/app/pda-stock-transfer-app-servie/scan-material-qRCode-check — 扫描物料信息卡片码进行上下架校验/直接库内转移生成新的库内转移调拨单并返回操作数量 → WMS_StockTransfers

## Permission
- GET /api/app/permission → 未映射
- PUT /api/app/permission → 未映射

## Print
- GET /api/open/print/inbound-order-pdf — 获取入库单打印PDF（检验入库单，按SAP单号查找，可叠加业务节点/申请类型过滤） → 外部接口
- GET /api/open/print/outbound-order-pdf → 外部接口
- GET /api/open/print/wms-order-pdf → 外部接口

## PrintTemplete
- DELETE /api/app/print-templete/print-templete — 删除模板 → 外部接口
- GET /api/app/print-templete/page-list — 打印模板分页 → 外部接口
- POST /api/app/print-templete/print-templete — 创建打印模板 → 外部接口
- PUT /api/app/print-templete/print-templete — 编辑模板 → 外部接口

## Product
- DELETE /api/app/product/owner/{ownerId} — 删除工厂信息 → WMS_Owners
- DELETE /api/app/product/product-class/{productClassId} — 删除物料分类信息 → WMS_ProductClasss
- DELETE /api/app/product/product-owner/{productOwnerId} — 删除物料工厂 → WMS_ProductOwners
- DELETE /api/app/product/product-regular/{productRegularId} — 删除零件正则表达式 → WMS_ProductRegulars
- GET /api/app/product/dic-by-unit — 获取单位字典 → WMS_Products
- GET /api/app/product/owner-by-id/{ownerId} — 根据ID获取单条数据 → WMS_Owners
- GET /api/app/product/owner-pages — 获取工厂分页数据信息 → WMS_Owners
- GET /api/app/product/owner-select — 获取工厂下拉框数据 → WMS_Owners
- GET /api/app/product/owner-select-by-code — 获取工厂下拉框数据(编码) → WMS_Owners
- GET /api/app/product/product-by-code — 根据物料编码获取物料信息 → WMS_Products
- GET /api/app/product/product-by-id/{productId} — 根据ID获取单条数据 → WMS_Products
- GET /api/app/product/product-class-search — 获取物料分类下拉框数据 → WMS_ProductClasss
- GET /api/app/product/product-regular-pages — 获取工厂分页数据信息 → WMS_ProductRegulars
- GET /api/app/product/product-select — 获取物料下拉框数据 → WMS_Products
- POST /api/app/product/delete-product — 删除产品 → WMS_Products
- POST /api/app/product/down-product — 物料导入模板下载 → WMS_Products
- POST /api/app/product/export-owner — 工厂信息导出 → WMS_Owners
- POST /api/app/product/export-product-class — 物料分类信息导出 → WMS_ProductClasss
- POST /api/app/product/export-stock — 物料信息导出 → WMS_Stocks
- POST /api/app/product/get-product-prints — 获取打印信息 → WMS_Products
- POST /api/app/product/import-product — 物料信息导入模板 → WMS_Products
- POST /api/app/product/owner — 创建工厂 → WMS_Owners
- POST /api/app/product/product — 创建产品 → WMS_Products
- POST /api/app/product/product-check-type — 检测零件类别 → WMS_Products
- POST /api/app/product/product-class — 创建物料分类 → WMS_ProductClasss
- POST /api/app/product/product-class-pages — 获取物料分类分页数据信息 → WMS_ProductClasss
- POST /api/app/product/product-owner — 创建物料工厂 → WMS_ProductOwners
- POST /api/app/product/product-owner-pages — 物料工厂分页查询 → WMS_ProductOwners
- POST /api/app/product/product-pages — 获取产品分页信息数据 → WMS_Products
- POST /api/app/product/product-pages-sort — 获取产品分页信息数据-带排序 → WMS_Products
- POST /api/app/product/product-regular — 新增零件正则表达式 → WMS_ProductRegulars
- PUT /api/app/product/all-regular — 更新所有物料 → WMS_Products
- PUT /api/app/product/owner/{ownerId} — 编辑工厂信息 → WMS_Owners
- PUT /api/app/product/product-class/{productClassId} — 编辑物料分类信息 → WMS_ProductClasss
- PUT /api/app/product/product-owner/{productOwnerId} — 编辑物料工厂 → WMS_ProductOwners
- PUT /api/app/product/product-regular — 更新零件正则表达式 → WMS_ProductRegulars
- PUT /api/app/product/product/{productId} — 编辑产品 → WMS_Products

## Project
- DELETE /api/app/project/project/{projectId} — 删除项目 → WMS_Projects
- POST /api/app/project/export-project — 项目导出 → WMS_Projects
- POST /api/app/project/project — 创建项目 → WMS_Projects
- POST /api/app/project/project-pages — 字典数据分页查询 → WMS_Projects
- PUT /api/app/project/project/{projectId} — 更新项目 → WMS_Projects

## PublicAggregate
- DELETE /api/app/public-aggregate/data-template/{dataTemplateId} — 删除数据模板 → WMS_DataTemplates
- DELETE /api/app/public-aggregate/dictionaries/{dictionariesId} — 删除字典数据 → WMS_Dictionariess
- GET /api/app/public-aggregate/data-template-pages — 获取数据模板分页数据信息 → WMS_DataTemplates
- GET /api/app/public-aggregate/dci-by-id → WMS_Dictionariess
- GET /api/app/public-aggregate/dic-by-parent-id → WMS_Dictionariess
- GET /api/app/public-aggregate/dictionaries → WMS_Dictionariess
- GET /api/app/public-aggregate/down-data-template/{dataTemplateId} — 下载模板 → WMS_DataTemplates
- POST /api/app/public-aggregate/data-template — 创建数据模板数据 → WMS_DataTemplates
- POST /api/app/public-aggregate/dic → WMS_Dictionariess
- POST /api/app/public-aggregate/dictionaries — 创建字典数据 → WMS_Dictionariess
- POST /api/app/public-aggregate/upload-data-template — 上传数据模板 → WMS_DataTemplates
- PUT /api/app/public-aggregate/data-template/{dataTemplateId} — 编辑数据模板 → WMS_DataTemplates
- PUT /api/app/public-aggregate/dictionaries/{DictionariesId} — 编辑数据字典 → WMS_Dictionariess

## PublicEnum
- GET /api/app/public-enum/enums — 获取所有枚举信息 → WMS_ProductTableNumbers

## PurchaseInbound
- DELETE /api/app/purchase-inbound/{id}/arrival-registration — 删除到货登记单 → WMS_ArrivalRegistrations
- DELETE /api/app/purchase-inbound/{id}/inbound-application — 删除入库申请单(已撤销/申请失败状态) → WMS_InboundApplications
- DELETE /api/app/purchase-inbound/{id}/inspection-inbound — 删除检验入库单(暂存状态/SAP接收失败) → WMS_InspectionInbounds
- GET /api/app/purchase-inbound/{id}/arrival-registration — 获取到货登记单头详情 → WMS_ArrivalRegistrations
- GET /api/app/purchase-inbound/{id}/inbound-application — 获取入库申请单详情(单头) → WMS_InboundApplications
- GET /api/app/purchase-inbound/{id}/inspection-inbound — 获取检验入库单(单头)详情 → WMS_InspectionInbounds
- GET /api/app/purchase-inbound/arrival-inbound-print-print — 打印到货入库流程单(根据到货登记Id集合) → WMS_NonPurchaseInboundOrders
- GET /api/app/purchase-inbound/arrival-registration-info-card-print — 打印到货登记信息卡(根据到货登记Id集合) → WMS_ArrivalRegistrations
- GET /api/app/purchase-inbound/arrival-registration-status-tracking/{arrivalRegistrationId} — 查询到货登记单明细在各业务节点的状态汇总 → WMS_ArrivalRegistrations
- GET /api/app/purchase-inbound/inbound-application-default-options — 获取入库申请单默认业务节点和申请类型 → WMS_InboundApplications
- GET /api/app/purchase-inbound/inspection-inbound-print — 打印零组件类产品入库单/入库单(根据到检验入库单Id集合) → WMS_InspectionInbounds
- GET /api/app/purchase-inbound/inspection-inbound-print-pdf-by-sap — 按SAP单号(可叠加业务节点/申请类型过滤)查找检验入库单,生成并返回入库单打印PDF(对外接口用) → WMS_InspectionInbounds
- GET /api/app/purchase-inbound/inspection-inbound-process-print — 打印检验入库流程单(根据检验入库Id集合) → WMS_InspectionInbounds
- GET /api/app/purchase-inbound/parse-product-qr-code — 解析物料标签二维码(PDA上架扫码使用) → WMS_Products
- GET /api/app/purchase-inbound/product-qr-label — 打印物料标签(根据到货登记Id集合) → WMS_Products
- GET /api/app/purchase-inbound/product-qr-label-by-detail-ids — 打印物料标签(根据到货登记明细Id集合) → WMS_Products
- GET /api/app/purchase-inbound/product-qr-label-by-inbound-app-detail-ids — 打印物料标签(根据入库申请单明细Id集合) → WMS_Products
- GET /api/app/purchase-inbound/product-qr-label-by-inspection-inbound-detail-ids — 打印物料标签(根据检验入库单明细Id集合,前端勾选明细逐行打印) → WMS_Products
- GET /api/app/purchase-inbound/product-qr-label-by-inspection-inbound-ids — 打印物料标签(根据检验入库单Id集合) → WMS_Products
- GET /api/app/purchase-inbound/status-tracking/{arrivalRegistrationId} — 获取到货登记单据状态跟踪(到货登记单列表单击状态追踪详情) → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/{id}/cancel-arrival — 取消到货(已到货确认→暂存) → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/{id}/manual-close-arrival-registration — 手动关闭到货登记 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/{id}/manual-post-inspection-inbound — 检验入库单手动过账 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/{id}/manual-revoke-inbound-application — 手动撤销入库申请单(不调用SAP冲销接口) → WMS_InboundApplications
- POST /api/app/purchase-inbound/{id}/refresh-delivery-shipment-serial-no — 获取交付发运单单件码回填到货登记明细(仅暂存状态) → WMS_DeliveryShipments
- POST /api/app/purchase-inbound/{id}/revoke-inbound-application — 撤销入库申请/撤销入库申请SAP过账 → WMS_InboundApplications
- POST /api/app/purchase-inbound/{id}/submit-inbound-application — 入库申请单发送SAP生单(手动/自动通用) → WMS_InboundApplications
- POST /api/app/purchase-inbound/{id}/submit-inspection-inbound-to-sap — 检验入库单发送SAP生单 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/acceptance-flow-source-detail-candidate-pages — 分页查询验收流程来源明细候选 → WMS_NonPurchaseInboundDetails
- POST /api/app/purchase-inbound/arrival-checking-workbench-pages — PC端到货清点列表分页查询 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/arrival-registration — 创建到货登记单 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/arrival-registration-detail-pages — 到货登记单明细分页查询 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/arrival-registration-full-pages — 到货登记单分页查询(包含头和明细) → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/arrival-registration-header-backfill — 反填到货登记单头字段 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/arrival-registration-pages — 分页查询到货登记列表 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/arrival-registration-status-pages — 按固定条件分页查询到货登记列表(支持状态筛选) → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/batch-commit-check — 批量清点完成 → WMS_NonPurchaseInboundDetails
- POST /api/app/purchase-inbound/batch-delete-arrival-registration-details — 物理删除到货登记明细(仅暂存单据,直接删除数据并释放采购订单占用数量) → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/batch-delete-inbound-application-details — 物理删除入库申请明细(直接删除数据并回退到货登记已申请入库数量、释放采购订单占用) → WMS_InboundApplications
- POST /api/app/purchase-inbound/batch-error-commit — 批量提交异常 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/batch-mark-no-inspection-required — PC/PDA批量标记无需检验(跳过SAP检验结果接口) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/batch-qualified — PC/PDA批量检验合格(合格数=入库申请总数,不合格数=0) → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/batch-rest-check — 批量重置清点 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/batch-set-checking-user — 批量指派到货登记单清点人 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/batch-temp-check — 批量暂存清点 → WMS_NonPurchaseInboundDetails
- POST /api/app/purchase-inbound/batch-unqualified — PC/PDA批量检验不合格(合格数=0,不合格数=入库申请总数) → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/complete-arrival-checking — 完成清点 → WMS_NonPurchaseInboundDetails
- POST /api/app/purchase-inbound/delivery-shipment-source-detail-candidate-pages — 分页查询交付发运来源明细候选 → WMS_DeliveryShipments
- POST /api/app/purchase-inbound/delivery-shipment-source-pages — 直连外部Oracle SRM数据库，查询视图 V_DELIVERY_SHIPMENT_SOURCE / V_DELIVERY_SHIPMENT_SOURCE_SWS → WMS_DeliveryShipments
- POST /api/app/purchase-inbound/download-arrival-registration-template — 下载到货登记导入模板 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/download-inspection-inbound-template — 下载检验入库单导入模板 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/export-arrival-checking-workbench — 导出到货清点列表明细 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/export-arrival-registration — 导出到货登记列表 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/export-arrival-registration-full — 导出到货登记单(包含头和明细) → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/export-inbound-application — 导出入库申请单 → WMS_InboundApplications
- POST /api/app/purchase-inbound/export-inbound-application-detail — 导出入库申请单明细 → WMS_InboundApplications
- POST /api/app/purchase-inbound/export-inbound-application-detail-full — 导出入库申请单明细(包含头和明细) → WMS_InboundApplications
- POST /api/app/purchase-inbound/export-inspection-inbound — 导出检验入库单 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/export-inspection-inbound-checking — 导出非采购清点 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/export-inspection-inbound-detail — 导出检验入库单明细 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/export-inspection-inbound-detail-full — 导出检验入库单明细(包含头和明细) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/export-order-use-record — 导出订单使用记录列表 → WMS_OrderUseRecords
- POST /api/app/purchase-inbound/export-quality-inspection — 导出检验登记 → WMS_QualityInspections
- POST /api/app/purchase-inbound/export-shelving-record — 导出上架明细 → WMS_ShelvingRecords
- POST /api/app/purchase-inbound/generate-arrival-registration-serial-no — 按到货登记单号生成/复用明细单件码(外部调用)： 交付发运单号不为空、单件码为空且供应商批次不为空的明细行, 同物料+同供应商批次复用已有系统流水号,否则按 yyMMdd+4位流水 生成 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/handle-abnormal — 到货登记异常处理入口(把未清点数量转为异常数量，并填写处理原因、处理说明和是否允许入库) → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/import-arrival-registration — 导入到货登记单(根据Excel数据直接生成到货登记单) → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/import-inspection-inbound — 导入检验入库单明细行(仅支持非采购模式; 单头字段由接口传入,解析校验Excel后逐行返回,前端填入新增弹窗明细行,不直接建单) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/import-quality-inspection — 导入检验结果 → WMS_QualityInspections
- POST /api/app/purchase-inbound/inbound-application — 创建入库申请单 → WMS_InboundApplications
- POST /api/app/purchase-inbound/inbound-application-detail-full-pages — 入库申请单明细分页查询(包含头和明细) → WMS_InboundApplications
- POST /api/app/purchase-inbound/inbound-application-detail-pages — 入库申请单明细分页查询 → WMS_InboundApplications
- POST /api/app/purchase-inbound/inbound-application-pages — 分页查询入库申请单列表 → WMS_InboundApplications
- POST /api/app/purchase-inbound/inspection-inbound — 创建检验入库单(支持跨入库申请单选择明细合并创建) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/inspection-inbound-checking-pages — 非采购清点列表分页查询 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/inspection-inbound-detail-full-pages — 检验入库单明细分页查询(包含头和明细) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/inspection-inbound-detail-pages — 检验入库单明细分页查询 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/inspection-inbound-pages — 分页查询检验入库单列表 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/inspection-inbound-print-pdf — 打印零组件类产品入库单PDF(根据检验入库单Id集合,支持多单合并打印,每单页码独立; 每单同时按单据号存档一份PDF到该单据的附件目录) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/inspetion-inbound-check-details — 检验入库单获取待清点数据 → WMS_NonPurchaseInboundDetails
- POST /api/app/purchase-inbound/local-delivery-shipment-source-pages — 交付发运来源分页查询(新SRM系统) → WMS_DeliveryShipments
- POST /api/app/purchase-inbound/manual-post-inbound-application-detail — 入库申请单明细手动过账(不调用SAP,本地标记已过账并联动到货登记/检验登记) → WMS_InboundApplications
- POST /api/app/purchase-inbound/manual-post-inspection-inbound-detail — 检验入库单明细手动过账(不调用SAP,本地标记已过账并释放所选明细的锁定库存) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/manual-revoke-inbound-application-detail — 手动撤销入库申请单明细SAP过账(不调用SAP冲销接口) → WMS_InboundApplications
- POST /api/app/purchase-inbound/order-use-record-pages — 分页查询订单使用记录列表 → WMS_OrderUseRecords
- POST /api/app/purchase-inbound/pass-inbound-application — 入库申请单明细异步过账(由后台队列Job调用,只过账明细,单头状态在提交后由原子SQL刷新) → WMS_InboundApplications
- POST /api/app/purchase-inbound/pass-inspection-inbound — 检验入库单明细异步过账(由后台队列Job调用,只过账明细,单头状态在提交后由原子SQL刷新) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/pda-arrival-registration-details — 到货登记单获取待清点数据 → WMS_ArrivalRegistrations
- POST /api/app/purchase-inbound/product-qr-label-pdf — 打印物料标签PDF(根据到货登记Id集合) → WMS_Products
- POST /api/app/purchase-inbound/product-qr-label-pdf-by-detail-ids — 打印物料标签PDF(根据到货登记明细Id集合) → WMS_Products
- POST /api/app/purchase-inbound/product-qr-label-pdf-by-inbound-app-detail-ids — 打印物料标签PDF(根据入库申请单明细Id集合) → WMS_Products
- POST /api/app/purchase-inbound/product-qr-label-pdf-by-inspection-inbound-detail-ids — 打印物料标签PDF(根据检验入库单明细Id集合) → WMS_Products
- POST /api/app/purchase-inbound/product-qr-label-pdf-by-inspection-inbound-ids — 打印物料标签PDF(根据检验入库单Id集合) → WMS_Products
- POST /api/app/purchase-inbound/production-order-quality-info — 获取出库订单数量 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/purchase-quality-info — 获取采购订单数量 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/quality-inspection-pages — PC/PDA分页查询检验登记列表 → WMS_QualityInspections
- POST /api/app/purchase-inbound/refresh-inbound-application-sap-posting-result — 批量刷新入库申请单明细SAP过账结果(重新解析响应并回填应反填的字段和状态) → WMS_InboundApplications
- POST /api/app/purchase-inbound/resubmit-quality-inspection — 重新发起检验(不合格品维修后重新入库申请) → WMS_QualityInspections
- POST /api/app/purchase-inbound/revoke-inbound-application-detail — 入库申请单明细撤销SAP过账(按勾选明细行冲销,明细行的物料凭证号/年度不同则分别冲销) → WMS_InboundApplications
- POST /api/app/purchase-inbound/revoke-inspection-inbound-shelving — 检验入库单撤销上架(传Id=整单撤销已上架明细；传DetailIds=撤销选中的明细行) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/send-inbound-application-posting — 入库申请单发送SAP过账(手动/自动通用) → WMS_InboundApplications
- POST /api/app/purchase-inbound/send-inbound-application-posting-by-queue — 入库申请单异步过账(待过账明细超过300行时使用,每10行一组入队后台队列并行过账) → WMS_InboundApplications
- POST /api/app/purchase-inbound/send-inbound-application-posting-detail — 入库申请单明细发送SAP过账 → WMS_InboundApplications
- POST /api/app/purchase-inbound/send-inbound-application-posting-detail-by-queue — 入库申请单明细后台队列过账(按勾选明细行入队,每10行一组并行过账) → WMS_InboundApplications
- POST /api/app/purchase-inbound/send-inspection-inbound-detail-posting — 检验入库单明细发送SAP过账 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/send-inspection-inbound-detail-posting-by-queue — 检验入库单明细后台队列过账(按勾选明细行入队,每10行一组并行过账) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/send-inspection-inbound-posting — 检验入库单发送SAP过账 → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/send-inspection-inbound-posting-by-queue — 检验入库单异步过账(待过账明细超过300行时使用,每10行一组入队后台队列并行过账) → WMS_InspectionInbounds
- POST /api/app/purchase-inbound/set-arrival-checking-allow-inbound — 更新清点明细是否允许入库 → WMS_NonPurchaseInboundOrders
- POST /api/app/purchase-inbound/shelving-record — PC/PDA手动上架(入库单上架) → WMS_ShelvingRecords
- POST /api/app/purchase-inbound/shelving-record-pages — 分页查询上架明细 → WMS_ShelvingRecords
- POST /api/app/purchase-inbound/stock-out-quality-info — 获取出库订单数量 → WMS_StockOuts
- POST /api/app/purchase-inbound/submit-arrival-checking — 提交清点数量 → WMS_NonPurchaseInboundDetails
- POST /api/app/purchase-inbound/submit-quality-inspection — PC/PDA提交检验结果到SAP(同步入口,待提交记录超过300行请使用异步入口 SubmitQualityInspectionByQueueAsync) → WMS_QualityInspections
- POST /api/app/purchase-inbound/submit-quality-inspection-batch/{operationUserId} — 提交检验结果到SAP异步处理(由后台队列Job调用,操作人由入队方传入) → WMS_QualityInspections
- POST /api/app/purchase-inbound/submit-quality-inspection-by-queue — 提交检验结果到SAP异步入口(待提交记录超过300行时使用,每10条一组入队后台队列并行提交) → WMS_QualityInspections
- POST /api/app/purchase-inbound/temp-storage-shelve — PC/PDA到货登记(暂存→已到货确认/暂存区上架) → WMS_NonPurchaseInboundOrders
- PUT /api/app/purchase-inbound/{id}/arrival-registration — 编辑到货登记单(仅暂存状态) → WMS_ArrivalRegistrations
- PUT /api/app/purchase-inbound/{id}/inbound-application — 编辑入库申请单 → WMS_InboundApplications
- PUT /api/app/purchase-inbound/{id}/inspection-inbound — 编辑检验入库单(采购场景，暂存状态全量替换明细) → WMS_InspectionInbounds
- PUT /api/app/purchase-inbound/inspection-inbound-temp-storage-location — 修改检验入库单暂存区库位编码 → WMS_InspectionInbounds
- PUT /api/app/purchase-inbound/quality-inspection — PC/PDA更新检验结果(合格数/不合格数) → WMS_QualityInspections
- PUT /api/app/purchase-inbound/temp-storage-location — 修改到货登记暂存区库位编码 → WMS_Area_SapStorageLocation
- PUT /api/app/purchase-inbound/unstocked-reason — 维护到货登记未入库原因 → WMS_Stocks

## RegionContainerType
- DELETE /api/app/region-container-type/{id} — 删除单条配置 → WMS_ContainerTypes
- GET /api/app/region-container-type/{id} — 获取单条配置详情 → WMS_ContainerTypes
- GET /api/app/region-container-type/regions-by-container-type-id — 获取全部平库/立体库区域并标记该容器类型已准入/默认的项（用于容器类型配置弹窗）； containerTypeId 不传时返回全部区域且均未选（用于新增容器类型） → WMS_Regions
- POST /api/app/region-container-type/delete-many — 批量删除配置 → WMS_ContainerTypes
- POST /api/app/region-container-type/list — 分页查询配置列表（支持动态查询） → WMS_ContainerTypes

## SapMatDoc
- POST /api/app/sap-mat-doc/export-sap-mat-doc — 物料凭证行项目导出 → 外部接口
- POST /api/app/sap-mat-doc/sap-mat-doc-pages — 物料凭证行项目分页查询 → 外部接口

## SapPurchaseOrder
- POST /api/app/sap-purchase-order/export-sap-purchase-order — 采购订单导出 → 外部接口
- POST /api/app/sap-purchase-order/refresh-occupied-quantity — 刷新采购订单占用数量(按到货登记/入库申请/检验入库单明细的程序占用口径重新统计) → 外部接口
- POST /api/app/sap-purchase-order/sap-purchase-order-pages — 分页查询已同步的 SAP 采购订单明细 → 外部接口
- POST /api/app/sap-purchase-order/sync-from-sap — 从 SAP 同步采购订单并保存返回明细 → 外部接口

## SapSaleOrder
- GET /api/app/sap-sale-order/production-order-wp-info — 根据生产订单号查询WP编码/WP名称/台份号/台份名称(领用出库单头录入生产订单号后带出) → 外部接口
- GET /api/app/sap-sale-order/sap-sale-order-by-code — 根据订单号获取生产订单 → 外部接口
- POST /api/app/sap-sale-order/export-sap-production-order — 生产订单导出 → 外部接口
- POST /api/app/sap-sale-order/refresh-occupied-quantity — 刷新生产订单占用数量(根据检验入库单明细中的生产订单维度重新统计) → 外部接口
- POST /api/app/sap-sale-order/sap-sale-order-pages — 生产订单分页 → 外部接口

## SapStorageLocation
- DELETE /api/app/sap-storage-location/{id} — 删除 → 外部接口
- DELETE /api/app/sap-storage-location/many — 批量删除 → 外部接口
- GET /api/app/sap-storage-location/{id} — 根据ID获取详情 → 外部接口
- GET /api/app/sap-storage-location/by-werks — 根据工厂获取库存地点列表 → 外部接口
- GET /api/app/sap-storage-location/by-werks-and-lgort — 根据工厂和库存地点获取库存地点 → 外部接口
- GET /api/app/sap-storage-location/factory-select — 获取工厂下拉框数据 → 外部接口
- GET /api/app/sap-storage-location/select — 获取库存地点下拉框数据 → 外部接口
- GET /api/app/sap-storage-location/storage-location-options-by-owner-select/{ownerId} — 按公司 ID 查该公司下可用的 SAP 库存地点下拉列表 关联规则：SapStorageLocation.Werks == Owner.OwnerCode → 外部接口
- POST /api/app/sap-storage-location — 创建 → 外部接口
- POST /api/app/sap-storage-location/export-sap-storage-location — SAP库存地点导出 → 外部接口
- POST /api/app/sap-storage-location/list — 获取分页列表（支持动态查询） → 外部接口
- PUT /api/app/sap-storage-location/{id} — 更新 → 外部接口

## SapWbs
- DELETE /api/app/sap-wbs/{id} — 删除 → 外部接口
- DELETE /api/app/sap-wbs/many — 批量删除 → 外部接口
- GET /api/app/sap-wbs/{id} — 根据ID获取详情 → 外部接口
- GET /api/app/sap-wbs/by-posid — 根据WBS元素获取详情 → 外部接口
- GET /api/app/sap-wbs/by-pspnr — 根据WBS要素获取WBS元素 → 外部接口
- POST /api/app/sap-wbs — 创建 → 外部接口
- POST /api/app/sap-wbs/export-sap-wbs — WBS元素导出 → 外部接口
- POST /api/app/sap-wbs/list — 获取分页列表（支持动态查询） → 外部接口
- PUT /api/app/sap-wbs/{id} — 更新 → 外部接口

## Screen
- DELETE /api/app/screen/{id} — 删除大屏配置 → WMS_ScreenMessage
- GET /api/app/screen — 获取所有大屏信息 → WMS_ScreenConfiguration
- GET /api/app/screen/config-all — 获取所有大屏配置信息 → WMS_ScreenConfiguration
- GET /api/app/screen/screen-message — 获取大屏数据 → WMS_ScreenMessage
- GET /api/app/screen/screen-service — 获取大屏服务信息 → WMS_ScreenConfiguration
- POST /api/app/screen — 创建大屏配置 → WMS_ScreenConfiguration
- POST /api/app/screen/write-screen-message — 写入大屏数据 → WMS_ScreenMessage
- PUT /api/app/screen/{id} — 编辑大屏配置 → WMS_ScreenConfiguration

## ScreenDashboard
- GET /api/dashboard/screen — 检验作业监控大屏 → WMS_ScreenMessage
- POST /api/dashboard/arrival-track-report-pages — 到货跟踪报表分页查询 → WMS_ArrivalRegistrationDetails

## SearchScheme
- DELETE /api/app/search-scheme/{id} — 删除 → WMS_
- GET /api/app/search-scheme — 获取查询方案 → WMS_
- GET /api/app/search-scheme/default/{sysMenuId} — 获取默认查询方案 → WMS_
- POST /api/app/search-scheme — 创建 → WMS_
- POST /api/app/search-scheme/{id}/cancel-default — 取消设置默认方案 → WMS_
- POST /api/app/search-scheme/{id}/set-default — 设置默认方案 → WMS_
- PUT /api/app/search-scheme/{id} — 更新 → WMS_

## SpecialEquipment
- POST /api/app/special-equipment/execute-approval — 执行审批 → WMS_SpecialEquipments
- POST /api/app/special-equipment/export-special-equipment — 特种设备导出 → WMS_SpecialEquipments
- POST /api/app/special-equipment/special-equipment — 创建特种设备 → WMS_SpecialEquipments
- POST /api/app/special-equipment/special-equipment-detail — 新增明细 → WMS_SpecialEquipmentDetails
- POST /api/app/special-equipment/special-equipment-detail-pages — 特种设备明细分页查询 → WMS_SpecialEquipments
- POST /api/app/special-equipment/special-equipment-pages — 特种设备分页查询 → WMS_SpecialEquipments
- POST /api/app/special-equipment/submit-approval — 提交审批 → WMS_SpecialEquipments

## Srm
- POST /api/open/srm/sync-delivery-shipment — 同步交付发运单（SRM -> WMS） → 外部接口

## SrmOracleSync
- POST /api/app/srm-oracle-sync/full-sync — 手动触发 SRM 来源表全量落地 → 外部接口
- POST /api/app/srm-oracle-sync/full-sync-tables — 手动触发指定 SRM 来源表全量落地 → 外部接口
- POST /api/app/srm-oracle-sync/incremental-sync — 手动触发 SRM 来源表增量落地 → 外部接口

## Stock
- GET /api/app/stock/print-label — 根据库存ID集合获取库存打印标签数据列表 → WMS_Stocks
- GET /api/app/stock/three-date-alarm-count — 计算三期报警记录数 → WMS_Stocks
- POST /api/app/stock/change-stock-cargo — 库位变更：将所选库存（按指定数量）移动到目标库位对应的容器上， 目标容器已存在同维度库存时并入数量，避免产生重复库存行； 变更数量小于源库存可用数量时按拆行处理，源行保留剩余数量。 所有明细行共用同一目标库位。 → WMS_Stocks
- POST /api/app/stock/download-product-batch-engine-set-template — 下载物料批次台份/制造版次导入模板(表头：物料编码、SAP批次号、台份、制造版次) → WMS_ProductBatchs
- POST /api/app/stock/download-product-batch-sap-template — 下载物料批次SAP批次导入模板(表头：物料编码、供应商批次、SAP批次) → WMS_ProductBatchs
- POST /api/app/stock/download-refresh-engine-set-template — 下载台份号/台份阶段批量刷新导入模板(表头：交付发运单号、采购订单号、采购订单行项目号、供应商批次、物料编码、台份号、台份阶段) → WMS_Stocks
- POST /api/app/stock/expire-alarm-pages — 生产日期告警分页 → WMS_Stocks
- POST /api/app/stock/export-expire-alarm — 生产日期告警导出 → WMS_Stocks
- POST /api/app/stock/export-oil-seal-alarm — 油封告警导出 → WMS_OilSealOrders
- POST /api/app/stock/export-product-batch — 导出零件批次 → WMS_ProductBatchs
- POST /api/app/stock/export-recheck-alarm — 复验告警导出 → WMS_Stocks
- POST /api/app/stock/export-stock — 库存导出（支持 xlsx/csv/html，通过 input.ExportFormat 指定，默认 xlsx） → WMS_Stocks
- POST /api/app/stock/export-stock-history — 库存变动导出 → WMS_StockHistorys
- POST /api/app/stock/freeze-stock — 冻结库存 → WMS_Stocks
- POST /api/app/stock/import-batch-info — 导入物料批次历史数据：按 物料(物料编码) + 供应商批次 + 批次 匹配已有物料批次， 把 Excel 中的 制造版次、台份号 回填到物料批次上。 → WMS_Stocks
- POST /api/app/stock/import-product-batch-engine-set — 导入物料批次的台份/制造版次。 Excel 四列：物料编码、SAP批次号、台份、制造版次。 按 物料编码 + SAP批次号 定位物料批次行，批次行的台份/制造版次为空时回填 Excel 对应值： 逐字段判断，Excel 未填的列跳过，批次行已有值的字段不覆盖；同一物料+SAP批次对应多条批次行(不同供应商批次)时， 所有空值行一起回填；台份号不做主数据存在性校验。 成功与失败行都逐行返回，供前端表格展示。 大文件支持：按块(每块3000行)查询与保存，IN 值控制在小块内；更新走 BulkExtensions 批量写库， 查询全部 AsNoTracking，十几万行导入也不会打爆数据库与内存。 → WMS_ProductBatchs
- POST /api/app/stock/import-product-batch-sap — 导入更新物料批次的SAP批次。 Excel 三列：物料编码、供应商批次、SAP批次。 按 物料编码 + 供应商批次 定位【SAP批次为空】的物料批次行并刷入 SAP批次(ItemBatch)： 已有SAP批次的行不参与匹配；SAP批次为空的候选行必须唯一，0行或多行都不更新（结果中标注原因）。 成功与失败行都逐行返回，供前端表格展示。 → WMS_ProductBatchs
- POST /api/app/stock/import-refresh-engine-set — 导入Excel批量刷新台份号/台份阶段 → WMS_Stocks
- POST /api/app/stock/import-stock — 导入期初库存 → WMS_Stocks
- POST /api/app/stock/oil-seal-alarm-pages — 油封告警分页 → WMS_OilSealOrders
- POST /api/app/stock/page-list-sort — 分页查询库存分页(PC/PDA共用 支持动态排序) → WMS_Stocks
- POST /api/app/stock/pass-fail-bill-list — 过账失败单据报表 → WMS_Stocks
- POST /api/app/stock/product-batch — 创建零件批次 → WMS_ProductBatchs
- POST /api/app/stock/product-batch-pages — 零件批次分页 → WMS_ProductBatchs
- POST /api/app/stock/product-qr-label-pdf — 打印物料标签PDF(根据库存Id集合,复用GetPrintLabelAsync的标签数据,一料一页) → WMS_Products
- POST /api/app/stock/recheck-alarm-pages — 复验告警分页 → WMS_Stocks
- POST /api/app/stock/record-stock-period — 三期录入（从告警页面直接录入，只填本次日期，支持批量） 根据录入类型自动使用库存上已有的周期天数推算下次日期，并记录三期录入流水 → WMS_Stocks
- POST /api/app/stock/stock-diff-report-list — 库存属性差异报表 比较库存的工厂/库存地点属性与所在库区绑定的工厂/库存地点属性，任一不一致即为差异数据 → WMS_Stocks
- POST /api/app/stock/stock-history-pages — 库存变动分页 → WMS_StockHistorys
- POST /api/app/stock/stock-lock-detail-list — 库存锁定报表详情 → WMS_Stocks
- POST /api/app/stock/stock-lock-pages — 库存锁定报表 → WMS_Stocks
- POST /api/app/stock/stock-taking-sheet-pdf — 打印盘点表PDF(传入库存Id集合,按选中库存生成盘点表。 库房名称=所选库存的库存地点名称按/分割;旧物料号列取物料图号;计量单位关联字典表取名称; 账面数量预填,盘点数量/复盘数量/是否在保质期内/核查数量/备注留白供盘点时手工填写; 页脚含盘点人/复核人/盘点组长/稽核人/日期/页码-总页数) → WMS_Stocks
- POST /api/app/stock/un-freeze-stock — 解冻库存 → WMS_Stocks
- POST /api/app/stock/update-stock-info — 修改库存信息 → WMS_Stocks
- POST /api/app/stock/update-stock-periods — 修改库存3期（油封/复验/保质期）：修改数量=当前行可用数量时直接改当前行； 小于可用数量时拆行（原行扣减数量，生成一行带新3期的库存）。只改库存字段，不动批次表。 → WMS_Stocks
- PUT /api/app/stock/{id}/product-batch — 编辑零件批次 → WMS_ProductBatchs

## StockDiffAdjustment
- DELETE /api/app/stock-diff-adjustment — 批量删除盘点差异调整单 → WMS_StockDiffAdjustments
- GET /api/app/stock-diff-adjustment/stock-diff-adjustment/{stockDiffAdjustmentId} — 获取盘点差异调整单(单头)数据信息 → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment — 创建盘点差异调整单 → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/export-stock-diff-adjustment — 盘点差异调整单导出 → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/export-stock-diff-adjustment-full — 盘点差异调整单(包含头+明细)导出 → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/manual-pass — 批量手工过账（不调用SAP，直接调整库存） → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/pass-to-sap — 批量推送SAP过账 → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/select-stock-diff-adjustment-page — 获取可生成调整单的盘点单分页（支持动态查询） 条件：已完成盘点、存在未调整差异、差异类型与入参一致(过滤已经生成调整单的盘点单) → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/send-to-sap — 批量推送SAP生单 → WMS_StockDiffAdjustments
- POST /api/app/stock-diff-adjustment/stock-diff-adjustment-detail-page — 盘点差异调整单明细分页 → WMS_StockDiffAdjustmentDetails
- POST /api/app/stock-diff-adjustment/stock-diff-adjustment-page — 盘点差异调整单分页 → WMS_StockDiffAdjustments
- PUT /api/app/stock-diff-adjustment/{id} — 更新盘点差异调整单 → WMS_StockDiffAdjustments

## StockIn
- GET /api/app/stock-in/bind-container-info — 获取物料详情 → WMS_Containers
- GET /api/app/stock-in/bind-record-detail-pages — 获取码盘记录明细数据 → WMS_BindRecords
- GET /api/app/stock-in/bind-record-pages — 获取码盘记录汇总数据 → WMS_BindRecords
- GET /api/app/stock-in/product-select — 获取物料信息下拉框 → WMS_Products
- GET /api/app/stock-in/stock-in-business-type — 获取入库单业务类型下拉接口 → WMS_StockIns
- GET /api/app/stock-in/stock-in-detail-pages — 获取入库单明细行详情 → WMS_StockIns
- GET /api/app/stock-in/stock-in-order-state-type — 获取入库单状态 → WMS_StockIns
- GET /api/app/stock-in/stock-in-pages — 获取入库单单头信息 → WMS_StockIns
- GET /api/app/stock-in/stock-inbind-records — 获取组盘记录 → WMS_Stocks
- GET /api/app/stock-in/warehouse-select — 获取归属仓库下拉 → WMS_Warehouses
- POST /api/app/stock-in/batch-import-stock-in — 批量导入入库单 → WMS_StockIns
- POST /api/app/stock-in/build-self-stock-in — 自建入库单 → WMS_StockIns
- POST /api/app/stock-in/cancle-bind-record — 撤销码盘 → WMS_BindRecords
- POST /api/app/stock-in/conifrm-stock-ins — 确认订单 → WMS_Stocks
- POST /api/app/stock-in/delete-stock-in — 删除入库单 → WMS_StockIns
- POST /api/app/stock-in/delete-stock-in-detail — 删除入库单明细 → WMS_StockIns
- POST /api/app/stock-in/dipose-stock-in — 手动结束入库单 → WMS_StockIns
- POST /api/app/stock-in/down-batch-stock-template — 入库单批量导入模板下载 → WMS_Stocks
- POST /api/app/stock-in/down-stock-in-template — 入库单导入模板下载 → WMS_StockIns
- POST /api/app/stock-in/export-bind-record — 码盘记录汇总导出 → WMS_BindRecords
- POST /api/app/stock-in/export-bind-record-detail — 码盘记录明细导出 → WMS_BindRecords
- POST /api/app/stock-in/export-stock-in — 入库单详情导出 → WMS_StockIns
- POST /api/app/stock-in/get-menu-key-value → WMS_StockIns
- POST /api/app/stock-in/import-stock-in-old — 导入入库单 → WMS_StockIns
- POST /api/app/stock-in/temp-store-stock-in — 暂存入库单信息 → WMS_StockIns
- POST /api/app/stock-in/update-stock-in-detail — 编辑入库单明细 → WMS_StockIns
- PUT /api/app/stock-in/stock-in/{StockInId} — 更新入库单 → WMS_StockIns

## StockOut
- DELETE /api/app/stock-out/pick-task/{pickTaskId} — 删除拣货任务 → WMS_PickTasks
- DELETE /api/app/stock-out/stock-out — 删除出库单 → WMS_StockOuts
- GET /api/app/stock-out/diagnose-manual-stock-group-filter — 现场库存查询过滤条件诊断：输入库存Id、业务节点编码、移动类型， 按 ManualStockGroupPagesAsync 的过滤链路逐条判断该库存被哪个条件排除，返回结构化诊断结果 → WMS_Stocks
- GET /api/app/stock-out/pick-and-stock-out-info-for-print — 打印出库信息卡(拣货单表头) → WMS_StockOuts
- GET /api/app/stock-out/pick-by-id/{entityId} — 根据Id获取拣货单 → WMS_Picks
- GET /api/app/stock-out/pick-list-for-print — 打印拣货单(拣货单表头) → WMS_Picks
- GET /api/app/stock-out/pick-state — 获取拣货单状态 → WMS_Picks
- GET /api/app/stock-out/pick-task-info-for-reprint — 按拣货任务明细补打信息卡(不更新拣货单打印计数) → WMS_PickTasks
- GET /api/app/stock-out/pick-user-select — 获取拣货人下拉 → WMS_Picks
- GET /api/app/stock-out/stock-out-by-id/{entityId} — 根据Id获取出库单 → WMS_StockOuts
- GET /api/app/stock-out/stock-out-list-for-print — 打印领用单(出库单标题栏) → WMS_StockOuts
- GET /api/app/stock-out/stock-out-order-state-type — 获取出库单状态 → WMS_StockOuts
- GET /api/app/stock-out/stock-out-print-pdf-by-sap → WMS_StockOuts
- POST /api/app/stock-out/abandon-stock-out — 出库单作废 → WMS_StockOuts
- POST /api/app/stock-out/abandon-stock-out-detail — 出库单明细作废 → WMS_StockOuts
- POST /api/app/stock-out/auto-allocation — 自动分配 → WMS_StockOuts
- POST /api/app/stock-out/batch-send-to-oa — 批量发送BPM审批 逐单独立事务处理：成功的单据即时提交，失败的单据不影响已成功的单据。 → WMS_StockOuts
- POST /api/app/stock-out/cancel-pick — 取消拣选单 → WMS_Picks
- POST /api/app/stock-out/dispose-pick-task — 拣货任务取消分配 → WMS_PickTasks
- POST /api/app/stock-out/dispose-stock-out — 出库单取消分配 → WMS_StockOuts
- POST /api/app/stock-out/dispose-stock-out-detail — 出库单明细取消分配 → WMS_StockOuts
- POST /api/app/stock-out/download-stock-out-detail-template — 下载出库单明细导入模板 → WMS_StockOuts
- POST /api/app/stock-out/export-pick — 拣货单导出 → WMS_Picks
- POST /api/app/stock-out/export-pick-task — 拣货任务导出 → WMS_PickTasks
- POST /api/app/stock-out/export-stock-out — 出库信息导出 → WMS_StockOuts
- POST /api/app/stock-out/export-stock-out-detail — 出库单明细导出 → WMS_StockOuts
- POST /api/app/stock-out/generate-pick — 生成拣货单 → WMS_Picks
- POST /api/app/stock-out/generate-pick-task — 生成拣货任务 → WMS_PickTasks
- POST /api/app/stock-out/generate-stock-out-pdf — 生成产品领用单pdf → WMS_StockOuts
- POST /api/app/stock-out/get-product-stock-out-detail-pages — 获取生产领用出库单明细分页数据信息 → WMS_StockOuts
- POST /api/app/stock-out/import-stock-out-detail — 导入出库单明细 → WMS_StockOuts
- POST /api/app/stock-out/kit-check — 齐套性检查 → WMS_StockOuts
- POST /api/app/stock-out/manual-allocation — 手工分配 → WMS_StockOuts
- POST /api/app/stock-out/manual-finish-stock-out — 强制完成出库单 → WMS_StockOuts
- POST /api/app/stock-out/manual-pick-for-web — PC拣选 → WMS_Picks
- POST /api/app/stock-out/manual-post-stock-out — 手工过账(按整单过账, Ids为出库单Id列表) → WMS_StockOuts
- POST /api/app/stock-out/manual-post-stock-out-detail — 手工过账(按明细行过账, 支持批量, 一次只能过一张出库单, Ids为出库单明细Id列表) → WMS_StockOuts
- POST /api/app/stock-out/manual-stock-group-pages — 获取分组库存 → WMS_Stocks
- POST /api/app/stock-out/manual-stock-out-detail-pages — 手动分配出库单明细 → WMS_StockOuts
- POST /api/app/stock-out/manual-stock-pages — 手动分配库存明细 → WMS_Stocks
- POST /api/app/stock-out/manual-verify-for-web — PC复核 → WMS_StockOuts
- POST /api/app/stock-out/pass-stock-out — 通用出库过账 → WMS_StockOuts
- POST /api/app/stock-out/pick-pages — 获取拣货单分页数据信息 → WMS_Picks
- POST /api/app/stock-out/pick-task-pages — 获取拣货任务分页数据信息 → WMS_PickTasks
- POST /api/app/stock-out/re-assign-picker — 转派拣选人 → WMS_StockOuts
- POST /api/app/stock-out/rush-pick — 拣货单加急 → WMS_Picks
- POST /api/app/stock-out/send-posting-to-sap — 整单发送SAP过账 → WMS_StockOuts
- POST /api/app/stock-out/send-posting-to-sap-by-detail — 根据明细发送SAP过账 → WMS_StockOuts
- POST /api/app/stock-out/send-posting-to-sap-by-detail-queue — 异步过账(按明细行Id, 一次只能操作一个出库单) → WMS_StockOuts
- POST /api/app/stock-out/send-posting-to-sap-by-queue — 异步过账 → WMS_StockOuts
- POST /api/app/stock-out/send-stock-out — 通用发送 → WMS_StockOuts
- POST /api/app/stock-out/send-to-oa — 发送BPM审批 → WMS_StockOuts
- POST /api/app/stock-out/send-to-sap — 单据推送SAP → WMS_StockOuts
- POST /api/app/stock-out/send-to-single — 单件码推送 → WMS_StockOuts
- POST /api/app/stock-out/single-stock-out-detail-pages — 获取出库订单明细分页数据信息 → WMS_StockOuts
- POST /api/app/stock-out/stock-out — 创建出库单 → WMS_StockOuts
- POST /api/app/stock-out/stock-out-detail-pages — 获取出库订单明细分页数据信息 → WMS_StockOuts
- POST /api/app/stock-out/stock-out-pages — 获取出库订单分页数据信息 → WMS_StockOuts
- PUT /api/app/stock-out/stock-out/{stockOutId} — 更新出库单 → WMS_StockOuts

## StockProjectTransfer
- DELETE /api/app/stock-project-transfer/d-stock-project-transfer/{stockTransferId} — 删除项目间/物料调拨 → WMS_StockProjectTransfers
- GET /api/app/stock-project-transfer/stock-project-transfer-by-id/{entityId} — 根据Id获取项目调拨单 → WMS_StockProjectTransfers
- POST /api/app/stock-project-transfer/export-stock-project-transfer — 项目间调拨单导出 → WMS_StockProjectTransfers
- POST /api/app/stock-project-transfer/pass-stock-project-transfer — 过账推送SAP → WMS_StockProjectTransfers
- POST /api/app/stock-project-transfer/send-stock-project-transfer/{stockTransferId} — 单据推送SAP → WMS_StockProjectTransfers
- POST /api/app/stock-project-transfer/stock-project-transfer — 创建调拨单 → WMS_StockProjectTransfers
- POST /api/app/stock-project-transfer/stock-project-transfer-detail-pages — 调拨明细分页查询 → WMS_StockProjectTransferDetails
- POST /api/app/stock-project-transfer/stock-project-transfer-pages — 调拨单分页查询 → WMS_StockProjectTransfers
- PUT /api/app/stock-project-transfer/stock-project-transfer/{stockTransferId} — 更新调拨单 → WMS_StockProjectTransfers

## StockTransfer
- DELETE /api/app/stock-transfer/stock-transfer — 删除库存调拨单 → WMS_StockTransfers
- GET /api/app/stock-transfer/stock-transfer-business-select-type — 获取库存调拨单业务类型下拉接口 → WMS_StockTransfers
- GET /api/app/stock-transfer/stock-transfer-operate-records-by-bill-no — 获取库存调拨上下架操作记录列表（不分页） → WMS_StockTransferOperateRecords
- GET /api/app/stock-transfer/stock-transfer-state-type — 获取库存调拨单状态 → WMS_StockTransfers
- GET /api/app/stock-transfer/stock-transfer-type — 获取库存调拨单调拨类型下拉接口 → WMS_StockTransfers
- GET /api/app/stock-transfer/transfer-head/{stockTransferId} — 根据调拨单Id获取库存调拨单(单头)信息 → WMS_StockTransfers
- POST /api/app/stock-transfer/cancel-confirm-stock-transfer — 取消确认转移(单头状态退回到暂存) → WMS_StockTransfers
- POST /api/app/stock-transfer/confirm-stock-transfer — 确认转移库存调拨单(模拟SAP生单成功,不调用SAP接口) → WMS_StockTransfers
- POST /api/app/stock-transfer/download-stock-transfer-template — 下载库存地点转换导入模板 → WMS_StockTransfers
- POST /api/app/stock-transfer/export-stock-transfer-detail-full — 库存调拨(包含头和明细)信息导出 → WMS_StockTransfers
- POST /api/app/stock-transfer/export-stock-transfer-head — 库存调拨单(单头)导出 → WMS_StockTransfers
- POST /api/app/stock-transfer/export-stock-transfer-record — 库存调拨信息导出 → WMS_StockTransfers
- POST /api/app/stock-transfer/handle-post-sap-success — SAP过账成功后的统一处理：更新单据状态、释放目标库存锁定、更新目标特殊库存标识、同维度库存合并 → WMS_StockTransfers
- POST /api/app/stock-transfer/import-stock-transfer — 导入库存地点转换明细行(单头字段由接口传入,解析校验Excel后逐行返回,前端填入新增弹窗明细行,不直接建单) → WMS_StockTransfers
- POST /api/app/stock-transfer/manual-post-stock-transfer — 手工过账 → WMS_StockTransfers
- POST /api/app/stock-transfer/manual-post-stock-transfer-detail — 库存调拨单明细手动过账(按勾选的明细行过账,不调用SAP,本地标记过账成功) → WMS_StockTransfers
- POST /api/app/stock-transfer/re-send-posting-to-sap — 重新发送SAP过账 → WMS_StockTransfers
- POST /api/app/stock-transfer/send-detail-posting-to-sap — 库存调拨单明细推送SAP过账(按勾选的明细行过账) → WMS_StockTransfers
- POST /api/app/stock-transfer/send-to-sap — 单据推送SAP → WMS_StockTransfers
- POST /api/app/stock-transfer/stock-transfer — 创建库存调拨单 → WMS_StockTransfers
- POST /api/app/stock-transfer/stock-transfer-detail-full-pages — 获取库存调拨单(包含头和明细)分页数据信息 → WMS_StockTransfers
- POST /api/app/stock-transfer/stock-transfer-detail-pages — 获取库存调拨单明细分页数据信息 → WMS_StockTransfers
- POST /api/app/stock-transfer/stock-transfer-head-pages — 获取库存调拨单(单头)分页数据信息 → WMS_StockTransfers
- POST /api/app/stock-transfer/stock-transfer-operate-record-pages — 获取库存调拨上下架操作记录分页数据 → WMS_StockTransferOperateRecords
- PUT /api/app/stock-transfer/stock-transfer/{stockTransferId} — 更新库存调拨单 → WMS_StockTransfers

## SysServer
- GET /api/app/sys-server/server-base — 获取服务器配置信息 → 未映射
- GET /api/app/sys-server/server-disk — 获取服务器磁盘信息 → 未映射
- GET /api/app/sys-server/server-used — 获取服务器使用信息 → 未映射

## TemplateConfig
- DELETE /api/app/template-config/{id} — 删除模板配置 → WMS_TemplateConfigs
- DELETE /api/app/template-config/{id}/default-value — 删除模板配置默认值 → WMS_TemplateConfigDefaultValues
- GET /api/app/template-config/{id} — 根据Id获取模板配置详情 → WMS_TemplateConfigs
- GET /api/app/template-config/{id}/default-value — 根据Id获取模板配置默认值详情 → WMS_TemplateConfigDefaultValues
- GET /api/app/template-config/item-template-configs/{parentTemplateId} — 根据父模板配置Id获取所有子明细模板配置列表 → WMS_TemplateConfigs
- POST /api/app/template-config — 创建模板配置 → WMS_TemplateConfigs
- POST /api/app/template-config/default-value — 创建模板配置默认值 → WMS_TemplateConfigDefaultValues
- POST /api/app/template-config/export-template-config-default-value — 库存调拨信息导出 → WMS_TemplateConfigDefaultValues
- POST /api/app/template-config/template-config-default-value-pages — 分页查询模板配置默认值列表 → WMS_TemplateConfigDefaultValues
- POST /api/app/template-config/template-config-pages — 分页查询模板配置列表 → WMS_TemplateConfigs
- PUT /api/app/template-config/{id} — 更新模板配置 → WMS_TemplateConfigs
- PUT /api/app/template-config/{id}/default-value — 更新模板配置默认值 → WMS_TemplateConfigDefaultValues

## Tenant
- DELETE /api/app/tenant/{id} → 未映射
- DELETE /api/app/tenant/{id}/default-connection-string → WMS_TemplateConfigDefaultValues
- GET /api/app/tenant → 未映射
- GET /api/app/tenant/{id} → 未映射
- GET /api/app/tenant/{id}/default-connection-string → WMS_TemplateConfigDefaultValues
- GET /api/app/tenant/all → 未映射
- POST /api/app/tenant → 未映射
- PUT /api/app/tenant/{id} → 未映射
- PUT /api/app/tenant/{id}/default-connection-string → WMS_TemplateConfigDefaultValues

## TestBack
- GET /api/app/test-back/cargo-location-list-for-view/{roadWayId} → WMS_CargoLocations
- POST /api/app/test-back/init-location — 初始化库位（针对大数据量优化，支持 20 万+ 记录） → WMS_Area_SapStorageLocation
- POST /api/app/test-back/init-ltk-cargo-list → WMS_CargoLocations
- POST /api/app/test-back/init-my-stock — 初始化库存（针对大数据量优化，支持 20 万+ 记录） → WMS_Stocks
- POST /api/app/test-back/init-product-batch — 初始化批次（针对大数据量优化，支持 20 万+ 记录） → WMS_ProductBatchs
- POST /api/app/test-back/long-hai-lan/{userFieldConfigurationId} — 龙海兰 → WMS_BackgroundWorkerConfigs
- POST /api/app/test-back/test-default-info — 初始化虚拟托盘与库位 → WMS_TemplateConfigDefaultValues
- POST /api/app/test-back/test-product-unit — 根据物料生成单位字典 → WMS_Products
- POST /api/app/test-back/test-serach-container-type → WMS_ContainerTypes

## Tv
- DELETE /api/app/tv/foreign-keys → 未映射

## UserFieldConfig
- GET /api/app/user-field-config/admin-config — 获取字段配置 → WMS_UserFieldConfigurations
- GET /api/app/user-field-config/config — 获取字段配置 → WMS_UserFieldConfigurations
- POST /api/app/user-field-config/reset-config — 重置为默认配置（删除用户自定义配置） → WMS_UserFieldConfigurations
- POST /api/app/user-field-config/save-config — 保存字段配置 → WMS_UserFieldConfigurations

## Warehouse
- DELETE /api/app/warehouse/area/{areaId} — 删除库区 → WMS_Areas
- DELETE /api/app/warehouse/cargo-location/{cargoLocationId} — 删除库位 → WMS_CargoLocations
- DELETE /api/app/warehouse/container-type/{containerTypeId} — 删除容器类型信息 → WMS_ContainerTypes
- DELETE /api/app/warehouse/container/{containerId} — 删除容器信息 → WMS_Containers
- DELETE /api/app/warehouse/grade/{gradeId} — 删除等级信息 → WMS_Grades
- DELETE /api/app/warehouse/logistics-company/{logisticsCompanyId} — 删除物流公司信息 → WMS_LogisticsCompanies
- DELETE /api/app/warehouse/region/{regionId} — 删除区域信息 → WMS_Regions
- DELETE /api/app/warehouse/road-way/{roadWayId} — 删除巷道信息 → WMS_RoadWays
- DELETE /api/app/warehouse/shelf/{shelfId} — 删除货架信息 → WMS_Shelves
- DELETE /api/app/warehouse/shipper/{shipperId} — 删除出货方信息 → WMS_Shippers
- DELETE /api/app/warehouse/staging/{stagingId} — 删除工作台信息 → WMS_Stagings
- DELETE /api/app/warehouse/supplier/{supplierId} — 删除供应商信息 → WMS_Suppliers
- DELETE /api/app/warehouse/warehouse/{warehouseId} — 删除仓库信息 → WMS_Warehouses
- GET /api/app/warehouse/agv-region-select — 获取AGV区域下拉框 → WMS_Regions
- GET /api/app/warehouse/area-by-id/{areaId} — 根据ID获取单条数据 → WMS_Areas
- GET /api/app/warehouse/area-sap-storage-locations/{areaId} — 获取库区关联的库存地点列表 → WMS_Area_SapStorageLocation
- GET /api/app/warehouse/area-select — 获取库区下拉框数据 → WMS_Areas
- GET /api/app/warehouse/cargo-location-by-code — 按货位编码查询货位（PDA 扫码使用，用 WarehouseLocationCode 反查 CargoLocationDto） → WMS_CargoLocations
- GET /api/app/warehouse/cargo-location-by-id/{cargoLocationId} — 根据ID获取单条数据 → WMS_CargoLocations
- GET /api/app/warehouse/cargo-location-depth — 获取通道数据 → WMS_CargoLocationDepths
- GET /api/app/warehouse/cargo-location-print-infos → WMS_CargoLocations
- GET /api/app/warehouse/cargo-location-select — 获取库位下拉框数据 → WMS_CargoLocations
- GET /api/app/warehouse/container-by-id/{containerId} — 根据ID获取单条数据 → WMS_Containers
- GET /api/app/warehouse/container-info — 获取空容器展示信息 → WMS_Containers
- GET /api/app/warehouse/container-shape-type-select — 获取容器属性 枚举下拉框数据 → WMS_Containers
- GET /api/app/warehouse/container-type-by-id/{containerTypeId} — 根据ID获取单条数据 → WMS_ContainerTypes
- GET /api/app/warehouse/container-type-print-select — 获取容器类型打印下拉 → WMS_ContainerTypes
- GET /api/app/warehouse/container-type-print-select-print — 获取容器类型打印下拉 → WMS_ContainerTypes
- GET /api/app/warehouse/container-type-select — 获取容器类型下拉框数据 → WMS_ContainerTypes
- GET /api/app/warehouse/directy — 测试接口 → WMS_Warehouses
- GET /api/app/warehouse/engine-sn-select — 台份下拉 → WMS_Warehouses
- GET /api/app/warehouse/grade-by-id/{gradeId} — 根据ID获取单条数据 → WMS_Grades
- GET /api/app/warehouse/grade-select — 获取等级下拉框数据 → WMS_Grades
- GET /api/app/warehouse/in-or-out-cargo-location-select — 获取出入库口下拉 → WMS_CargoLocations
- GET /api/app/warehouse/load-status-select — 获取承载状态下拉框数据 → WMS_Warehouses
- GET /api/app/warehouse/location-data — 获得库位数据 → WMS_Warehouses
- GET /api/app/warehouse/location-type-select — 获取库位类型下拉框数据 → WMS_CargoLocationContainerTypes
- GET /api/app/warehouse/logistics-company-by-id/{logisticsCompanyId} — 根据ID获取单条物流公司数据 → WMS_LogisticsCompanies
- GET /api/app/warehouse/logistics-company-select — 获取物流公司下拉框数据 → WMS_LogisticsCompanies
- GET /api/app/warehouse/org-select — 获取公司下拉框数据 → WMS_Warehouses
- GET /api/app/warehouse/out-location-select — 获取出库口下拉 → WMS_Warehouses
- GET /api/app/warehouse/point-by-id/{pointId} — 根据ID获取单条数据 → WMS_Points
- GET /api/app/warehouse/point-select — 获取出入库点位下拉框数据 → WMS_Points
- GET /api/app/warehouse/point-type-select — 获取点位类型下拉框数据 → WMS_Points
- GET /api/app/warehouse/project-select — 项目下拉 → WMS_Projects
- GET /api/app/warehouse/region-by-id/{regionId} — 根据ID获取单条数据 → WMS_Regions
- GET /api/app/warehouse/region-enum-select — 获取区域属性下拉框数据 → WMS_Regions
- GET /api/app/warehouse/region-pda-business-select — 获取pda业务下拉框 → WMS_Regions
- GET /api/app/warehouse/region-select — 获取区域下拉框数据 → WMS_Regions
- GET /api/app/warehouse/region-type-select — · 获取区域下拉框数据-根据所属区域属性 → WMS_Regions
- GET /api/app/warehouse/road-way-select — 获取通道/货架下拉框数据 → WMS_RoadWays
- GET /api/app/warehouse/row-way-by-id/{roadWayId} — 根据ID获取单条数据通道信息 → WMS_Warehouses
- GET /api/app/warehouse/sap-storeage-location-by-area-id/{areaId} — 获取库区关联的库存地点列表（用于编辑时回显） → WMS_Warehouses
- GET /api/app/warehouse/shelf-by-id/{shelfId} — 根据ID获取单条货架信息 → WMS_Shelves
- GET /api/app/warehouse/shelf-select — 获取货架下拉框数据 → WMS_Shelves
- GET /api/app/warehouse/shipper-by-id/{shipperId} — 根据ID获取单条数据 → WMS_Shippers
- GET /api/app/warehouse/shipper-select — 获取出货方下拉框数据 → WMS_Shippers
- GET /api/app/warehouse/shipper-type-select — 获取出货方下拉框数据 → WMS_Shippers
- GET /api/app/warehouse/staging-by-id/{stagingId} — 根据ID获取单条数据 → WMS_Stagings
- GET /api/app/warehouse/staging-select — 获取工作台下拉框数据 → WMS_Stagings
- GET /api/app/warehouse/staging-type-select — 获取工作台下拉框数据 → WMS_Stagings
- GET /api/app/warehouse/supplier-by-id/{supplierId} — 根据ID获取单条数据 → WMS_Suppliers
- GET /api/app/warehouse/supplier-select — 获取供应商下拉框数据 → WMS_Suppliers
- GET /api/app/warehouse/system-data — 获取系统菜单 → WMS_Warehouses
- GET /api/app/warehouse/usage-status-select — 使用状态下拉 → WMS_Warehouses
- GET /api/app/warehouse/warehouse-by-id/{warehouseId} — 根据ID获取单条数据 → WMS_Warehouses
- GET /api/app/warehouse/warehouse-reports — 库位统计报表 → WMS_Warehouses
- GET /api/app/warehouse/warehouse-select — 获取仓库下拉框数据 → WMS_Warehouses
- POST /api/app/warehouse/area — 创建库区 → WMS_Areas
- POST /api/app/warehouse/area-list — 获取库区分页数据（支持动态查询） → WMS_Areas
- POST /api/app/warehouse/area-sap-storage-locations-page — 获取库区库存地点分页数据（支持动态查询） → WMS_Area_SapStorageLocation
- POST /api/app/warehouse/batch-set-cargo-location-area — 批量设置库位库区 → WMS_CargoLocations
- POST /api/app/warehouse/bind-container-cargo-location/{containerId} — 绑定容器库位（根据容器ID及库位编码进行绑定） → WMS_CargoLocations
- POST /api/app/warehouse/cargo-location — 创建库位 → WMS_CargoLocations
- POST /api/app/warehouse/cargo-location-list — 获取库位分页数据（支持动态查询） → WMS_CargoLocations
- POST /api/app/warehouse/cargo-location-sort-list — 获取库位分页数据-排序（支持动态查询） → WMS_CargoLocations
- POST /api/app/warehouse/container — 创建容器信息 → WMS_Containers
- POST /api/app/warehouse/container-list — 获取容器分页信息数据（支持动态查询） → WMS_Containers
- POST /api/app/warehouse/container-sort-list — 获取容器分页信息数据-排序（支持动态查询） → WMS_Containers
- POST /api/app/warehouse/container-type — 创建容器类型 → WMS_ContainerTypes
- POST /api/app/warehouse/container-type-list — 获取容器类型分页数据信息（支持动态查询） → WMS_ContainerTypes
- POST /api/app/warehouse/export-area — 库区信息导出 → WMS_Areas
- POST /api/app/warehouse/export-cargo-location — 库位信息导出 → WMS_CargoLocations
- POST /api/app/warehouse/export-container — 容器信息导出 → WMS_Containers
- POST /api/app/warehouse/export-container-type — 容器类型信息导出 → WMS_ContainerTypes
- POST /api/app/warehouse/export-grade — 等级信息导出 → WMS_Grades
- POST /api/app/warehouse/export-logistics-company — 物流公司导出 → WMS_LogisticsCompanies
- POST /api/app/warehouse/export-point — 出入库点位信息导出 → WMS_Points
- POST /api/app/warehouse/export-region — 区域信息导出 → WMS_Regions
- POST /api/app/warehouse/export-road-way — 通道信息导出 → WMS_RoadWays
- POST /api/app/warehouse/export-shelf — 货架信息导出 → WMS_Shelves
- POST /api/app/warehouse/export-shipper — 出货方信息导出 → WMS_Shippers
- POST /api/app/warehouse/export-staging — 工作台信息导出 → WMS_Stagings
- POST /api/app/warehouse/export-supplier — 供应商信息导出 → WMS_Suppliers
- POST /api/app/warehouse/export-warehouse — 仓库信息导出 → WMS_Warehouses
- POST /api/app/warehouse/get-container-image-base64String — 获取图片的Base64字符串 → WMS_Containers
- POST /api/app/warehouse/grade — 创建等级 → WMS_Grades
- POST /api/app/warehouse/grade-list — 获取等级分页数据信息（支持动态查询） → WMS_Grades
- POST /api/app/warehouse/init-shelf-cargo-locations/{shelfId} — 根据货架初始化库位 货位编码规则：货架号-层-列 → WMS_Shelves
- POST /api/app/warehouse/logistics-company — 创建物流公司 → WMS_LogisticsCompanies
- POST /api/app/warehouse/logistics-company-list — 获取物流公司分页数据信息（支持动态查询） → WMS_LogisticsCompanies
- POST /api/app/warehouse/many-cargo-location — 批量创建库位 → WMS_CargoLocations
- POST /api/app/warehouse/point — 创建出入库点位 → WMS_Points
- POST /api/app/warehouse/point-list — 获取出入库点位分页数据信息（支持动态查询） → WMS_Points
- POST /api/app/warehouse/refresh-cargo-pick-seq — 更新当前区域拣货顺序 → WMS_Picks
- POST /api/app/warehouse/region — 创建区域 → WMS_Regions
- POST /api/app/warehouse/region-list — 获取区域分页数据信息（支持动态查询） → WMS_Regions
- POST /api/app/warehouse/road-way — 创建巷道信息 → WMS_RoadWays
- POST /api/app/warehouse/road-way-list — 获取巷道分页信息（支持动态查询） → WMS_RoadWays
- POST /api/app/warehouse/set-area-sap-storage-locations — 设置库区关联的库存地点 → WMS_Area_SapStorageLocation
- POST /api/app/warehouse/shelf — 创建货架信息 → WMS_Shelves
- POST /api/app/warehouse/shelf-list — 获取货架分页信息（支持动态查询） → WMS_Shelves
- POST /api/app/warehouse/shipper — 创建出货方 → WMS_Shippers
- POST /api/app/warehouse/shipper-list — 获取出货方分页数据信息（支持动态查询） → WMS_Shippers
- POST /api/app/warehouse/staging — 创建工作台 → WMS_Stagings
- POST /api/app/warehouse/staging-list — 获取工作台分页数据信息（支持动态查询） → WMS_Stagings
- POST /api/app/warehouse/supplier — 创建供应商 → WMS_Suppliers
- POST /api/app/warehouse/supplier-list — 获取供应商分页数据信息（支持动态查询） → WMS_Suppliers
- POST /api/app/warehouse/unbind-container-cargo-location/{containerId} — 解绑容器库位（根据容器ID解除其与库位的绑定关系） → WMS_CargoLocations
- POST /api/app/warehouse/warehouse — 创建仓库 → WMS_Warehouses
- POST /api/app/warehouse/warehouse-list — 获取仓库分页数据信息（支持动态查询） → WMS_Warehouses
- PUT /api/app/warehouse/area/{areaId} — 编辑库区 → WMS_Areas
- PUT /api/app/warehouse/cargo-location/{cargoLocationId} — 编辑库位 → WMS_CargoLocations
- PUT /api/app/warehouse/container-type/{containerTypeId} — 编辑容器类型信息 → WMS_ContainerTypes
- PUT /api/app/warehouse/container/{containerId} — 编辑容器信息 → WMS_Containers
- PUT /api/app/warehouse/grade/{gradeId} — 编辑等级信息 → WMS_Grades
- PUT /api/app/warehouse/logistics-company/{logisticsCompanyId} — 编辑物流公司信息 → WMS_LogisticsCompanies
- PUT /api/app/warehouse/logo — 编辑logo → WMS_Warehouses
- PUT /api/app/warehouse/region/{regionId} — 编辑区域信息 → WMS_Regions
- PUT /api/app/warehouse/road-way/{roadWayId} — 编辑巷道信息 → WMS_RoadWays
- PUT /api/app/warehouse/shelf/{shelfId} — 编辑货架信息 → WMS_Shelves
- PUT /api/app/warehouse/shipper/{shipperId} — 编辑出货方信息 → WMS_Shippers
- PUT /api/app/warehouse/staging/{stagingId} — 编辑工作台信息 → WMS_Stagings
- PUT /api/app/warehouse/supplier/{supplierId} — 编辑供应商信息 → WMS_Suppliers
- PUT /api/app/warehouse/warehouse/{warehouseId} — 编辑仓库信息 → WMS_Warehouses

## Wcs
- POST /api/Wcs/apply-empty-container-inbound — 申请空托盘入库 → 外部接口
- POST /api/Wcs/apply-empty-container-outbound — 申请空托盘出库 → 外部接口
- POST /api/Wcs/apply-location — 申请具体货位 堆垛机库：扫码获取任务成功后第一次调用获取目的巷道，执行任务前第二次调用获取最终目的货位； 四向车/多穿车库：第一次调用获取目的层，第二次调用获取最终目的货位 → 外部接口
- POST /api/Wcs/apply-next-target — 申请下一个目标点 多穿车拣选出库场景：托盘是否需要搬运至另外的拣选台进行二次/多次拣选 → 外部接口
- POST /api/Wcs/apply-outbound-execute — 申请是否允许执行出库 深度为2的出库任务执行前申请；若深度1货位已有出库任务需移库，返回额外的目标货位 → 外部接口
- POST /api/Wcs/feedback-inbound-error — 回传入库异常信息 入库工位发生异常时，WCS将具体异常信息回传给WMS → 外部接口
- POST /api/Wcs/get-warehouse-location-status — 获取整库储位状态 → 外部接口
- POST /api/Wcs/notify-arrived-target — 到达目标位置通知 托盘到达对应出库工位时WCS通知WMS → 外部接口
- POST /api/Wcs/notify-leave-location — 通知离开储位 堆垛机从货架取货完成后，通知WMS托盘已离开当前储位 → 外部接口
- POST /api/Wcs/notify-task-complete — 通知任务完成 WCS完成任务后回调WMS，回调失败WCS会持续回调直到成功 → 外部接口

## WebMenu
- DELETE /api/app/web-menu/{id} → WMS_Menus
- GET /api/app/web-menu → WMS_Menus
- GET /api/app/web-menu/{id} → WMS_Menus
- GET /api/app/web-menu/button-list → WMS_Menus
- GET /api/app/web-menu/by-display-name/{SystemId} → WMS_Menus
- GET /api/app/web-menu/list → WMS_Menus
- GET /api/app/web-menu/list-tree → WMS_Menus
- GET /api/app/web-menu/list-tree/{systemId} → WMS_Menus
- POST /api/app/web-menu → WMS_Menus
- POST /api/app/web-menu/batch-update-sort → WMS_Menus
- POST /api/app/web-menu/copy-buttons → WMS_Menus
- POST /api/app/web-menu/init-borwer-button → WMS_Menus
- POST /api/app/web-menu/many-create → WMS_Menus
- PUT /api/app/web-menu/{id} → WMS_Menus

## WebMenuPermission
- GET /api/app/web-menu-permission/current-menus-tree → WMS_Menus
- GET /api/app/web-menu-permission/menus-tree-all → WMS_Menus
- PUT /api/app/web-menu-permission → WMS_Menus

## WebSystem
- DELETE /api/app/web-system/{id} → 未映射
- GET /api/app/web-system → 未映射
- GET /api/app/web-system/{id} → WMS_Menus
- GET /api/app/web-system/all → WMS_Menus
- GET /api/app/web-system/by-type → WMS_DictTypes
- GET /api/app/web-system/find-by-code → WMS_Menus
- GET /api/app/web-system/key-value-list → WMS_TemplateConfigDefaultValues
- POST /api/app/web-system → WMS_Menus
- PUT /api/app/web-system/{id} → WMS_Menus

## WebSystemPermission
- GET /api/app/web-system-permission/system-all → WMS_Menus
- PUT /api/app/web-system-permission → 未映射

## WmsTvMsg
- GET /api/app/wms-tv-msg/stock-in-error → WMS_StockIns
