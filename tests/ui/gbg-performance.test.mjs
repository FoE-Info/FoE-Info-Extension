import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'bootstrap') {
      return {
        url: 'data:text/javascript,export class Alert {} export class Popover {} export class Tooltip {}',
        shortCircuit: true,
      };
    }
    if (specifier === 'webextension-polyfill') {
      return {
        url: 'data:text/javascript,export default {}',
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const state = await import('../../src/js/state/state.mjs');
const { showOptions } = await import('../../src/js/state/showOptions.mjs');
const { fshowBattleground } = await import('../../src/js/ui/gbgPanel.js');

test('GBG changes show only increased fights or negotiations against the previous snapshot', (t) => {
  const originalDocument = globalThis.document;
  const target = { innerHTML: '' };
  globalThis.document = {
    getElementById: (id) => (id === 'battleground' ? target : null),
  };
  t.after(() => {
    globalThis.document = originalDocument;
    state.BattlegroundPerformance.length = 0;
    state.GuildMembers.length = 0;
    showOptions.showBattlegroundChanges = false;
  });
  state.setGameOrigin('https://en19.forgeofempires.com');
  state.setBGtime('fixture saved time');
  state.BattlegroundPerformance.push(
    { name: 'Unchanged', wonBattles: 10, wonNegotiations: 0, attrition: 5 },
    { name: 'Fighter', wonBattles: 18, wonNegotiations: 0, attrition: 15 },
    { name: 'Negotiator', wonBattles: 0, wonNegotiations: 4, attrition: 1 },
    { name: 'New member', wonBattles: 8, wonNegotiations: 0, attrition: 0 },
  );
  state.GuildMembers.push(
    { name: 'Unchanged', wonBattles: 10, wonNegotiations: 0, attrition: 9 },
    { name: 'Fighter', wonBattles: 15, wonNegotiations: 0, attrition: 12 },
    { name: 'Negotiator', wonBattles: 0, wonNegotiations: 2 },
  );
  showOptions.showBattlegroundChanges = true;
  fshowBattleground();
  assert.match(target.innerHTML, /Fighter/);
  assert.match(target.innerHTML, /Negotiator/);
  assert.doesNotMatch(target.innerHTML, /Unchanged|New member|NaN/);
  assert.match(target.innerHTML, /18 <span class="red">\+3<\/span>/);
  assert.match(target.innerHTML, /4 <span class="red">\+2<\/span>/);
  assert.match(target.innerHTML, /EN19/);
  assert.match(target.innerHTML, /fixture saved time/);

  showOptions.showBattlegroundChanges = false;
  fshowBattleground();
  assert.match(target.innerHTML, /Unchanged/);
  assert.match(target.innerHTML, /New member/);
  assert.match(target.innerHTML, /<span class="red">-4<\/span>/);
  assert.doesNotMatch(target.innerHTML, /\+-4/);

  state.GuildMembers.length = 0;
  state.GuildMembers.push(
    ...state.BattlegroundPerformance.map((p) => ({ ...p })),
  );
  showOptions.showBattlegroundChanges = true;
  fshowBattleground();
  assert.match(target.innerHTML, /no_active_changes/);
  assert.doesNotMatch(target.innerHTML, /Fighter|Negotiator|Unchanged/);
});
