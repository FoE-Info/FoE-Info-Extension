import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/state/factoryDefaults.js';

const {
  FACTORY_WORLD_SETTINGS,
  FACTORY_GLOBAL_SETTINGS,
  createFreshWorldSettings,
  createFreshGlobalSettings,
} = pkg;

test('FACTORY_WORLD_SETTINGS and FACTORY_GLOBAL_SETTINGS are deeply frozen', () => {
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS));
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS.showOptions));
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS.donation));
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS.webhooks));
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS.toolOptions));
  assert.strictEqual(FACTORY_WORLD_SETTINGS.toolOptions.minSize, 50);
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS.caches));
  assert.ok(Object.isFrozen(FACTORY_WORLD_SETTINGS.caches.hiddenInvestments));

  assert.ok(Object.isFrozen(FACTORY_GLOBAL_SETTINGS));
  assert.ok(Object.isFrozen(FACTORY_GLOBAL_SETTINGS.knownWorlds));
  assert.ok(Object.isFrozen(FACTORY_GLOBAL_SETTINGS.timeFormatting));
});

test('createFreshWorldSettings returns an unfrozen, deeply-mutable copy', () => {
  const fresh = createFreshWorldSettings();

  assert.strictEqual(Object.isFrozen(fresh), false);
  assert.strictEqual(Object.isFrozen(fresh.showOptions), false);
  assert.strictEqual(Object.isFrozen(fresh.donation), false);
  assert.strictEqual(Object.isFrozen(fresh.webhooks), false);
  assert.strictEqual(Object.isFrozen(fresh.toolOptions), false);
  assert.strictEqual(Object.isFrozen(fresh.caches), false);
  assert.strictEqual(Object.isFrozen(fresh.caches.hiddenInvestments), false);

  // Deep mutation on fresh instance
  fresh.showOptions.showBonus = false;
  fresh.donation.percent = 200;
  fresh.donation.suffix = 'arc';
  fresh.webhooks.discordTargetURL = 'https://discord.test';
  fresh.caches.hiddenInvestments.push('12345');

  // Verify factory template remains unchanged and frozen
  assert.strictEqual(FACTORY_WORLD_SETTINGS.showOptions.showBonus, true);
  assert.strictEqual(FACTORY_WORLD_SETTINGS.donation.percent, 190);
  assert.strictEqual(FACTORY_WORLD_SETTINGS.donation.suffix, '');
  assert.strictEqual(FACTORY_WORLD_SETTINGS.webhooks.discordTargetURL, '');
  assert.deepStrictEqual(FACTORY_WORLD_SETTINGS.caches.hiddenInvestments, []);
});

test('all showOptions keys are present with correct boolean defaults', () => {
  const expectedShowOptions = {
    showBonus: true,
    showIncidents: true,
    showStats: true,
    showGBInfo: true,
    showGBRewards: true,
    showGBDonors: true,
    showInvested: true,
    showDonation: true,
    showFriends: true,
    showGuild: true,
    showHood: true,
    showBattleground: true,
    showBattlegroundChanges: false,
    showInternationalExpedition: true,
    showExpedition: true,
    showTreasury: true,
    showVisit: true,
    showSettlement: true,
    showArmy: true,
    showGoods: false,
    showGuildOverview: true,
    showLeaderboard: false,
    showGBGrewards: true,
    GBGprovinceTime: true,
    GBGshowSC: true,
    GBGtimeMode: 'server',
    showGErewards: true,
    showRewards: true,
    showGalaxy: true,
    showLogs: true,
    showContributions: true,
    showGuildPosition: false,
    hideUnsafe: true,
    buildingCosts: false,
    collectionTimes: false,
    clipboard: true,
  };

  assert.deepStrictEqual(
    FACTORY_WORLD_SETTINGS.showOptions,
    expectedShowOptions,
  );

  for (const [key, value] of Object.entries(expectedShowOptions)) {
    const expectedType = key === 'GBGtimeMode' ? 'string' : 'boolean';
    assert.strictEqual(
      typeof FACTORY_WORLD_SETTINGS.showOptions[key],
      expectedType,
      `showOptions.${key} should be ${expectedType}`,
    );
    assert.strictEqual(
      FACTORY_WORLD_SETTINGS.showOptions[key],
      value,
      `showOptions.${key} should default to ${value}`,
    );
  }
});

test('createFreshGlobalSettings returns an unfrozen clone', () => {
  const fresh = createFreshGlobalSettings();

  assert.strictEqual(Object.isFrozen(fresh), false);
  assert.strictEqual(Object.isFrozen(fresh.knownWorlds), false);

  fresh.language = 'de';
  fresh.knownWorlds.push('en7');
  fresh.lastActiveWorld = 'en7';

  assert.strictEqual(FACTORY_GLOBAL_SETTINGS.language, 'en');
  assert.deepStrictEqual(FACTORY_GLOBAL_SETTINGS.knownWorlds, []);
  assert.strictEqual(FACTORY_GLOBAL_SETTINGS.lastActiveWorld, null);
});
