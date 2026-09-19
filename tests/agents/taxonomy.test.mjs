import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('.');
const AGENTS = path.join(ROOT, '.agents');

function names(directory, suffix) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) =>
      suffix ?
        entry.isFile() && entry.name.endsWith(suffix)
      : entry.isDirectory(),
    )
    .map((entry) => (suffix ? entry.name.slice(0, -suffix.length) : entry.name))
    .sort();
}

function catalogNames(file) {
  return [
    ...fs
      .readFileSync(file, 'utf8')
      .matchAll(/^\|\s*`([a-z0-9][a-z0-9-]*)`\s*\|/gm),
  ]
    .map((match) => match[1])
    .sort();
}

test('Taxonomy - canonical catalogs are generated and exact', () => {
  execFileSync(
    'node',
    ['.agents/scripts/generate-agent-catalogs.mjs', '--check'],
    {
      cwd: ROOT,
      stdio: 'pipe',
    },
  );

  const skillNames = names(path.join(AGENTS, 'skills'));
  const agentNames = names(path.join(AGENTS, 'agents'), '.md');

  assert.equal(skillNames.length, 22);
  assert.equal(agentNames.length, 14);
  assert.deepEqual(
    catalogNames(path.join(ROOT, 'docs', 'SKILLS.md')),
    skillNames,
  );
  assert.deepEqual(
    catalogNames(path.join(ROOT, 'docs', 'SUBAGENTS.md')),
    agentNames,
  );
});

test('Taxonomy - mandatory behavior has one canonical owner', () => {
  for (const obsoleteSkill of [
    'using-superpowers',
    'verification-before-completion',
    'antigravity-interop',
    'subagent-driven-development',
    'finishing-a-development-branch',
    'requesting-code-review',
    'receiving-code-review',
    'agent-orchestration-improve-agent',
    'refactor-index-slice',
    'brainstorming',
    'writing-plans',
    'executing-plans',
    'writing-skills',
    'writing-rules',
    'writing-hooks',
    'writing-agents',
    'chrome-devtools-troubleshooting',
    'using-git-worktrees',
    'github',
    'agents-md',
    'audit-memory-leaks',
    'chrome-web-store-publishing',
    'systematic-debugging',
    'test-driven-development',
    'project-curator',
  ]) {
    assert.ok(
      !fs.existsSync(path.join(AGENTS, 'skills', obsoleteSkill)),
      `${obsoleteSkill} must not remain a skill`,
    );
  }

  assert.ok(
    fs.existsSync(path.join(AGENTS, 'rules', 'skill-driven-development.md')),
  );
  assert.ok(
    fs.existsSync(
      path.join(AGENTS, 'rules', 'verification-before-completion.md'),
    ),
  );
  assert.ok(
    fs.existsSync(path.join(AGENTS, 'references', 'harness-adapters.md')),
  );
});

test('Taxonomy - repeated subagent families are profile driven', () => {
  const agentNames = names(path.join(AGENTS, 'agents'), '.md');
  for (const expected of [
    'graph-knowledge-explorer',
    'cross-codebase-comparator',
    'foe-economy-analyst',
    'foe-combat-analyst',
  ]) {
    assert.ok(agentNames.includes(expected), `Missing ${expected}`);
  }

  for (const removed of [
    'forge-hammer-kg-explorer',
    'low-tool-kg-explorer',
    'foe-info-original-kg-explorer',
    'forge-hammer-comparator',
    'low-tool-comparator',
    'foe-info-original-comparator',
    'foe-game-data-expert',
    'foe-combat-boost-analyst',
    'foe-great-buildings-expert',
    'foe-guild-battlegrounds-expert',
    'foe-guild-expedition-expert',
    'foe-historical-allies-expert',
    'foe-pvp-expert',
    'foe-quantum-incursions-expert',
    'foe-settlements-expert',
    'foe-sniping-expert',
    'javascript-expert',
    'typescript-expert',
    'accessibility-specialist',
    'performance-memory-profiler',
    'adversarial-debater',
  ]) {
    assert.ok(
      !agentNames.includes(removed),
      `Obsolete subagent remains: ${removed}`,
    );
  }

  for (const profile of [
    'graph-targets.md',
    'comparison-targets.md',
    'foe-mechanics-topics.md',
  ]) {
    assert.ok(
      fs.existsSync(path.join(AGENTS, 'references', 'agents', profile)),
      `Missing profile reference ${profile}`,
    );
  }

  const graphProfiles = fs.readFileSync(
    path.join(AGENTS, 'references', 'agents', 'graph-targets.md'),
    'utf8',
  );
  for (const profile of [
    'foe-info',
    'metadata',
    'forge-hammer',
    'low-tool',
    'foe-info-original',
  ]) {
    assert.match(
      graphProfiles,
      new RegExp('^\\| `' + profile + '` \\|', 'm'),
      `Missing graph target profile ${profile}`,
    );
  }
  const metadataProfile = graphProfiles
    .split('\n')
    .find((line) => line.startsWith('| `metadata` |'));
  assert.match(metadataProfile, /graphify-metadata-store/);
  assert.match(metadataProfile, /npm run|node -e|node --test/);
});

test('Taxonomy - imported reference libraries have explicit catalogs', () => {
  for (const skill of [
    'test-guard',
    'add-feature-panel',
    'codebase-modernization-planner',
    'protocol-reverse-engineering',
  ]) {
    const skillRoot = path.join(AGENTS, 'skills', skill);
    const body = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
    assert.match(body, /\[Reference catalog\]\(references\/README\.md\)/);
    assert.ok(fs.existsSync(path.join(skillRoot, 'references', 'README.md')));
  }
});

test('Taxonomy - harness files are workstation neutral', () => {
  const roots = [path.join(ROOT, '.agents'), path.join(ROOT, '.husky')];
  const offenders = [];
  const visit = (target) => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target))
        visit(path.join(target, entry));
      return;
    }
    const isHook = target.startsWith(`${path.join(ROOT, '.husky')}${path.sep}`);
    if (!isHook && !/\.(?:md|json|mjs|sh)$/.test(target)) return;
    const content = fs.readFileSync(target, 'utf8');
    if (
      /\/var\/home\/kronikpillow|\/home\/linuxbrew\/\.linuxbrew/.test(content)
    ) {
      offenders.push(path.relative(ROOT, target));
    }
  };
  for (const root of roots) visit(root);
  assert.deepEqual(offenders, []);
});

test('Taxonomy - playbooks match this repository and skill entrypoints stay lean', () => {
  const forbidden = {
    'protocol-reverse-engineering': /tcpdump|Wireshark|MITM|TLS decryption/i,
  };

  for (const [skill, pattern] of Object.entries(forbidden)) {
    const playbook = path.join(
      AGENTS,
      'skills',
      skill,
      'references',
      'implementation-playbook.md',
    );
    const content = fs.readFileSync(playbook, 'utf8');
    assert.doesNotMatch(content, pattern);
    assert.ok(content.split(/\r?\n/).length <= 200);
  }

  const changelogPlaybook = fs.readFileSync(
    path.join(
      AGENTS,
      'skills',
      'changelog-automation',
      'references',
      'implementation-playbook.md',
    ),
    'utf8',
  );
  assert.ok(changelogPlaybook.split(/\r?\n/).length <= 200);
  assert.match(changelogPlaybook, /package\.json|CHANGELOG\.md/);
});
