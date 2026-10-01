import assert from 'node:assert/strict';
import fs, { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SERVICE_PATH = 'src/js/msg/BonusService.mjs';

test('BonusService publishes to BonusState without importing ui/', () => {
  const source = fs.readFileSync(SERVICE_PATH, 'utf8');

  assert.doesNotMatch(
    source,
    /['"`](?:\.\.\/)+ui\//,
    'BonusService must not import from ui/',
  );
  assert.doesNotMatch(
    source,
    /from '\.\/StartupService\.js'/,
    'BonusService must not import the startup monolith',
  );
  assert.match(
    source,
    /import \{[^}]*\bbonusState\b[^}]*\} from '\.\.\/state\/CityDomainState\.js'/,
    'BonusService must import the reactive BonusState store',
  );
  assert.match(
    source,
    /bonusState\.setSummary\(/,
    'BonusService must publish parsed bonuses via bonusState.setSummary',
  );
});

test('BonusService - getLimitedBonuses does not infinitely accumulate City.ForgePoints', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.mjs');
  const { City } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();
  City.ForgePoints = 100;

  const mockMsg = {
    responseData: [{ type: 'daily_strategypoint', value: 10 }],
  };

  // First call adds 10 -> 110
  getLimitedBonuses(mockMsg);
  assert.equal(City.ForgePoints, 110);

  // Second identical call must not add another 10 (stays 110, does not become 120)
  getLimitedBonuses(mockMsg);
  assert.equal(City.ForgePoints, 110);

  // Third call with updated value of 15 adjusts by difference (+5) -> 115
  getLimitedBonuses({
    responseData: [{ type: 'daily_strategypoint', value: 15 }],
  });
  assert.equal(City.ForgePoints, 115);
});

test('StartupService.resetCityStartupState clears daily bonus accumulator', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.mjs');
  const { City } = await import('../../src/js/state/CityDomainState.js');
  const { resetCityStartupState } =
    await import('../../src/js/msg/StartupService.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();
  City.ForgePoints = 0;

  // Session 1: receive 10 FP daily bonus
  getLimitedBonuses({
    responseData: [{ type: 'daily_strategypoint', value: 10 }],
  });
  assert.equal(City.ForgePoints, 10);

  // Reload/switch session: resetCityStartupState is called
  resetCityStartupState(City);
  assert.equal(City.ForgePoints, 0);

  // Session 2: fresh startup receives 10 FP daily bonus
  getLimitedBonuses({
    responseData: [{ type: 'daily_strategypoint', value: 10 }],
  });
  assert.equal(City.ForgePoints, 10);
});

test('BonusService - double_collection percentage does not become Blue Galaxy charges', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.mjs');
  const { blueGalaxyState } =
    await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();
  blueGalaxyState.setCharges(0);

  // The payload as captured from the live game. LimitedBonusFromEntity carries
  // `value`; there is no `amount` field, so reading `amount` yielded undefined
  // and setCharges coerced it to 0.
  const captured = JSON.parse(
    readFileSync(
      resolvePath(
        dirname(fileURLToPath(import.meta.url)),
        '../fixtures/rpc/BonusService.getLimitedBonuses.json',
      ),
      'utf8',
    ),
  );

  getLimitedBonuses({ responseData: captured });

  assert.equal(blueGalaxyState.charges, 0);
  assert.equal(blueGalaxyState.legacyShim?.amount, 0);
  getLimitedBonuses({
    responseData: [
      { type: 'double_collection', value: 71, amount: 15, isActive: true },
    ],
  });
  assert.equal(blueGalaxyState.charges, 15);
  getLimitedBonuses({
    responseData: [{ type: 'double_collection', value: 71, amount: 0 }],
  });
  assert.equal(blueGalaxyState.charges, 0);
});

test('BonusService - limited bonuses use remaining amount instead of strength', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.mjs');
  const { bonusState } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();

  // Same class and field set as the one captured getLimitedBonuses entry
  // ({id, value, type, isActive, entityId, factor, __class__}); these four types
  // have no capture of their own, so the shape is taken from that sample.
  const entry = (type, amount) => ({
    id: 76413,
    value: 47,
    amount,
    type,
    isActive: true,
    entityId: 34862,
    factor: 2,
    __class__: 'LimitedBonusFromEntity',
  });

  getLimitedBonuses({
    responseData: [
      entry('spoils_of_war', 12),
      entry('diplomatic_gifts', 34),
      entry('first_strike', 56),
      entry('aid_goods', 78),
    ],
  });

  assert.equal(bonusState.spoils, 12);
  assert.equal(bonusState.diplomatic, 34);
  assert.equal(bonusState.strike, 56);
  assert.equal(bonusState.aid, 78);
  assert.match(bonusState.bonusHTML, /id="spoilsID">12</);
  assert.match(bonusState.bonusHTML, /id="diplomaticID">34</);
  assert.match(bonusState.bonusHTML, /id="firststrikeID">56</);
  assert.match(bonusState.bonusHTML, /id="aidID">78</);
});

