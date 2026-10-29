# WMS_DictDatas 字典数据

> 由 ABP 源码自动生成
## 用途
字典数据

## 字段
| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| DictTypeId | Guid | 否 | 字典类型ID |
| Code | string | 否 | 字典编码 |
| Name | string | 否 | 字典名称 |
| Value | int | 否 | 字典值 |
| TagType | string | 否 | 标签类型 |
| OrderNo | int | 否 | 排序号 |
| IsCustom | bool | 否 | 是否自定义 |
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
- `Id`、`DictTypeId`

## 关系
- WMS_DictTypes（1:N）：`WMS_DictDatas.DictTypeId = WMS_DictTypes.Id`

## 查询注意
- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。

<!-- api:start -->
## 相关接口
- GET /api/app/dict-data/dict-data-select — 按字典类型编码获取字典数据下拉
- POST /api/app/dict-data/dict-data-pages — 字典数据分页查询
- POST /api/app/dict-data/export-dict-data — 字典数据导出
- POST /api/app/dict-data/dict-data — 创建字典数据
- DELETE /api/app/dict-data/dict-data/{dictDataId} — 删除字典数据
- PUT /api/app/dict-data/dict-data/{dictDataId} — 更新字典数据
<!-- api:end -->
