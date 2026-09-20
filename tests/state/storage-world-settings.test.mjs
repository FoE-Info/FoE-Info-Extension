import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDebugEnabled,
  applyGlobalSettings,
  applyLegacyWorldFallbacks,
  applyWorldConfig,
} from '../../src/js/state/storageWorldSettings.js';
import themeManager from '../../src/js/ui/themeManager.js';

test('applyWorldConfig handles safe defaults and applies full world configuration', () => {
  // Safe with null/undefined
  assert.doesNotThrow(() => applyWorldConfig(null));
  assert.doesNotThrow(() => applyWorldConfig(undefined));
  assert.doesNotThrow(() => applyWorldConfig('string'));

  const calls = [];
  const deps = {
    setOptions: (k, v) => calls.push(['setOptions', k, v]),
    applyCardVisibility: () => calls.push(['applyCardVisibility']),
    setDonationPercent: (v) => calls.push(['setDonationPercent', v]),
    setCurrentPercent: (v) => calls.push(['setCurrentPercent', v]),
    setDonationSuffix: (v) => calls.push(['setDonationSuffix', v]),
    setTargetsTopic: (v) => calls.push(['setTargetsTopic', v]),
    setTargetText: (v) => calls.push(['setTargetText', v]),
    setUrl: (v) => calls.push(['setUrl', v]),
    setToolOptions: (v) => calls.push(['setToolOptions', v]),
    collapseOptions: (k, v) => calls.push(['collapseOptions', k, v]),
  };

  const worldData = {
    showOptions: { showCity: true },
    donation: {
      percent: 195,
      suffix: 'pts',
      targets: 't1',
      targetText: 'target msg',
    },
    webhooks: { default: 'https://webhook.site' },
    toolOptions: { compact: true },
    collapses: { collapse1: true, collapse2: false },
  };

  applyWorldConfig(worldData, deps);

  assert.deepStrictEqual(calls, [
    ['setOptions', 'showOptions', { showCity: true }],
    ['applyCardVisibility'],
    ['setDonationPercent', 195],
    ['setCurrentPercent', 195],
    ['setDonationSuffix', 'pts'],
    ['setTargetsTopic', 't1'],
    ['setTargetText', 'target msg'],
    ['setUrl', { default: 'https://webhook.site' }],
    ['setToolOptions', { compact: true }],
    ['collapseOptions', 'collapse1', true],
    ['collapseOptions', 'collapse2', false],
  ]);
});

test('applyGlobalSettings applies language, time formatting, and theme', () => {
  assert.doesNotThrow(() => applyGlobalSettings(null));
  assert.doesNotThrow(() => applyGlobalSettings(undefined));

  const calls = [];
  const deps = {
    setLanguage: (lang) => calls.push(['setLanguage', lang]),
  };

  // 'auto' language should not trigger setLanguage
  applyGlobalSettings({ language: 'auto' }, deps);
  assert.strictEqual(calls.length, 0);

  // Specific language
  applyGlobalSettings({ language: 'de' }, deps);
  assert.deepStrictEqual(calls, [['setLanguage', 'de']]);

  // Theme setting
  applyGlobalSettings({ theme: 'dark' }, deps);
  assert.strictEqual(themeManager.getTheme(), 'dark');

  // Reset theme
  applyGlobalSettings({ theme: 'auto' }, deps);
  assert.strictEqual(themeManager.getTheme(), 'auto');
});

test('applyLegacyWorldFallbacks handles known keys and rejects unknown keys', () => {
  const calls = [];
  const deps = {
    setOptions: (k, v) => calls.push(['setOptions', k, v]),
    applyCardVisibility: () => calls.push(['applyCardVisibility']),
    setTargetsTopic: (v) => calls.push(['setTargetsTopic', v]),
    setTargetText: (v) => calls.push(['setTargetText', v]),
    setToolOptions: (v) => calls.push(['setToolOptions', v]),
    setDonationPercent: (v) => calls.push(['setDonationPercent', v]),
    setCurrentPercent: (v) => calls.push(['setCurrentPercent', v]),
    setDonationSuffix: (v) => calls.push(['setDonationSuffix', v]),
    setUrl: (v) => calls.push(['setUrl', v]),
  };

  assert.strictEqual(
    applyLegacyWorldFallbacks('showOptions', { opt: 1 }, deps),
    true,
  );
  assert.strictEqual(applyLegacyWorldFallbacks('targets', 'tg1', deps), true);
  assert.strictEqual(
    applyLegacyWorldFallbacks('targetText', 'txt1', deps),
    true,
  );
  assert.strictEqual(
    applyLegacyWorldFallbacks('toolOptions', { opt: 2 }, deps),
    true,
  );
  assert.strictEqual(
    applyLegacyWorldFallbacks('donationPercent', 185, deps),
    true,
  );
  assert.strictEqual(
    applyLegacyWorldFallbacks('donationSuffix', 'suffix', deps),
    true,
  );
  assert.strictEqual(
    applyLegacyWorldFallbacks('url', 'https://example.com', deps),
    true,
  );
  assert.strictEqual(
    applyLegacyWorldFallbacks('unknownKey', 'val', deps),
    false,
  );

  assert.deepStrictEqual(calls, [
    ['setOptions', 'showOptions', { opt: 1 }],
    ['applyCardVisibility'],
    ['setTargetsTopic', 'tg1'],
    ['setTargetText', 'txt1'],
    ['setToolOptions', { opt: 2 }],
    ['setDonationPercent', 185],
    ['setCurrentPercent', 185],
    ['setDonationSuffix', 'suffix'],
    ['setUrl', 'https://example.com'],
  ]);
});

test('applyDebugEnabled executes without throwing', () => {
  assert.doesNotThrow(() => applyDebugEnabled(true));
  assert.doesNotThrow(() => applyDebugEnabled(false));
});
