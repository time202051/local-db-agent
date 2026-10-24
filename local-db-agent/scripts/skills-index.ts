// Validate skills/*/SKILL.md and generate skills/.index.json.
// Run from the app directory: npm run skills:index
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSkills } from '../src/skills.js';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = process.env.AGENT_SKILLS_DIR || join(appDir, 'skills');

if (!existsSync(skillsDir)) {
  console.log('[skills] no skills directory; running without skills');
  process.exit(0);
}

const result = loadSkills(skillsDir);
if (result.errors.length) {
  for (const error of result.errors) console.error(`[skills] ${error}`);
  process.exit(1);
}
if (!result.pack) {
  console.log('[skills] no SKILL.md; running without skills');
  process.exit(0);
}

const index = {
  skills: result.pack.skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    when_to_use: skill.whenToUse || '',
    version: skill.version || 1,
    applies_to: skill.appliesTo || {},
    folder: skill.folder,
    files: skill.files,
    chars: skill.body.length,
  })),
  generatedAt: new Date().toISOString(),
};

const outFile = join(skillsDir, '.index.json');
writeFileSync(outFile, JSON.stringify(index, null, 2), 'utf8');
console.log(`[skills] ${result.pack.skills.length} skills -> ${outFile}`);
