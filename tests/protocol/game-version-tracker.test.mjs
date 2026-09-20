import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGameVersion,
  notifyGameVersionChange,
  resetGameVersion,
  setGameVersion,
} from '../../src/js/protocol/gameVersionTracker.js';

test('gameVersionTracker - State and notification flow', async (t) => {
  resetGameVersion();

  await t.test('gets and sets version directly', () => {
    assert.equal(getGameVersion(), 0);
    setGameVersion('1.295');
    assert.equal(getGameVersion(), '1.295');
    resetGameVersion();
    assert.equal(getGameVersion(), 0);
  });

  await t.test('notifies onGameVersionChange when version changes', () => {
    let notifiedVersion = null;
    notifyGameVersionChange('1.296', {
      onGameVersionChange: (v) => {
        notifiedVersion = v;
      },
    });

    assert.equal(notifiedVersion, '1.296');
    assert.equal(getGameVersion(), '1.296');

    // No notification if version is unchanged
    notifiedVersion = null;
    notifyGameVersionChange('1.296', {
      onGameVersionChange: (v) => {
        notifiedVersion = v;
      },
    });
    assert.equal(notifiedVersion, null);
  });

  await t.test('invokes setGameVersion dependency if provided', () => {
    let customSetVersion = null;
    notifyGameVersionChange('1.297', {
      setGameVersion: (v) => {
        customSetVersion = v;
      },
    });

    assert.equal(customSetVersion, '1.297');
    assert.equal(getGameVersion(), '1.297');
  });

  await t.test('appends status to citystats element with HTML escaping', () => {
    const mockCityStats = { innerHTML: '' };
    notifyGameVersionChange('1.298<script>', {
      citystats: mockCityStats,
      extName: '<FoE-Info>',
      toolVersion: '"v2.0"',
    });

    assert.ok(mockCityStats.innerHTML.includes('1.298&lt;script&gt;'));
    assert.ok(mockCityStats.innerHTML.includes('&lt;FoE-Info&gt;'));
    assert.ok(mockCityStats.innerHTML.includes('&quot;v2.0&quot;'));
  });
});
