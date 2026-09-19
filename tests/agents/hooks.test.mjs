import assert from 'node:assert/strict';
import test from 'node:test';
import { isDangerousCommand } from '../../.agents/scripts/safety-gate.mjs';

test('Safety Gate Hook - flags destructive commands', () => {
  const dangerousCommands = [
    'git reset --hard HEAD~1',
    'git reset --hard',
    'git reset --merge',
    'git push origin main --force',
    'git push -f origin feat',
    'git clean -f',
    'git clean -fd',
    'git clean -xdf',
    'git restore .',
    'git restore --staged .',
    'git restore *',
    'git restore src/js/index.js',
    'git checkout .',
    'git checkout -- .',
    'git checkout -f',
    'git branch -D development',
    'git branch -d development',
    'git branch --delete development',
    'git push origin --delete development',
    'git stash drop',
    'git stash clear',
    'rm -rf src/',
    'rm -fr src/',
    'rm -rf .agents',
    'rm -rf tests/',
    'rm -rf *',
    'rm -rf .',
    'rm -rf /',
    'rm -rf src/js',
    'sh -c "rm -rf .agents"',
    'bash -c "rm -rf tests"',
    'foe-browser',
    'foe-browser --restart',
    'foe-browser --reload',
    'foe-browser --kill',
    'pkill -f chrome',
    'killall chrome',
  ];

  for (const cmd of dangerousCommands) {
    assert.equal(
      isDangerousCommand(cmd),
      true,
      `Expected command to be flagged as dangerous: ${cmd}`,
    );
  }
});

test('Safety Gate Hook - permits safe read/build/test commands', () => {
  const safeCommands = [
    'npm test',
    'npm run verify',
    'git status',
    'git log -n 5',
    'git diff',
    'git checkout -b feature/new-panel',
    'git branch -D feature/test',
    'git branch -d feature/test',
    'git branch --delete feature/test',
    'git push origin --delete feature/test',
    'git push origin :feature/test',
    'npm run build:dev',
    'git add src/js/fn/i18n.js',
    'git commit -m "feat: add i18n helper"',
    'node scripts/audit-i18n.mjs',
    'npm run clean',
    'rm -rf build',
    'rm -rf ./build',
    'rm -rf build dist node_modules',
    'rm -rf .agents/skills/ui-ux-pro-max/scripts/__pycache__',
    'rm -rf .worktrees/ts-hygiene-phase0',
    'rm -rf .worktrees/chore',
    'rm -rf .superpowers/sdd/2026-09-12-ts-hygiene-phase0',
    'rm -rf .worktrees/foo && rm -rf .superpowers/sdd/bar',
    'node -e "rm -rf .agents"',
    'git commit -m "rm -rf src"',
  ];

  for (const cmd of safeCommands) {
    assert.equal(
      isDangerousCommand(cmd),
      false,
      `Expected command to be allowed safely: ${cmd}`,
    );
  }
});

test('Antigravity hooks.json - config validates schema and matchers', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const hooksConfig = JSON.parse(
    fs.readFileSync(path.resolve('.agents/hooks.json'), 'utf8'),
  );

  assert.ok(hooksConfig['safety-gate']?.PreToolUse);
  assert.equal(hooksConfig['safety-gate'].PreToolUse[0].matcher, 'run_command');
});
