import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';

test('renderTreasuryLogPanel UI Module Suite', async (t) => {
  const mod = await import('../../src/js/ui/renderTreasuryLogPanel.js');
  const { renderTreasuryLogPanel } = mod.default || mod;

  const makeEntry = (overrides = {}) => ({
    playerName: 'Alice',
    resource: 'medals',
    action: 'donation',
    amount: new BigNumber(100),
    isDonation: () => true,
    ...overrides,
  });

  const makeTotals = () => ({
    totalGoodsDonated: new BigNumber(50),
    totalMedalsDonated: new BigNumber(100),
    totalMedalsSpent: new BigNumber(25),
    totalLogCount: 1,
  });

  const withDocument = (fn) => {
    const previous = globalThis.document;
    globalThis.document = { getElementById: () => null };
    try {
      return fn();
    } finally {
      if (previous === undefined) delete globalThis.document;
      else globalThis.document = previous;
    }
  };

  await t.test('renders log rows and totals into the target element', () => {
    withDocument(() => {
      const target = { innerHTML: '', style: { display: 'none' } };
      renderTreasuryLogPanel([makeEntry()], makeTotals(), {
        showTreasury: true,
        targetEl: target,
      });

      assert.equal(target.style.display, '');
      assert.ok(target.innerHTML.includes('Alice'));
      assert.ok(target.innerHTML.includes('+100'));
      assert.ok(target.innerHTML.includes('treasuryLogText'));
      assert.ok(target.innerHTML.includes('Goods Donated'));
      assert.ok(target.innerHTML.includes('Medals Spent'));
    });
  });

  await t.test('clears the panel when showTreasury is false', () => {
    withDocument(() => {
      const target = { innerHTML: 'stale', style: { display: '' } };
      renderTreasuryLogPanel([makeEntry()], makeTotals(), {
        showTreasury: false,
        targetEl: target,
      });

      assert.equal(target.innerHTML, '');
    });
  });

  await t.test('returns without throwing when no target exists', () => {
    withDocument(() => {
      assert.doesNotThrow(() =>
        renderTreasuryLogPanel([makeEntry()], makeTotals(), {
          showTreasury: true,
        }),
      );
    });
  });
});
