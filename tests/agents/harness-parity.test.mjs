import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const PROJECT_ROOT = path.resolve('.');
const AGENTS_DIR = path.join(PROJECT_ROOT, '.agents');
const OPENCODE_DIR = path.join(PROJECT_ROOT, '.opencode');

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

test('Harness Parity - opencode agent shims mirror canonical descriptions', () => {
  const canonicalDir = path.join(AGENTS_DIR, 'agents');
  const opencodeAgentsDir = path.join(OPENCODE_DIR, 'agents');

  const canonicalFiles = fs
    .readdirSync(canonicalDir)
    .filter((f) => f.endsWith('.md'));

  for (const file of canonicalFiles) {
    const shimFile = path.join(opencodeAgentsDir, file);
    assert.ok(fs.existsSync(shimFile), `Missing opencode shim for ${file}`);

    const { frontmatter: canonicalFm } = readFrontmatter(
      path.join(canonicalDir, file),
    );
    const { frontmatter: shimFm } = readFrontmatter(shimFile);

    assert.equal(
      field(shimFm, 'name'),
      field(canonicalFm, 'name'),
      `Shim name mismatch in ${file}`,
    );
    assert.equal(
      field(shimFm, 'description'),
      field(canonicalFm, 'description'),
      `Shim description drift in ${file}`,
    );
    assert.equal(
      field(shimFm, 'mode'),
      'subagent',
      `Shim ${file} must set mode: subagent`,
    );
  }
});

test('Harness Parity - canonical skills satisfy opencode frontmatter rules', () => {
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
      `Skill name "${name}" fails opencode regex in ${dir.name}`,
    );
    assert.ok(description, `Missing description in ${dir.name}/SKILL.md`);
    assert.ok(
      description.length <= 1024,
      `Skill description exceeds 1024 chars in ${dir.name}`,
    );
  }
});

test('Harness Parity - shared adapter exists and is linked by workflow skills', () => {
  const adapter = path.join(AGENTS_DIR, 'references', 'harness-adapters.md');
  assert.ok(
    fs.existsSync(adapter),
    'Missing .agents/references/harness-adapters.md',
  );

  const linked = [
    'using-superpowers',
    'writing-skills',
    'writing-agents',
    'writing-rules',
    'writing-hooks',
    'subagent-driven-development',
    'requesting-code-review',
  ];
  for (const skill of linked) {
    const body = fs.readFileSync(
      path.join(AGENTS_DIR, 'skills', skill, 'SKILL.md'),
      'utf8',
    );
    assert.ok(
      body.includes('references/harness-adapters.md'),
      `${skill} does not link the shared harness adapter`,
    );
  }
});

test('Harness Parity - opencode.json plugin entries resolve to files', () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'opencode.json'), 'utf8'),
  );
  for (const entry of config.plugin ?? []) {
    if (!entry.startsWith('.')) continue;
    assert.ok(
      fs.existsSync(path.join(PROJECT_ROOT, entry)),
      `opencode.json plugin entry does not exist: ${entry}`,
    );
  }
});

test('Harness Parity - opencode instructions glob covers every canonical rule', () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'opencode.json'), 'utf8'),
  );
  const instructions = config.instructions ?? [];
  assert.ok(
    instructions.includes('.agents/rules/*.md'),
    'opencode.json instructions must include .agents/rules/*.md',
  );

  const rulesDir = path.join(AGENTS_DIR, 'rules');
  const ruleFiles = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
  assert.ok(
    ruleFiles.length > 0,
    'Expected canonical rules under .agents/rules/',
  );
});
