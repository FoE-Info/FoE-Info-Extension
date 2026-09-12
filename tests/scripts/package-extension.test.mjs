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

test('package.json - enforces version 0.0.834 and decoupled verify script', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'),
  );
  assert.equal(pkg.version, '0.0.834');
  assert.equal(
    pkg.scripts.verify,
    'npm run check && npm run lint && npm run typecheck && npm run i18n:check && npm test && npm run build:dev',
  );
  assert.ok(pkg.scripts['build:dev']);
  assert.ok(pkg.scripts['build:beta']);
  assert.ok(pkg.scripts['build:prod']);
  assert.ok(pkg.scripts['package:beta']);
  assert.ok(pkg.scripts['release:prod']);
});

test('release-policy.md - exists and strictly forbids automatic tagging', () => {
  const rulePath = path.resolve(root, '.agents/rules/release-policy.md');
  assert.ok(fs.existsSync(rulePath), 'release-policy.md must exist');

  const content = fs.readFileSync(rulePath, 'utf8');
  assert.match(content, /npm run verify/);
  assert.match(content, /NEVER execute `npm version`, `git tag`/);
  assert.match(content, /Version bumps and WebStore ZIP generation/);
});
