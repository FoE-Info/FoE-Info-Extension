import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

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
    /import \{ bonusState \} from '\.\.\/state\/BonusState\.js'/,
    'BonusService must import the reactive BonusState store',
  );
  assert.match(
    source,
    /bonusState\.setSummary\(/,
    'BonusService must publish parsed bonuses via bonusState.setSummary',
  );
});
