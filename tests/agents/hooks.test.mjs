import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateGraphifyGuard,
  isBroadSourceSearch,
  isCodebaseSourceSearch,
} from '../../.agents/scripts/graphify-guard.mjs';
import {
  affectsAst,
  extractTargetFile,
} from '../../.agents/scripts/post-tool-graphify-sync.mjs';
import { isDangerousCommand } from '../../.agents/scripts/safety-gate.mjs';
import { evaluateStopDecision } from '../../.agents/scripts/stop-guard.mjs';

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
    'rm -rf ./build',
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
  ];

  for (const cmd of safeCommands) {
    assert.equal(
      isDangerousCommand(cmd),
      false,
      `Expected command to be allowed safely: ${cmd}`,
    );
  }
});

test('PreInvocation Reminder Hook - adheres to contract and outputs ephemeralMessage', async () => {
  const { execFile } = await import('node:child_process');
  const path = await import('node:path');
  const scriptPath = path.resolve(
    '.agents/scripts/pre-invocation-reminder.mjs',
  );

  const stdout = await new Promise((resolve, reject) => {
    const child = execFile('node', [scriptPath], (err, out) => {
      if (err) reject(err);
      else resolve(out);
    });
    child.stdin.end('{}');
  });

  const parsed = JSON.parse(stdout);
  assert.ok(Array.isArray(parsed.injectSteps), 'injectSteps must be an array');
  assert.ok(
    parsed.injectSteps[0]?.ephemeralMessage,
    'must contain ephemeralMessage',
  );
  assert.match(
    parsed.injectSteps[0].ephemeralMessage,
    /FoE-Info Guardrail Reminder/,
  );
});

test('PostToolUse Graphify Sync Hook - adheres to empty JSON stdout contract', async () => {
  const { execFile } = await import('node:child_process');
  const path = await import('node:path');
  const scriptPath = path.resolve(
    '.agents/scripts/post-tool-graphify-sync.mjs',
  );

  // Case 1: Skipped due to error
  const stdoutError = await new Promise((resolve, reject) => {
    const child = execFile('node', [scriptPath], (err, out) => {
      if (err) reject(err);
      else resolve(out);
    });
    child.stdin.end(JSON.stringify({ error: 'tool failed' }));
  });
  assert.deepEqual(JSON.parse(stdoutError), {});

  // Case 2: Non-AST file edit
  const stdoutNonAst = await new Promise((resolve, reject) => {
    const child = execFile('node', [scriptPath], (err, out) => {
      if (err) reject(err);
      else resolve(out);
    });
    child.stdin.end(
      JSON.stringify({
        toolCall: {
          name: 'write_to_file',
          args: { TargetFile: '/path/to/docs/README.md' },
        },
      }),
    );
  });
  assert.deepEqual(JSON.parse(stdoutNonAst), {});
});

test('PostToolUse Graphify Sync Hook - detects AST file modifications', () => {
  // Source files that should trigger AST refresh (relative and absolute)
  assert.equal(affectsAst('src/js/index.js'), true);
  assert.equal(affectsAst('src/js/fn/i18n.js'), true);
  assert.equal(
    affectsAst('/path/to/project/src/js/msg/StartupService.js'),
    true,
  );
  assert.equal(affectsAst('src/scss/main.scss'), true);
  assert.equal(affectsAst('src/chrome/panel.html'), true);
  assert.equal(affectsAst('webpack.dev.js'), true);
  assert.equal(affectsAst('/path/to/project/webpack.prod.js'), true);

  // Non-AST files that should not trigger
  assert.equal(affectsAst('docs/README.md'), false);
  assert.equal(affectsAst('package.json'), false);
  assert.equal(affectsAst('.agents/hooks.json'), false);
  assert.equal(affectsAst('tests/agents/hooks.test.mjs'), false);
  assert.equal(affectsAst(''), false);
  assert.equal(affectsAst(null), false);
});

test('PostToolUse Graphify Sync Hook - extracts target file from various payload shapes', () => {
  assert.equal(
    extractTargetFile({
      toolCall: { args: { TargetFile: '/path/to/src/js/fn.js' } },
    }),
    '/path/to/src/js/fn.js',
  );
  assert.equal(
    extractTargetFile({ toolCall: { args: { targetFile: 'src/js/fn.js' } } }),
    'src/js/fn.js',
  );
  assert.equal(
    extractTargetFile({ args: { target_file: 'src/js/fn.js' } }),
    'src/js/fn.js',
  );
  assert.equal(extractTargetFile({}), '');
  assert.equal(extractTargetFile(null), '');
});

test('Stop Hook - evaluateStopDecision blocks stop if background tasks active', () => {
  const result = evaluateStopDecision({
    fullyIdle: false,
    terminationReason: 'model_stop',
  });
  assert.equal(result.decision, 'continue');
  assert.match(result.reason, /Background tasks/);
});

test('Stop Hook - evaluateStopDecision allows stop when fully idle', () => {
  const result = evaluateStopDecision({
    fullyIdle: true,
    terminationReason: 'model_stop',
  });
  assert.equal(result.decision, 'allow');
});

