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
