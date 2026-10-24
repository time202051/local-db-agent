---
name: data-analysis
description: 通用数据库数据分析：趋势、对比、分布、异常、数据质量，适配任意库
when_to_use: 用户要分析数据/看趋势/找原因/做对比/查数据质量
version: 1
---

# 通用数据分析

## 步骤

1. **确认粒度**：先弄清一行数据代表什么（单据/明细/快照/事件）。粒度错了，所有数字都会错。
2. **确认指标定义**：计数（COUNT / COUNT DISTINCT）、求和（SUM）、比率（a/b）要分开；模糊时先问用户，不要猜。
3. **选表**：优先用系统给的候选表，注意 `primaryKey` / `foreignKeys` / `dateColumns`；没有外键时不要猜 join，先 profile。
4. **Profile 关键表**：用 `get_table_schema(detail="profile")` 一次拿到行数、日期范围、空值率、枚举 Top 值，替代多次探索 SQL。
5. **聚合查询**：用 `run_sql` 批量（2~6 条独立 SQL 一次提交）；禁止 `SELECT *`；带时间/状态/组织过滤；行数限制用 LIMIT 或 TOP。
6. **校验**：
   - 总数对得上吗（明细汇总 vs 主表计数）；
   - join 后行数有没有放大（1:N 忘了聚合是最常见错误）；
   - 空结果是不是过滤条件写错（对照 profile 的枚举值）；
   - 日期边界是闭区间还是开区间。
7. **对比与下钻**：趋势看时间聚合；排名看维度 Top N；异常项单独下钻一层。
8. **输出**：报告必须带 coverage；`missing` / `needs_review` 写清原因；`pending` 禁止出报告。

## 常用 SQL 模式

- 趋势：`GROUP BY date_trunc('day', time_col)`（金仓）或 `FORMAT(time_col, 'yyyy-MM')`（SQL Server）；
- 对比：两期同口径聚合后相除/相减，环比 = (本期-上期)/上期；
- 排名：`GROUP BY dim ORDER BY value DESC LIMIT/TOP 10`；
- 分布：`CASE WHEN` 分桶或固定步长分桶；
- 质量检查：`COUNT(*)` vs `COUNT(col)`、`COUNT(DISTINCT key)`、异常日期（未来/NULL）。

## 禁止

- 不知道粒度就出数；
- join 之后不检查行数放大就聚合；
- 把 profile 的 Top 值当全量结果（它是画像，不是精确统计）；
- 口径没确认就在报告里给数值（标 needs_review）。
