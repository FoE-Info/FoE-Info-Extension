import assert from 'node:assert/strict';
import fs, { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

function isEsmSource(source) {
  return /^\s*(?:import|export)\s/m.test(source);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && context.parentURL) {
        const parentDir = dirname(fileURLToPath(context.parentURL));
        for (const candidate of ['', '.js', '.mjs', '/index.js']) {
          const resolved = resolvePath(parentDir, specifier + candidate);
          try {
            readFileSync(resolved);
            return { url: pathToFileURL(resolved).href, shortCircuit: true };
          } catch {}
        }
      }
      throw err;
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.js') && url.includes('/src/js/')) {
      const source = readFileSync(fileURLToPath(url), 'utf8');
      if (isEsmSource(source)) {
        return { format: 'module', source, shortCircuit: true };
      }
    }
    return nextLoad(url, context);
  },
});

const SERVICE_PATH = 'src/js/msg/BonusService.js';

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
    await import('../../src/js/msg/BonusService.js');
  const { City } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.js');

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
    await import('../../src/js/msg/BonusService.js');
  const { City } = await import('../../src/js/state/CityDomainState.js');
  const { resetCityStartupState } =
    await import('../../src/js/msg/StartupService.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.js');

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

test('BonusService - real captured double_collection sets Blue Galaxy charges', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.js');
  const { blueGalaxyState } =
    await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.js');

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

  assert.equal(blueGalaxyState.charges, 71);
  assert.equal(blueGalaxyState.legacyShim?.amount, 71);
});

test('BonusService - sibling limited bonus types read value off LimitedBonusFromEntity', async () => {
  const { getLimitedBonuses, resetDailyBonusAccumulator } =
    await import('../../src/js/msg/BonusService.js');
  const { bonusState } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.js');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();

  // Same class and field set as the one captured getLimitedBonuses entry
  // ({id, value, type, isActive, entityId, factor, __class__}); these four types
  // have no capture of their own, so the shape is taken from that sample.
  const entry = (type, value) => ({
    id: 76413,
    value,
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
    await import('../../src/js/msg/BonusService.js');
  const { bonusState } = await import('../../src/js/state/CityDomainState.js');
  const { showOptions } = await import('../../src/js/vars/showOptions.js');

  showOptions.showBonus = true;
  resetDailyBonusAccumulator();

  getLimitedBonuses({
    responseData: [{ type: 'aid_goods', amount: 9 }],
  });

  assert.equal(bonusState.aid, 9);
  assert.match(bonusState.bonusHTML, /id="aidID">9</);
});
