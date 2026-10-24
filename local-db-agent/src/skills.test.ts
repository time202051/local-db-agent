import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSystemPrompt } from './runtime.js';
import { createTools } from './tools.js';
import { getSkillStatus, loadSkills, parseSkillFrontmatter, reloadSkills } from './skills.js';
import type { ResolvedConfig } from './config.js';

const root = mkdtempSync(join(tmpdir(), 'agent-skills-'));
const emptyDir = mkdtempSync(join(tmpdir(), 'agent-skills-empty-'));
const skillDir = join(root, 'weekly-report');
const referencesDir = join(skillDir, 'references');
mkdirSync(referencesDir, { recursive: true });

writeFileSync(
  join(skillDir, 'SKILL.md'),
  `---
name: weekly-report
description: >
  生成运营周报，
  包含趋势和排名
when_to_use: 用户说周报
version: 2
appliesTo:
  database: ["WMS"]
---

# 运营周报

## 步骤
1. 查核心指标。
2. 查趋势和排名。
`,
  'utf8',
);
writeFileSync(join(referencesDir, 'metrics.md'), '# 指标\n\n- 出库单量\n- 及时率\n', 'utf8');

function config(): ResolvedConfig {
  return { db: { type: 'sqlserver' } } as unknown as ResolvedConfig;
}

function tool(name: string) {
  return createTools({ type: 'sqlserver' } as never).find((item) => item.name === name) as
    { invoke: (input: unknown) => Promise<unknown> } | undefined;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  return String((value as { content?: unknown } | null)?.content ?? '');
}

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(emptyDir, { recursive: true, force: true });
  reloadSkills();
});

describe('skills pack', () => {
  it('解析标准 frontmatter、folded description 和 references', () => {
    const result = loadSkills(root);
    expect(result.errors).toEqual([]);
    expect(result.pack?.skills).toHaveLength(1);
    const skill = result.pack?.skills[0];
    expect(skill?.name).toBe('weekly-report');
    expect(skill?.description).toContain('生成运营周报');
    expect(skill?.description).toContain('趋势');
    expect(skill?.whenToUse).toBe('用户说周报');
    expect(skill?.version).toBe(2);
    expect(skill?.appliesTo).toEqual({ database: ['WMS'] });
    expect(skill?.files).toEqual(['references/metrics.md']);
    expect(getSkillStatus()).toMatchObject({ loaded: true, count: 1 });
  });

  it('catalog 只含目录，read 才返回正文，readFile 读取参考文件', () => {
    const pack = loadSkills(root).pack;
    expect(pack?.catalogText).toContain('weekly-report');
    expect(pack?.catalogText).not.toContain('## 步骤');

    const read = pack?.read('weekly-report');
    expect(read?.content).toContain('## 步骤');
    expect(read?.content).not.toContain('when_to_use');
    expect(read?.files).toEqual(['references/metrics.md']);

    const file = pack?.readFile('weekly-report', 'references/metrics.md');
    expect(file?.content).toContain('出库单量');
    expect(pack?.readFile('weekly-report', '../SKILL.md')).toBeNull();
    expect(pack?.readFile('weekly-report', '/etc/passwd')).toBeNull();
  });

  it('search 按名称/描述/适用场景筛选', () => {
    const pack = loadSkills(root).pack;
    expect(pack?.search('趋势').map((skill) => skill.name)).toEqual(['weekly-report']);
    expect(pack?.search('不存在')).toEqual([]);
  });

  it('没有技能目录/空目录时正常降级', () => {
    const missing = loadSkills(join(emptyDir, 'missing'));
    expect(missing.pack).toBeNull();
    expect(missing.errors).toEqual([]);
    expect(missing.status.loaded).toBe(false);

    const empty = loadSkills(emptyDir);
    expect(empty.pack).toBeNull();
    expect(empty.errors).toEqual([]);
    expect(empty.status.reason).toContain('没有可用');
  });

  it('frontmatter 缺 description、重名时返回构建错误', () => {
    const badRoot = mkdtempSync(join(tmpdir(), 'agent-skills-bad-'));
    const bad = join(badRoot, 'bad');
    mkdirSync(bad, { recursive: true });
    writeFileSync(join(bad, 'SKILL.md'), '---\nname: bad\n---\n# bad\n', 'utf8');
    const badResult = loadSkills(badRoot);
    expect(badResult.pack).toBeNull();
    expect(badResult.errors.join(' ')).toContain('description');

    const duplicateRoot = mkdtempSync(join(tmpdir(), 'agent-skills-dup-'));
    for (const folder of ['one', 'two']) {
      const dir = join(duplicateRoot, folder);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'SKILL.md'),
        '---\nname: same-skill\ndescription: 重复技能\n---\n# dup\n',
        'utf8',
      );
    }
    const duplicateResult = loadSkills(duplicateRoot);
    expect(duplicateResult.errors.join(' ')).toContain('重复');
    expect(duplicateResult.pack?.skills).toHaveLength(1);
    rmSync(badRoot, { recursive: true, force: true });
    rmSync(duplicateRoot, { recursive: true, force: true });
  });

  it('工具和 prompt 只在有技能时注册/注入', () => {
    loadSkills(emptyDir);
    expect(tool('read_skill')).toBeUndefined();
    expect(buildSystemPrompt(config())).not.toContain('【可用技能');

    loadSkills(root);
    const readSkill = tool('read_skill');
    expect(readSkill).toBeDefined();
    const prompt = buildSystemPrompt(config());
    expect(prompt).toContain('【可用技能');
    expect(prompt).toContain('weekly-report');
    expect(prompt).toContain('read_skill');
  });

  it('read_skill 工具返回正文和文件列表', async () => {
    loadSkills(root);
    const output = text(
      await tool('read_skill')?.invoke({
        type: 'tool_call',
        id: 'skill-1',
        name: 'read_skill',
        args: { name: 'weekly-report' },
      }),
    );
    const parsed = JSON.parse(output) as {
      success: boolean;
      content: string;
      files: string[];
    };
    expect(parsed.success).toBe(true);
    expect(parsed.content).toContain('## 步骤');
    expect(parsed.files).toEqual(['references/metrics.md']);
  });

  it('list_skills / read_skill_file 工具可用', async () => {
    loadSkills(root);
    const listed = text(
      await tool('list_skills')?.invoke({
        type: 'tool_call',
        id: 'skill-list',
        name: 'list_skills',
        args: { keyword: '周报' },
      }),
    );
    const parsedList = JSON.parse(listed) as {
      skills: Array<{ name: string }>;
      total: number;
    };
    expect(parsedList.total).toBe(1);
    expect(parsedList.skills[0].name).toBe('weekly-report');

    const file = text(
      await tool('read_skill_file')?.invoke({
        type: 'tool_call',
        id: 'skill-file',
        name: 'read_skill_file',
        args: { name: 'weekly-report', path: 'references/metrics.md' },
      }),
    );
    const parsedFile = JSON.parse(file) as { success: boolean; content: string };
    expect(parsedFile.success).toBe(true);
    expect(parsedFile.content).toContain('出库单量');
  });

  it('parseSkillFrontmatter 支持 folded description', () => {
    const parsed = parseSkillFrontmatter(
      '---\nname: x\ndescription: >\n  第一行\n  第二行\n---\n# x\n',
    );
    expect(parsed.data.name).toBe('x');
    expect(String(parsed.data.description).trim()).toBe('第一行 第二行');
    expect(parsed.body).toContain('# x');
  });
});
