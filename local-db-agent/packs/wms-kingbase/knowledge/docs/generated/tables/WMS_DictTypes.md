# WMS_DictTypes 字典类型

> 由 ABP 源码自动生成
## 用途
字典类型

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| Code | string | 否 | 类型编码 |
| Name | string | 否 | 类型名称 |
| IsEnum | bool | 否 | 是否枚举 |
| IsCustom | bool | 否 | 是否自定义 |
| OrderNo | int | 否 | 排序号 |
| Remark | string | 否 | 备注 |

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

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- POST /api/app/dict-type/dict-type-pages — 字典类型分页查询
- POST /api/app/dict-type/export-dict-type — 字典类型导出
- POST /api/app/dict-type/dict-type — 创建字典类型
- DELETE /api/app/dict-type/dict-type/{dictTypeId} — 删除字典类型
- PUT /api/app/dict-type/dict-type/{dictTypeId} — 更新字典类型
- GET /api/app/web-system/by-type
<!-- api:end -->
