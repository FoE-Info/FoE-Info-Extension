import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateGraphifyGuard,
  isBroadSourceSearch,
  isCodebaseSourceSearch,
} from '../../.agents/scripts/graphify-guard.mjs';
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
    'rtk rm -rf src/',
    'rtk proxy rm -rf tests/',
    'rtk git reset --hard',
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
    'rm -rf .agents/skills/graphify/scripts/__pycache__',
    'rm -rf .worktrees/ts-hygiene-phase0',
    'rm -rf .worktrees/chore',
    'rm -rf .sdd/2026-09-12-ts-hygiene-phase0',
    'rm -rf .worktrees/foo && rm -rf .sdd/bar',
    'rm -rf .superpowers/sdd/2026-09-12-ts-hygiene-phase0',
    'rm -rf .worktrees/foo && rm -rf .superpowers/sdd/bar',
    'node -e "rm -rf .agents"',
    'git commit -m "rm -rf src"',
    'rtk rm -rf build',
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
  assert.ok(hooksConfig['graphify-guard']?.PreToolUse);
  assert.equal(
    hooksConfig['graphify-guard'].PreToolUse[0].matcher,
    'run_command',
  );
  assert.equal(
    hooksConfig['graphify-guard'].PreToolUse[1].matcher,
    'grep_search',
  );
  assert.equal(
    hooksConfig['graphify-guard'].PreToolUse[2].matcher,
    'find_by_name',
  );
  assert.equal(
    hooksConfig['graphify-guard'].PreToolUse[3].matcher,
    'call_mcp_tool',
  );
});

test('Graphify Guard Hook - detects broad codebase searches with and without RTK', () => {
  assert.equal(isBroadSourceSearch('grep -rn "MessageDispatcher" src/'), true);
  assert.equal(
    isBroadSourceSearch('rtk grep -rn "MessageDispatcher" src/'),
    true,
  );
  assert.equal(
    isBroadSourceSearch('rtk proxy rg "MessageDispatcher" src/'),
    true,
  );
  assert.equal(isBroadSourceSearch('find src/ -name "*.js"'), true);
  assert.equal(isBroadSourceSearch('rtk find src/ -name "*.js"'), true);
  assert.equal(isBroadSourceSearch('rtk fd "MessageDispatcher" src/'), true);

  // Targeted searches
  assert.equal(isBroadSourceSearch('grep -rn "test" tests/'), false);
  assert.equal(isBroadSourceSearch('rtk grep -rn "test" tests/'), false);
  assert.equal(
    isBroadSourceSearch(
      'rtk grep "MessageDispatcher" src/js/protocol/MessageDispatcher.js',
    ),
    false,
  );
  assert.equal(isBroadSourceSearch('npm test'), false);
});

test('Graphify Guard Hook - detects tool calls targeting codebase', () => {
  assert.equal(
    isCodebaseSourceSearch('grep_search', { SearchPath: 'src/' }),
    true,
  );
  assert.equal(
    isCodebaseSourceSearch('grep_search', { SearchPath: 'tests/' }),
    false,
  );
  assert.equal(
    isCodebaseSourceSearch('find_by_name', { SearchDirectory: 'src/' }),
    true,
  );
  assert.equal(
    isCodebaseSourceSearch('find_by_name', { SearchDirectory: 'tests/' }),
    false,
  );
});

test('Graphify Guard Hook - intercepts broad search and allows after graph query', () => {
  const mcpResult = evaluateGraphifyGuard({
    name: 'call_mcp_tool',
    args: { ServerName: 'graphify-foe-info', ToolName: 'query_graph' },
  });
  assert.equal(mcpResult.decision, 'allow');

  const searchResult = evaluateGraphifyGuard({
    name: 'run_command',
    args: { CommandLine: 'rtk grep -rn "test" src/' },
  });
  assert.equal(searchResult.decision, 'allow');
});
