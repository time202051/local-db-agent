# WMS_Suppliers 供应商

> 由 ABP 源码自动生成
## 用途
供应商

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| PARTNER | string | 否 | 业务伙伴编号 |
| NAME1 | string | 否 | 业务伙伴名称 |
| BANKL | string | 否 | 银行代码 |
| BANKA | string | 否 | 银行名称 |
| CLIENT | string | 否 | 集团 |
| TYPE | string | 否 | 业务伙伴类别 |
| BU_GROUP | string | 否 | 业务伙伴分组 |
| ZBP_007 | string | 否 | 供应商性质 |
| ZBP_010 | string | 否 | 企业法人 |
| ZBP_012 | string | 否 | 纳税人主体身份 |
| ZBP_024 | string | 否 | 供应商状态 |
| ZZCZB | string | 否 | 注册资本 |
| ZQYLX | string | 否 | 企业类型 |
| ZBP_027 | string | 否 | 不良供应商标记 |
| ZBP_008 | string | 否 | 所属行业 |
| ZBP_001 | string | 否 | 供应商别名 |
| ZBP_002 | string | 否 | 工程研制类标识 |
| ZBP_003 | string | 否 | 研制保障条件建设类标识 |
| ZBP_004 | string | 否 | 技术研究类标识 |
| ZBP_005 | string | 否 | 工具和辅助材料类标识 |
| ZBP_006 | string | 否 | 综合类标识 |
| ZBP_009 | string | 否 | 供应商曾用名 |
| ZBP_011 | string | 否 | 产品分类 |
| ZBP_013 | string | 否 | NDA签署日期 |
| ZBP_014 | string | 否 | NDA截止日期 |
| ZBP_015 | string | 否 | 供应商分类 |
| ZBP_016 | string | 否 | 批准日期 |
| ZBP_017 | string | 否 | 批准状态 |
| ZBP_018 | string | 否 | 资质维护日期 |
| ZBP_019 | string | 否 | 资质有效期至 |
| ZBP_020 | string | 否 | 能力范围 |
| ZBP_021 | string | 否 | 对接主管 |
| ZBP_022 | string | 否 | 集团关联交易码 |
| ZBP_023 | string | 否 | 供应商分级 |
| ZBP_025 | string | 否 | 参与项目分级 |
| ZBP_026 | string | 否 | 批准范围 |
| ZBP_028 | string | 否 | 营业执照有效期-起始 |
| ZBP_029 | string | 否 | 营业执照有效期-截止 |
| ZBP_030 | string | 否 | 批准状态(综合类) |
| ZBP_031 | string | 否 | 批准状态(技术研究类) |
| ZBP_032 | string | 否 | 批准状态(研制保障条件建设类) |
| ZBP_034 | string | 否 | 批准状态(研发体系类) |
| ZBP_035 | string | 否 | 供应商类别(研发体系类标识) |
| ZBP_036 | string | 否 | 供应商非装机类别 |
| ZBP_037 | string | 否 | 供应商非装机状态 |
| ACCOUNTHOLDER | string | 否 | 帐户持有人姓名 |
| BANK_ACCT | string | 否 | 银行账号 |
| BANK_REF | string | 否 | 银行细目的参考明细 |
| SORTL | string | 否 | 排序字段 |
| STRAS | string | 否 | 街道和房屋号 |
| PSTLZ | string | 否 | 邮政编码 |
| LAND1 | string | 否 | 国家/地区代码 |
| REGIO | string | 否 | 地区 |
| AKONT | string | 否 | 总账中的对账科目 |
| WAERS | string | 否 | 采购订单货币 |
| ZTERM | string | 否 | 收付条件代码 |
| WEBRE | string | 否 | 基于收货的发票验证 |
| TAXNUMBER | string | 否 | 业务伙伴税号 |
| ERDAT | DateTime? | 是 | 记录创建日期 |
| LAEDA | DateTime? | 是 | 更改日期 |

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
- `PARTNER`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/data-sync/sync-supplier — 同步供应商数据
- POST /api/app/warehouse/supplier — 创建供应商
- DELETE /api/app/warehouse/supplier/{supplierId} — 删除供应商信息
- PUT /api/app/warehouse/supplier/{supplierId} — 编辑供应商信息
- POST /api/app/warehouse/supplier-list — 获取供应商分页数据信息（支持动态查询）
- POST /api/app/warehouse/export-supplier — 供应商信息导出
- GET /api/app/warehouse/supplier-select — 获取供应商下拉框数据
- GET /api/app/warehouse/supplier-by-id/{supplierId} — 根据ID获取单条数据
<!-- api:end -->
