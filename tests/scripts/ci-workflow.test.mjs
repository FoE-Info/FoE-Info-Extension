import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';

const workflow = parse(
  readFileSync(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  ),
);
const job = workflow.jobs.verify;
const install = job.steps.find((step) => step.id === 'install');
const verify = job.steps.find((step) => step.id === 'verify');
const upload = job.steps.find((step) =>
  step.uses?.startsWith('actions/upload-artifact@'),
);

test('CI runs the full capture gate and uploads its evidence directory', () => {
  assert.ok(install, 'dependency installation must have an outcome ID');
  assert.ok(verify, 'verification must have an outcome ID');
  assert.ok(upload, 'verification evidence must be uploaded');
  assert.equal(verify.run.trim(), 'npm run verify:evidence');
  assert.ok(!verify.if, 'verification must run after successful installation');
  assert.ok(!verify['continue-on-error'], 'gate failure must fail CI');
  assert.ok(!install['continue-on-error'], 'installation failure must fail CI');
  assert.equal(job.env.HUSKY, '0');
  assert.equal(typeof job.env.CI_TEST_EVIDENCE_DIR, 'string');
  assert.equal(
    resolve(upload.with.path),
    resolve(job.env.CI_TEST_EVIDENCE_DIR),
    'capture and upload must use the same directory',
  );
  for (const identity of [
    'github.run_id',
    'github.run_attempt',
    'github.sha',
  ]) {
    assert.ok(upload.with.name.includes(`\${{ ${identity} }}`), identity);
  }
  assert.ok(Number.isInteger(upload.with['retention-days']));
  assert.ok(upload.with['retention-days'] > 0);
});

test('CI upload survives success, installation failure and early gate failure', () => {
  assert.equal(typeof upload.if, 'string');
  const expression = upload.if.trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '');
  // Evaluate the checked-in condition with outcome fixtures, not a live CI run.
  for (const [installation, verification, expected] of [
    ['success', 'success', true],
    ['failure', 'skipped', true],
    ['success', 'failure', true],
    ['skipped', 'skipped', false],
  ]) {
    const failed = installation === 'failure' || verification === 'failure';
    assert.equal(
      runInNewContext(
        expression,
        {
          steps: {
            install: { outcome: installation },
            verify: { outcome: verification },
          },
          always: () => true,
          success: () => !failed,
          failure: () => failed,
          cancelled: () => false,
        },
        { timeout: 1000 },
      ),
      expected,
      `${installation}/${verification}`,
    );
  }
  // GitHub implicitly adds success() unless a status function is present.
  assert.match(expression, /\b(?:always|failure|cancelled|success)\s*\(/);
});

for (const exitCode of [0, 7]) {
  test(`CI installation retains both streams and exit ${exitCode}`, (t) => {
    const root = mkdtempSync(join(tmpdir(), 'foe-ci-install-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(
      join(root, 'npm'),
      `#!/bin/sh\n[ "$1" = ci ] || exit 99\nprintf 'install stdout\\n'\nprintf 'install stderr\\n' >&2\nexit ${exitCode}\n`,
      { mode: 0o755 },
    );
    assert.equal(install.shell, 'bash');
    const evidenceDir = join(root, job.env.CI_TEST_EVIDENCE_DIR);
    // Match GitHub's explicit bash shell: errexit and pipefail are enabled.
    const result = spawnSync(
      'bash',
      ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', install.run],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${root}:${process.env.PATH}`,
          CI_TEST_EVIDENCE_DIR: evidenceDir,
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, exitCode, result.stderr);
    const log = readFileSync(join(evidenceDir, 'install-console.log'), 'utf8');
    assert.match(log, /install stdout/);
    assert.match(log, /install stderr/);
  });
}
