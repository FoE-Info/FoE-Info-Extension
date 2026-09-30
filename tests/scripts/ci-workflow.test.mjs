import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from 'yaml';

const job = parse(
  readFileSync(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  ),
).jobs.verify;
test('CI installs dependencies and font tools before the required extension gate', () => {
  const install = job.steps.findIndex((step) => step.run === 'npm ci');
  const fonts = job.steps.findIndex((step) =>
    step.uses?.startsWith('astral-sh/setup-uv@'),
  );
  const verify = job.steps.findIndex((step) => step.run === 'npm run verify');
  assert.ok(install >= 0 && fonts >= 0 && verify > install && verify > fonts);
  assert.equal(job.env.HUSKY, '0');
  for (const step of [
    job.steps[install],
    job.steps[fonts],
    job.steps[verify],
  ]) {
    assert.ok(!step.if);
    assert.ok(!step['continue-on-error']);
  }
});
