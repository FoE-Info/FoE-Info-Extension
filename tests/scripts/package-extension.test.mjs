import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

test('webpack.config.js - generates 3 distinct target configurations', async () => {
  const configFn = (await import(path.resolve(root, 'webpack.config.js')))
    .default;

  const devConfig = configFn({ target: 'dev' });
  assert.equal(devConfig.mode, 'development');
  assert.equal(devConfig.output.path, path.resolve(root, 'build/FoE-Info-DEV'));

  const betaConfig = configFn({ target: 'beta' });
  assert.equal(betaConfig.mode, 'production');
  assert.equal(
    betaConfig.output.path,
    path.resolve(root, 'build/FoE-Info-Beta'),
  );

  const prodConfig = configFn({ target: 'prod' });
  assert.equal(prodConfig.mode, 'production');
  assert.equal(
    prodConfig.output.path,
    path.resolve(root, 'build/FoE-Info-Prod'),
  );
});

test('webpack.config.js - manifestTransform injects correct target environment naming', async () => {
  const configFn = (await import(path.resolve(root, 'webpack.config.js')))
    .default;

  const baseManifest = JSON.stringify({
    name: 'FoE-Info',
    short_name: 'FoE-Info',
    version: '0.0.834',
  });

  for (const target of ['dev', 'beta', 'prod']) {
    const config = configFn({ target });
    const copyPlugin = config.plugins.find(
      (p) =>
        p && p.patterns && p.patterns.some((pat) => pat.to === 'manifest.json'),
    );
    assert.ok(
      copyPlugin,
      `Expected CopyPlugin with manifest.json pattern for target ${target}`,
    );

    const pattern = copyPlugin.patterns.find(
      (pat) => pat.to === 'manifest.json',
    );
    assert.ok(typeof pattern.transform === 'function');

    const result = JSON.parse(pattern.transform(Buffer.from(baseManifest)));
    if (target === 'dev') {
      assert.equal(result.name, 'FoE-Info (DEV)');
      assert.equal(result.short_name, 'FoE-Info (DEV)');
    } else if (target === 'beta') {
      assert.equal(result.name, 'FoE-Info (BETA)');
      assert.equal(result.short_name, 'FoE-Info (BETA)');
    } else {
      assert.equal(result.name, 'FoE-Info');
      assert.equal(result.short_name, 'FoE-Info');
    }
  }
});

test('package.json and the manifest agree on the version', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(root, 'src/chrome/manifest.json'), 'utf8'),
  );

  // Parity rather than a literal: the version moves on every release, and
  // scripts/release.mjs refuses to run when the two manifests disagree. A test
  // pinned to one number only ever fails after a release, which teaches nothing.
  assert.equal(pkg.version, manifest.version);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test('verify runs every stage the gate depends on', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'),
  );

  // Stage presence, not the exact command string: the chain grows over time and
  // a literal here breaks on every addition.
  for (const stage of [
    'version:check',
    'check',
    'lint',
    'typecheck',
    'rpc:contract:check',
    'i18n:check',
    'test',
    'build:dev',
  ]) {
    assert.ok(
      // `npm test` and `npm run test` are both idiomatic; the chain uses both.
      new RegExp(`npm (?:run )?${stage}(?:\\s|$)`).test(pkg.scripts.verify),
      `verify does not run ${stage}`,
    );
  }

  for (const script of [
    'build:beta',
    'build:prod',
    'package:beta',
    'release:prod',
  ]) {
    assert.ok(pkg.scripts[script], `missing npm script: ${script}`);
  }
});
