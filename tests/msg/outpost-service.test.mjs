import assert from 'node:assert/strict';
import test from 'node:test';
import '../../src/js/ui/outpostRenderBinding.js';
import culturalPkg from '../../src/js/ui/renderCulturalPanel.js';

const { renderCulturalPanel, setShowOptions } = culturalPkg;

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      id: '',
      innerHTML: '',
      innerText: '',
      style: { display: '' },
      addEventListener: () => {},
    };
  }

  globalThis.document = {
    createElement,
    getElementById: (id) => {
      if (!elementsById.has(id)) {
        const el = createElement('div');
        el.id = id;
        elementsById.set(id, el);
      }
      return elementsById.get(id);
    },
  };
  globalThis.window = {
    addEventListener: () => {},
  };

  return { elementsById };
}

test('OutpostService & Cultural Settlement Lifecycle Suite', async (t) => {
  createMockDOM();
  const outpostPkg = await import('../../src/js/msg/OutpostService.js');
  const { OutpostService, Settlement, isSettlementActive } =
    outpostPkg.default || outpostPkg;
  const cardVisPkg = await import('../../src/js/ui/cardVisibility.js');
  const { applyCardVisibility, optionToElementId } =
    cardVisPkg.default || cardVisPkg;

  t.afterEach(() => {
    setShowOptions(null);
    const culturalEl = document.getElementById('cultural');
    if (culturalEl) {
      culturalEl.innerHTML = '';
      culturalEl.style.display = '';
    }
  });

  await t.test(
    'optionToElementId maps showSettlement to cultural container',
    () => {
      assert.equal(
        optionToElementId.showSettlement,
        'cultural',
        'showSettlement must map to cultural element',
      );
    },
  );

  await t.test(
    'Inactive settlements do not set activeSettlement and #cultural remains hidden',
    () => {
      const svc = new OutpostService();
      const culturalEl = document.getElementById('cultural');

      // InnoGames payload with historical inactive settlements retaining id without finishedAt
      const payload = {
        responseData: [
          {
            id: 'aztecs',
            name: 'Aztecs',
            content: 'aztecs',
            contentName: 'Aztecs',
          },
          {
            id: 'egyptians',
            name: 'Egyptians',
            content: 'egyptians',
            contentName: 'Egyptian Settlement',
          },
        ],
      };

      const result = svc.getAll(payload);
      assert.equal(
        svc.getActiveSettlement(),
        null,
        'activeSettlement must be null when no active settlement exists',
      );
      assert.equal(result.activeSettlement, null);
      assert.equal(
        culturalEl.style.display,
        'none',
        '#cultural must be hidden (display: none)',
      );
      assert.equal(
        culturalEl.innerHTML,
        '',
        '#cultural innerHTML must be empty',
      );
    },
  );

  await t.test(
    'Active settlement detection respects explicit flags and valid expiry',
    () => {
      // Flag isActive
      assert.equal(isSettlementActive({ isActive: true }), true);
      assert.equal(isSettlementActive({ isCurrent: true }), true);
      assert.equal(isSettlementActive({ active: true }), true);
      assert.equal(isSettlementActive({ is_active: true }), true);

      // Started without finished and future expiry
      const futureSeconds = Math.floor((Date.now() + 100000) / 1000);
      assert.equal(
        isSettlementActive({
          startedAt: 1000,
          expireAt: futureSeconds,
        }),
        true,
      );

      // Finished settlement is inactive
      assert.equal(
        isSettlementActive({
          startedAt: 1000,
          finishedAt: 2000,
        }),
        false,
      );

      // Expired settlement is inactive
      assert.equal(
        isSettlementActive({
          startedAt: 1000,
          expireAt: 1500, // in the past
        }),
        false,
      );
    },
  );

  await t.test(
    'Advancement goods for Vikings properly identify and set activeSettlement to Viking Settlement',
    () => {
      const svc = new OutpostService();
      const culturalEl = document.getElementById('cultural');

      // Populate settlements with inactive list
      svc.getAll({
        responseData: [
          {
            id: 'vikings',
            name: 'Vikings',
            content: 'vikings',
            goodsResourceIds: ['axes', 'mead', 'horns', 'wool'],
          },
          {
            id: 'egyptians',
            name: 'Egyptian Settlement',
            content: 'egyptians',
            goodsResourceIds: [
              'barley',
              'pottery',
              'flowers',
              'sacrificial_offerings',
            ],
          },
        ],
      });

      assert.equal(svc.getActiveSettlement(), null);

      // Player enters Viking settlement and receives Viking advancements
      const advPayload = {
        responseData: [
          {
            id: 'adv_viking_axes',
            name: 'Axe Smith',
            isUnlocked: false,
            requirements: {
              resources: {
                axes: 55,
                mead: 20,
              },
            },
          },
        ],
      };

      svc.handleAdvancements(advPayload);

      const active = svc.getActiveSettlement();
      assert.ok(active, 'activeSettlement must be resolved');
      assert.equal(active.name, 'Vikings');
      assert.equal(
        culturalEl.style.display,
        '',
        '#cultural must be displayed when active',
      );
      assert.ok(
        culturalEl.innerHTML.includes('Vikings'),
        'Panel must show Viking Settlement badge',
      );
      assert.ok(
        culturalEl.innerHTML.includes('axes'),
        'Panel must show axes requirement',
      );
      assert.ok(
        culturalEl.innerHTML.includes('55'),
        'Panel must show requirement amount',
      );
    },
  );

  await t.test(
    'Mismatched active settlement is overridden by incoming advancement goods (EN16 fix)',
    () => {
      const svc = new OutpostService();
      const culturalEl = document.getElementById('cultural');

      // Simulate erroneous state where Egyptian settlement was considered active
      const egyptianSettlement = new Settlement({
        id: 'egyptians',
        name: 'Egyptian Settlement',
        content: 'egyptians',
        goodsResourceIds: [
          'barley',
          'pottery',
          'flowers',
          'sacrificial_offerings',
        ],
        isActive: true,
      });
      const vikingSettlement = new Settlement({
        id: 'vikings',
        name: 'Vikings',
        content: 'vikings',
        goodsResourceIds: ['axes', 'mead', 'horns', 'wool'],
      });

      svc.settlements = [egyptianSettlement, vikingSettlement];
      svc.activeSettlement = egyptianSettlement;

      // Advancements arrive with Viking goods
      svc.handleAdvancements({
        responseData: [
          {
            id: 'adv_1',
            name: 'Mead Hall',
            isUnlocked: false,
            requirements: {
              resources: { mead: 30, horns: 15 },
            },
          },
        ],
      });

      const active = svc.getActiveSettlement();
      assert.equal(
        active.name,
        'Vikings',
        'activeSettlement must be overridden to Vikings based on matching goods',
      );
      assert.ok(
        culturalEl.innerHTML.includes('Vikings'),
        'Panel HTML must reflect Vikings and not Egyptian',
      );
    },
  );

  await t.test(
    'showSettlement: false and showCultural: false properly hide #cultural',
    () => {
      const culturalEl = document.getElementById('cultural');

      const activeSettlement = new Settlement({
        id: 'vikings',
        name: 'Vikings',
        isActive: true,
      });

      // 1. showSettlement: false via OutpostService
      setShowOptions({ showSettlement: false });
      renderCulturalPanel(activeSettlement, [{ id: '1', isUnlocked: true }]);
      assert.equal(culturalEl.style.display, 'none');
      assert.equal(culturalEl.innerHTML, '');

      // 2. showCultural: false via OutpostService
      setShowOptions({ showCultural: false });
      renderCulturalPanel(activeSettlement, [{ id: '1', isUnlocked: true }]);
      assert.equal(culturalEl.style.display, 'none');
      assert.equal(culturalEl.innerHTML, '');

      // 3. Card visibility options toggle via applyCardVisibility
      applyCardVisibility({ showSettlement: false });
      assert.equal(culturalEl.style.display, 'none');

      applyCardVisibility({ showSettlement: true });
      assert.equal(culturalEl.style.display, '');
    },
  );
});
