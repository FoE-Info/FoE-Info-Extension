import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';

const builderPkg = await import('../../src/js/ui/treasuryTableBuilder.js');
const { getResourceAmount, buildTreasuryTableHtml } =
  builderPkg.default || builderPkg;

test('treasuryTableBuilder: getResourceAmount handles null, objects, Maps, and BigNumbers', () => {
  assert.equal(getResourceAmount(null, 'iron'), 0);
  assert.equal(getResourceAmount({}, 'iron'), 0);
  assert.equal(getResourceAmount({ iron: 42 }, 'iron'), 42);
  assert.equal(getResourceAmount({ iron: '99' }, 'iron'), 99);
  assert.equal(getResourceAmount({ iron: 'invalid' }, 'iron'), 0);

  const map = new Map([
    ['iron', 150],
    ['stone', new BigNumber(80)],
  ]);
  assert.equal(getResourceAmount(map, 'iron'), 150);
  assert.equal(getResourceAmount(map, 'stone'), 80);
  assert.equal(getResourceAmount(map, 'missing'), 0);
});

test('treasuryTableBuilder: buildTreasuryTableHtml formats eras, medals, and other resources', () => {
  const rssDefs = [
    { id: 'granite', era: 'EarlyMiddleAge', name: 'Granite' },
    { id: 'iron', era: 'IronAge', name: 'Iron' },
    { id: 'wood', era: 'BronzeAge', name: 'Wood' },
  ];

  const helper = {
    numAges: 3,
    fLevelfromAge: (era) => {
      if (era === 'EarlyMiddleAge') return 3;
      if (era === 'IronAge') return 2;
      return 1;
    },
    fGVGagesname: (era) => {
      if (era === 'EarlyMiddleAge') return 'Early Middle Age';
      if (era === 'IronAge') return 'Iron Age';
      return 'Bronze Age';
    },
    fResourceShortName: (id) => (id === 'special_ticket' ? 'Ticket' : null),
    escapeHTML: (str) => str,
  };

  const resources = {
    granite: 200,
    iron: 100,
    wood: 50,
    medals: 5000,
    special_ticket: 10,
  };

  const html = buildTreasuryTableHtml({ resources, rssDefs, helper });

  assert.ok(html.includes('goods-era-header'));
  assert.ok(html.includes('Early Middle Age'));
  assert.ok(html.includes('Granite'));
  assert.ok(html.includes('200'));
  assert.ok(html.includes('Iron Age'));
  assert.ok(html.includes('Iron'));
  assert.ok(html.includes('Bronze Age'));
  assert.ok(html.includes('Wood'));
  assert.ok(html.includes('Medals'));
  assert.ok(html.includes('5,000'));
  assert.ok(html.includes('Other'));
  assert.ok(html.includes('Ticket'));
  assert.ok(html.includes('10'));
});

test('treasuryTableBuilder: buildTreasuryTableHtml returns empty string when resources is falsy', () => {
  assert.equal(buildTreasuryTableHtml({ resources: null }), '');
});
