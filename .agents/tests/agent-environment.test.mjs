import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..');
const AGENTS_DIR = path.join(PROJECT_ROOT, '.agents');

function readFrontmatter(file) {
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `Missing YAML frontmatter in ${file}`);
  return { body: content, frontmatter: match[1] };
}

function field(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

test('Canonical skills satisfy frontmatter rules', () => {
  const skillsDir = path.join(AGENTS_DIR, 'skills');
  const nameRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  const skillDirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const dir of skillDirs) {
    const { frontmatter } = readFrontmatter(
      path.join(skillsDir, dir.name, 'SKILL.md'),
    );
    const name = field(frontmatter, 'name');
    const description = field(frontmatter, 'description');

    assert.ok(name, `Missing name in ${dir.name}/SKILL.md`);
    assert.equal(name, dir.name, `Skill name != directory in ${dir.name}`);
    assert.ok(
      nameRe.test(name),
      `Skill name "${name}" fails naming regex in ${dir.name}`,
    );
    assert.ok(description, `Missing description in ${dir.name}/SKILL.md`);
    assert.ok(
      description.length <= 1024,
      `Skill description exceeds 1024 chars in ${dir.name}`,
    );
  }
});

test('Shared specialist definitions match their filenames and declare their role', () => {
  const agentsDir = path.join(AGENTS_DIR, 'agents');
  const files = fs
    .readdirSync(agentsDir)
    .filter((name) => name.endsWith('.md'));
  assert.ok(files.length > 0, 'No specialist definitions found');
  for (const file of files) {
    const { frontmatter } = readFrontmatter(path.join(agentsDir, file));
    assert.equal(field(frontmatter, 'name'), path.basename(file, '.md'));
    assert.ok(field(frontmatter, 'description'));
    assert.equal(field(frontmatter, 'subagent'), 'true');
  }
});
