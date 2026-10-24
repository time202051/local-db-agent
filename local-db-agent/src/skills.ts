import { existsSync, readFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

/**
 * 技能包：打包时固定，运行时只读。
 *
 * 目录约定：
 *   skills/<skill-name>/SKILL.md
 *   skills/<skill-name>/references/*.md
 *   skills/<skill-name>/assets/*
 *
 * SKILL.md 使用标准 YAML frontmatter：
 *   ---
 *   name: weekly-report
 *   description: 生成运营周报
 *   when_to_use: 用户说周报/本周运营情况
 *   ---
 *
 * 技能是“怎么做”的过程说明；数据库表说明、指标口径等事实知识仍放在 knowledge/。
 */

export interface SkillMetadata {
  name: string;
  description: string;
  whenToUse?: string;
  version?: string | number;
  appliesTo?: Record<string, unknown>;
}

export interface Skill extends SkillMetadata {
  folder: string;
  dir: string;
  entry: string;
  body: string;
  files: string[];
}

export interface SkillPack {
  dir: string;
  skills: Skill[];
  catalogText: string;
  search: (query: string, limit?: number) => Skill[];
  read: (name: string, maxChars?: number) => SkillReadResult | null;
  readFile: (name: string, path: string, maxChars?: number) => SkillFileReadResult | null;
}

export interface SkillReadResult {
  skill: Skill;
  content: string;
  truncated: boolean;
  files: string[];
}

export interface SkillFileReadResult {
  path: string;
  content: string;
  truncated: boolean;
}

export interface SkillStatus {
  loaded: boolean;
  count: number;
  reason?: string;
  errors?: string[];
}

export interface SkillLoadResult {
  pack: SkillPack | null;
  status: SkillStatus;
  errors: string[];
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = resolve(currentDir, '..', 'skills');
const MAX_SKILL_BYTES = 512 * 1024;
const MAX_SKILL_CHARS = 12000;
const MAX_FILE_CHARS = 6000;
const MAX_CATALOG_SKILLS = 20;
const MAX_CATALOG_CHARS = 2400;
const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.csv', '.sql']);

let cached: SkillLoadResult | undefined;

function skillsDir(): string {
  return process.env.AGENT_SKILLS_DIR || DEFAULT_DIR;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

interface ParsedSkillFile {
  data: Record<string, unknown>;
  body: string;
  error?: string;
}

function parseSkillFile(content: string): ParsedSkillFile {
  const text = stripBom(content);
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) {
    return { data: {}, body: text };
  }

  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch (error) {
    return {
      data: {},
      body: text.slice(match[0].length),
      error: `frontmatter 不是合法 YAML：${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (data == null) data = {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    return {
      data: {},
      body: text.slice(match[0].length),
      error: 'frontmatter 必须是 YAML 对象',
    };
  }
  return {
    data: data as Record<string, unknown>,
    body: text.slice(match[0].length),
  };
}

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function listTextFiles(skillDir: string, root = skillDir): string[] {
  if (!existsSync(skillDir)) return [];
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(skillDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(skillDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTextFiles(full, root));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.toLowerCase() === 'skill.md') continue;
    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    try {
      if (statSync(full).size > MAX_SKILL_BYTES) continue;
    } catch {
      continue;
    }
    out.push(relative(root, full).split('\\').join('/'));
  }
  return out.sort();
}

function safeReadPath(skillDir: string, requested: string): string | null {
  if (!requested || typeof requested !== 'string') return null;
  const clean = requested.trim().replace(/^\/+/, '');
  if (!clean || isAbsolute(clean)) return null;
  const full = normalize(join(skillDir, clean));
  const rel = relative(skillDir, full);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return full;
}

function readSkillFolder(folderDir: string, folder: string, errors: string[]): Skill | null {
  let entries: string[];
  try {
    entries = readdirSync(folderDir);
  } catch (error) {
    errors.push(
      `${folder}: 无法读取目录（${error instanceof Error ? error.message : String(error)}）`,
    );
    return null;
  }
  const entryName = entries.find((name) => name.toLowerCase() === 'skill.md');
  if (!entryName) {
    errors.push(`${folder}: 缺少 SKILL.md`);
    return null;
  }
  const entry = join(folderDir, entryName);
  let content: string;
  try {
    if (statSync(entry).size > MAX_SKILL_BYTES) {
      errors.push(`${folder}/SKILL.md 超过 ${MAX_SKILL_BYTES} 字节`);
      return null;
    }
    content = readFileSync(entry, 'utf8');
  } catch (error) {
    errors.push(
      `${folder}/SKILL.md 读取失败（${error instanceof Error ? error.message : String(error)}）`,
    );
    return null;
  }

  const parsed = parseSkillFile(content);
  if (parsed.error) {
    errors.push(`${folder}/SKILL.md: ${parsed.error}`);
    return null;
  }

  const name = textOf(parsed.data.name);
  if (!name) {
    errors.push(`${folder}/SKILL.md: frontmatter.name 必填`);
    return null;
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(name)) {
    errors.push(`${folder}/SKILL.md: name「${name}」只能包含字母/数字/中文/点/下划线/连字符`);
    return null;
  }
  const description = textOf(parsed.data.description);
  if (!description) {
    errors.push(`${folder}/SKILL.md: frontmatter.description 必填`);
    return null;
  }

  const whenToUse = textOf(parsed.data.when_to_use) || textOf(parsed.data.whenToUse);
  const version =
    typeof parsed.data.version === 'string' || typeof parsed.data.version === 'number'
      ? parsed.data.version
      : undefined;
  let appliesTo: Record<string, unknown> | undefined;
  if (parsed.data.appliesTo !== undefined && parsed.data.appliesTo !== null) {
    if (typeof parsed.data.appliesTo !== 'object' || Array.isArray(parsed.data.appliesTo)) {
      errors.push(`${folder}/SKILL.md: frontmatter.appliesTo 必须是对象`);
      return null;
    }
    appliesTo = parsed.data.appliesTo as Record<string, unknown>;
  }

  return {
    name,
    description,
    whenToUse,
    version,
    appliesTo,
    folder,
    dir: folderDir,
    entry,
    body: parsed.body.trim(),
    files: listTextFiles(folderDir),
  };
}

function buildCatalogText(skills: Skill[]): string {
  const lines = ['【可用技能（按需读取）】'];
  for (const skill of skills.slice(0, MAX_CATALOG_SKILLS)) {
    const description = skill.description.replace(/\s+/g, ' ').trim().slice(0, 160);
    const whenToUse = skill.whenToUse?.replace(/\s+/g, ' ').trim().slice(0, 80);
    lines.push(`- ${skill.name}：${description}${whenToUse ? `（适用：${whenToUse}）` : ''}`);
  }
  if (skills.length > MAX_CATALOG_SKILLS) {
    lines.push(`- 其余 ${skills.length - MAX_CATALOG_SKILLS} 个请用 list_skills(keyword) 查找`);
  }
  let text = lines.join('\n');
  if (text.length > MAX_CATALOG_CHARS) {
    text = `${text.slice(0, MAX_CATALOG_CHARS - 24)}\n…（目录已截断，用 list_skills 查找）`;
  }
  return text;
}

function buildSkillPack(dir: string): SkillLoadResult {
  if (!existsSync(dir)) {
    return {
      pack: null,
      status: { loaded: false, count: 0, reason: 'skills 目录不存在' },
      errors: [],
    };
  }

  const errors: string[] = [];
  const skills: Skill[] = [];
  const seen = new Map<string, string>();
  let folders: string[] = [];
  try {
    folders = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    errors.push(`skills 目录读取失败（${error instanceof Error ? error.message : String(error)}）`);
  }

  for (const folder of folders) {
    const skill = readSkillFolder(join(dir, folder), folder, errors);
    if (!skill) continue;
    const key = skill.name.toLowerCase();
    if (seen.has(key)) {
      errors.push(`${folder}: 技能名「${skill.name}」与 ${seen.get(key)} 重复`);
      continue;
    }
    seen.set(key, folder);
    skills.push(skill);
  }

  if (!skills.length) {
    return {
      pack: null,
      status: {
        loaded: false,
        count: 0,
        reason: errors.length ? '技能加载失败' : '没有可用的 SKILL.md',
        ...(errors.length ? { errors } : {}),
      },
      errors,
    };
  }

  const search = (query: string, limit = 20): Skill[] => {
    const keyword = String(query || '')
      .trim()
      .toLowerCase();
    const list = keyword
      ? skills.filter((skill) => {
          const haystack = [
            skill.name,
            skill.description,
            skill.whenToUse || '',
            JSON.stringify(skill.appliesTo || {}),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(keyword);
        })
      : skills;
    return list.slice(0, Math.max(1, limit));
  };

  const get = (name: string): Skill | undefined => {
    const key = String(name || '')
      .trim()
      .toLowerCase();
    return skills.find((skill) => skill.name.toLowerCase() === key);
  };

  const read = (name: string, maxChars = MAX_SKILL_CHARS): SkillReadResult | null => {
    const skill = get(name);
    if (!skill) return null;
    const content = skill.body.slice(0, maxChars);
    return {
      skill,
      content,
      truncated: skill.body.length > content.length,
      files: skill.files,
    };
  };

  const readFile = (
    name: string,
    requested: string,
    maxChars = MAX_FILE_CHARS,
  ): SkillFileReadResult | null => {
    const skill = get(name);
    if (!skill) return null;
    const full = safeReadPath(skill.dir, requested);
    if (!full || !existsSync(full)) return null;
    try {
      const stat = statSync(full);
      if (!stat.isFile() || stat.size > MAX_SKILL_BYTES) return null;
      const ext = full.slice(full.lastIndexOf('.')).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext)) return null;
      const content = readFileSync(full, 'utf8');
      const sliced = content.slice(0, maxChars);
      return {
        path: relative(skill.dir, full).split('\\').join('/'),
        content: sliced,
        truncated: content.length > sliced.length,
      };
    } catch {
      return null;
    }
  };

  const pack: SkillPack = {
    dir,
    skills,
    catalogText: buildCatalogText(skills),
    search,
    read,
    readFile,
  };
  return {
    pack,
    status: {
      loaded: true,
      count: skills.length,
      ...(errors.length ? { errors } : {}),
    },
    errors,
  };
}

export function loadSkills(dir?: string): SkillLoadResult {
  const result = buildSkillPack(dir || skillsDir());
  cached = result;
  return result;
}

function ensureLoaded(): void {
  if (cached !== undefined) return;
  cached = buildSkillPack(skillsDir());
}

export function getSkillPack(): SkillPack | null {
  ensureLoaded();
  return cached?.pack || null;
}

export function getSkillStatus(): SkillStatus {
  ensureLoaded();
  return cached?.status || { loaded: false, count: 0, reason: '技能未加载' };
}

/** 供测试/开发重载；生产包打包后不会变。 */
export function reloadSkills(dir?: string): SkillLoadResult {
  return loadSkills(dir);
}

export function parseSkillFrontmatter(content: string): ParsedSkillFile {
  return parseSkillFile(content);
}