test('Stop Hook - evaluateStopDecision allows stop on max_steps or error', () => {
  const maxSteps = evaluateStopDecision({
    fullyIdle: false,
    terminationReason: 'max_steps_exceeded',
  });
  assert.equal(maxSteps.decision, 'allow');

  const errorStop = evaluateStopDecision({
    fullyIdle: false,
    terminationReason: 'model_stop',
    error: 'Fatal process error',
  });
  assert.equal(errorStop.decision, 'allow');
});

test('Stop Hook - CLI execution adheres to stdout JSON contract', async () => {
  const { execFile } = await import('node:child_process');
  const path = await import('node:path');
  const scriptPath = path.resolve('.agents/scripts/stop-guard.mjs');

  // When not idle, returns continue
  const stdoutActive = await new Promise((resolve, reject) => {
    const child = execFile('node', [scriptPath], (err, out) => {
      if (err) reject(err);
      else resolve(out);
    });
    child.stdin.end(
      JSON.stringify({ fullyIdle: false, terminationReason: 'model_stop' }),
    );
  });
  const parsedActive = JSON.parse(stdoutActive);
  assert.equal(parsedActive.decision, 'continue');

  // When fully idle, returns allow
  const stdoutIdle = await new Promise((resolve, reject) => {
    const child = execFile('node', [scriptPath], (err, out) => {
      if (err) reject(err);
      else resolve(out);
    });
    child.stdin.end(
      JSON.stringify({ fullyIdle: true, terminationReason: 'model_stop' }),
    );
  });
  const parsedIdle = JSON.parse(stdoutIdle);
  assert.equal(parsedIdle.decision, 'allow');
});

test('Graphify Guard Hook - isCodebaseSourceSearch detects application searches', () => {
  // Broad src/ searches should trigger codebase search
  assert.equal(
    isCodebaseSourceSearch('grep_search', { SearchPath: '/path/to/src' }),
    true,
  );
  assert.equal(
    isCodebaseSourceSearch('grep_search', { SearchPath: '/path/to/src/js' }),
    true,
  );
  assert.equal(
    isCodebaseSourceSearch('grep_search', { SearchPath: '.' }),
    true,
  );
  assert.equal(
    isCodebaseSourceSearch('find_by_name', { SearchDirectory: '/path/to/src' }),
    true,
  );

  // Exempt searches: tests, docs, specific files
  assert.equal(
    isCodebaseSourceSearch('grep_search', { SearchPath: '/path/to/tests' }),
    false,
  );
  assert.equal(
    isCodebaseSourceSearch('grep_search', {
      SearchPath: '/path/to/src/js/state/state.js',
    }),
    false,
  );
  assert.equal(
    isCodebaseSourceSearch('find_by_name', {
      SearchDirectory: '/path/to/tests',
    }),
    false,
  );
  assert.equal(
    isCodebaseSourceSearch('find_by_name', {
      SearchDirectory: '/path/to/docs',
    }),
    false,
  );
});

test('Graphify Guard Hook - evaluateGraphifyGuard enforces query-first protocol', () => {
  // Safe command
  const mcpGraphCall = {
    name: 'call_mcp_tool',
    args: { ServerName: 'graphify-foe-info', ToolName: 'query_graph' },
  };
  assert.equal(evaluateGraphifyGuard(mcpGraphCall).decision, 'allow');

  // Targeted single-file grep is allowed
  const singleFileGrep = {
    name: 'grep_search',
    args: {
      Query: 'setTargetText',
      SearchPath:
        '/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension/src/js/state/state.js',
    },
  };
  assert.equal(evaluateGraphifyGuard(singleFileGrep).decision, 'allow');

  // Test suite search is allowed
  const testGrep = {
    name: 'grep_search',
    args: {
      Query: 'setTargetText',
      SearchPath:
        '/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension/tests/msg',
    },
  };
  assert.equal(evaluateGraphifyGuard(testGrep).decision, 'allow');

  // CLI graphify command allows and updates stamp
  const cliGraphCall = {
    name: 'run_command',
    args: { CommandLine: 'graphify query "What is state.js?"' },
  };
  assert.equal(evaluateGraphifyGuard(cliGraphCall).decision, 'allow');
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
  assert.match(
    hooksConfig['graphify-guard'].PreToolUse[0].matcher,
    /run_command/,
  );

  assert.ok(hooksConfig['monolith-guardrail']?.PreInvocation);
  assert.ok(hooksConfig['graphify-sync']?.PostToolUse);
  assert.ok(hooksConfig['stop-guard']?.Stop);
});

test('Graphify Guard Hook - isBroadSourceSearch flags broad source searches', () => {
  for (const command of [
    'rg -n Startup src/',
    'rg --files src',
    'grep -R Startup src',
    'find src -name "*.js"',
    'rg Startup',
    'rg --files',
    'cd src && rg Startup .',
  ]) {
    assert.equal(isBroadSourceSearch(command), true, command);
  }
});

test('Graphify Guard Hook - isBroadSourceSearch permits scoped searches', () => {
  for (const command of [
    'rg -n Startup src/js/msg/StartupService.js',
    'rg --files .agents',
    'rg src docs/',
    'git diff | rg Startup',
    'printf "src"',
    'rg -n src .opencode/plugins/graphify-guard.mjs',
  ]) {
    assert.equal(isBroadSourceSearch(command), false, command);
  }
});
