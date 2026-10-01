import assert from 'node:assert/strict';
import test from 'node:test';
import copy from '../../src/js/ui/armyCopy.js';

test('Army copy groups eras and retains translated totals and signed changes', () => {
  const text = (textContent) => ({ textContent });
  const row = (era, cells) => ({
    textContent: cells.join(''),
    classList: { contains: () => era },
    querySelectorAll: () => cells.map(text),
  });
  const nodes = {
    '.mb-2': { querySelector: () => text('Total') },
    '#armyUnits3': text('Units: 758,898'),
    '#armyUnits2': {
      ...text('Rogues: 55,268'),
      nextElementSibling: text('-10'),
    },
  };
  const body = {
    querySelector: (selector) => nodes[selector],
    querySelectorAll: () => [
      row(true, ['SAD']),
      row(false, ['Anvil', '1,760']),
      row(true, ['SASH']),
      row(false, ['Galactic Juggernaut', '149,931 +8']),
    ],
  };
  assert.equal(
    copy.formatArmyCopy(body),
    'Total:\nUnits: 758,898\nRogues: 55,268 -10\n\nSAD\nAnvil 1,760\n\nSASH\nGalactic Juggernaut 149,931 +8',
  );
});