test('BonusService - limited bonus entries carrying only amount are still read', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.mjs');
  const { bonusState } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();

  getLimitedBonuses({
    responseData: [{ type: 'aid_goods', amount: 9 }],
  });

  assert.equal(bonusState.aid, 9);
  assert.match(bonusState.bonusHTML, /id="aidID">9</);
});

test('limited bonus snapshot preserves unknown counts and clears stale bonuses', async () => {
  const { getLimitedBonuses } =
    await import('../../src/js/msg/BonusService.mjs');
  const { bonusState } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');
  showOptions.showBonus = true;
  getLimitedBonuses({
    responseData: [
      { type: 'spoils_of_war', value: 47 },
      { type: 'missile_launch', value: 50, amount: 3 },
      { type: 'first_strike', value: 60, amount: 10, isActive: false },
    ],
  });
  assert.equal(bonusState.getSpoils(), 0);
  assert.deepEqual(
    bonusState.getLimitedBonuses().map((x) => x.remaining),
    [null, 3, 0],
  );
  getLimitedBonuses({ responseData: [] });
  assert.equal(bonusState.getLimitedBonuses().length, 0);
  assert.equal(bonusState.getStrike(), 0);
});

test('own city bonuses include passive rewards and ignore visited players', async () => {
  const { updateOwnCityBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.mjs');
  const { bonusState } = await import('../../src/js/state/CityDomainState.js');
  resetDailyBonusAccumulator();
  updateOwnCityBonuses(
    [
      {
        id: 1,
        player_id: 7,
        type: 'greatbuilding',
        bonuses: [{ type: 'spoils_of_war', amount: 9, value: 47 }],
      },
      {
        id: 2,
        player_id: 7,
        type: 'greatbuilding',
        bonuses: [{ type: 'helping_hands', amount: -1, value: 10 }],
      },
      {
        id: 3,
        player_id: 7,
        type: 'greatbuilding',
        bonuses: [{ type: 'mysterious_shards', amount: 19, value: 5 }],
      },
      {
        id: 4,
        player_id: 8,
        type: 'greatbuilding',
        bonuses: [{ type: 'first_strike', amount: 10, value: 60 }],
      },
    ],
    7,
    { replace: true },
  );
  assert.deepEqual(
    bonusState.getLimitedBonuses().map((x) => [x.type, x.kind, x.remaining]),
    [
      ['spoils_of_war', 'limited', 9],
      ['helping_hands', 'passive', null],
      ['mysterious_shards', 'passive', 19],
    ],
  );
  updateOwnCityBonuses(
    [
      {
        id: 1,
        player_id: 7,
        type: 'greatbuilding',
        bonuses: [{ type: 'spoils_of_war', amount: 8, value: 47 }],
      },
    ],
    7,
  );
  assert.equal(bonusState.getLimitedBonuses()[0].remaining, 8);
  assert.equal(bonusState.getLimitedBonuses().length, 3);
  updateOwnCityBonuses([], 7, { replace: true });
  assert.equal(bonusState.getLimitedBonuses().length, 0);
});

test('Blue Galaxy charges stay in the dedicated panel without a duplicate general bonus', async () => {
  const {
    getLimitedBonuses,
    updateOwnCityBonuses,
    resetDailyBonusAccumulator,
  } = await import('../../src/js/msg/BonusService.mjs');
  const { bonusState, blueGalaxyState } =
    await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.mjs');
  showOptions.showBonus = true;
  resetDailyBonusAccumulator();
  getLimitedBonuses({
    responseData: [
      { type: 'double_collection', amount: 15, value: 71, isActive: true },
    ],
  });
  assert.equal(blueGalaxyState.charges, 15);
  assert.equal(bonusState.getLimitedBonuses().length, 0);
  updateOwnCityBonuses(
    [
      {
        id: 1,
        player_id: 7,
        type: 'greatbuilding',
        bonuses: [{ type: 'double_collection', amount: 15, value: 71 }],
      },
    ],
    7,
    { replace: true },
  );
  assert.equal(bonusState.getLimitedBonuses().length, 0);
});
