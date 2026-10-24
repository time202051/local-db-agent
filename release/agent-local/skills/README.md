# 技能包

技能（skill）是“怎么做一类任务”的过程说明；表说明、指标口径、数据质量、预置查询等事实知识放在 `knowledge/`。

- `skills/` 随包发布、运行时加载。默认只带**通用能力**（如 `data-analysis`），不绑定行业；
- 行业/客户示例放在 `skills-example/`（不打包、不加载），要用时复制到 `skills/` 并替换占位内容；
- 打包前由客户后端生成，打包后运行时只读。一个客户一个包。

```
skills/                  # 随包发布
└─ data-analysis/        # 通用数据分析方法论
   └─ SKILL.md

skills-example/          # 仅参考，不打包
└─ weekly-report/        # 周报示例（复制到 skills/ 并按客户业务改写）
   ├─ SKILL.md
   └─ references/
      └─ report-sections.md
```

> `weekly-report` 是通用格式示例；正式客户包请替换为真实技能，不需要时直接删除。

## SKILL.md 格式

使用标准 YAML frontmatter，和 Claude Skills 一致：

```md
---
name: weekly-report
description: 生成运营周报，覆盖核心指标、趋势、排名和风险
when_to_use: 用户说“周报 / 本周 / 上周运营情况”
version: 1
appliesTo:
  database: ['YOUR_DATABASE']
---

# 运营周报

## 步骤

1. 确认数据截止日期和完整自然周；
2. 查核心指标；
3. 查趋势和排名；
4. 输出报告。
```

- `name`：必填，技能唯一名；建议英文小写 + 连字符；
- `description`：必填，写清技能做什么；
- `when_to_use`：可选，写清什么任务下使用；
- `version`：可选；
- `appliesTo`：可选，记录适用数据库/库名；一个客户一个包时主要作为说明。

## 运行时怎么用

- 系统提示只注入技能目录：`name + description + when_to_use`，不注入全文；
- 模型判断任务匹配后调用 `read_skill(name)` 读取完整步骤；
- 需要 `references/` 或 `assets/` 下的文本文件时调用 `read_skill_file(name, path)`；
- 技能里的 SQL、表名只是示例，执行前仍要确认当前库的表和字段；
- 不执行技能里的脚本。技能只作为流程说明，避免本地任意代码执行。

## 边界

- `knowledge/`：数据库是什么、表/字段含义、指标公式、数据缺口、预置查询；
- `skills/`：分析流程、异常怎么排查、报告分几节、先查什么后查什么；
- 报告模板属于过程性知识，放 `skills/<report>/SKILL.md`，不再放 `knowledge/reports/`；
- 表 profile（行数/日期范围/枚举/空值）是核心内置能力，不依赖任何知识包。

## 构建

```powershell
npm run skills:index
npm run release
```

- 校验 `skills/*/SKILL.md` 的 frontmatter、重名、路径和文件大小；
- 生成 `skills/.index.json`；
- 把 `skills/` 打进发布包；
- 没有 `skills/` 时 agent 正常运行，只是不注册技能工具；
- frontmatter 非法时构建失败。

运行时只读；修改技能 = 重新生成并重新打包。
