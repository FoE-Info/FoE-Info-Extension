import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFpTooltipHTML,
  buildTotalGoodsTooltipHTML,
} from '../../src/js/ui/components/cityStatsTooltipBuilder.js';

test('City Stats Dynamic Tooltip Builder Suite', async (t) => {
  await t.test(
    '1. Renders raw IDs when definitions are not yet loaded (cold start)',
    () => {
      const mockHelper = {
        fEntityNameTrim: (id) => id, // Unknown, returns raw id
      };

      const fpBuildings = [
        { id: 'W_MultiAge_GR25C10a', fp: 182, isBoostable: true },
        { id: 'W_MultiAge_GR25C10a', fp: 182, isBoostable: true },
        { id: 'W_MultiAge_GR25G2', fp: 82, isBoostable: true },
      ];

      const html = buildFpTooltipHTML(fpBuildings, 0, mockHelper);
      assert.ok(
        html.includes('364FP <strong>W_MultiAge_GR25C10a</strong> (x2)'),
      );
      assert.ok(html.includes('82FP <strong>W_MultiAge_GR25G2</strong>'));
    },
  );

  await t.test(
    '2. Dynamically resolves human-readable names once metadata becomes available',
    () => {
      // Simulate metadata arriving in memory
      const knownNames = {
        W_MultiAge_GR25C10a: 'Neo Solara Emporium',
        W_MultiAge_GR25G2: 'Neo Shrine of Knowledge',
      };

      const mockHelper = {
        fEntityNameTrim: (id) => knownNames[id] || id,
      };

      const fpBuildings = [
        { id: 'W_MultiAge_GR25C10a', fp: 182, isBoostable: true },
        { id: 'W_MultiAge_GR25C10a', fp: 182, isBoostable: true },
        { id: 'W_MultiAge_GR25G2', fp: 82, isBoostable: true },
      ];

      const html = buildFpTooltipHTML(fpBuildings, 20, mockHelper);
      assert.ok(
        html.includes('364FP <strong>Neo Solara Emporium</strong> (x2)'),
      );
      assert.ok(html.includes('82FP <strong>Neo Shrine of Knowledge</strong>'));
      assert.doesNotMatch(html, /W_MultiAge_GR25C10a/);
      assert.doesNotMatch(html, /W_MultiAge_GR25G2/);
      assert.ok(html.includes('Base: 446FP (+20% Boost = 535FP)'));
    },
  );

  await t.test(
    '3. Total Goods tooltip dynamically resolves building names',
    () => {
      const knownNames = {
        W_MultiAge_CARE24A10: 'Eco Nexus',
      };

      const mockHelper = {
        fEntityNameTrim: (id) => knownNames[id] || id,
      };

      const goodsBuildings = [
        { id: 'W_MultiAge_CARE24A10', goods: 148 },
        { id: 'W_MultiAge_CARE24A10', goods: 148 },
      ];

      const html = buildTotalGoodsTooltipHTML(goodsBuildings, mockHelper);
      assert.ok(html.includes('296 <strong>Eco Nexus</strong> (x2)'));
      assert.doesNotMatch(html, /W_MultiAge_CARE24A10/);
    },
  );

  await t.test('4. Gracefully handles empty or null inputs', () => {
    assert.equal(buildFpTooltipHTML(null), '');
    assert.equal(buildFpTooltipHTML([]), '');
    assert.equal(buildTotalGoodsTooltipHTML(null), '');
    assert.equal(buildTotalGoodsTooltipHTML([]), '');
  });

  await t.test(
    '5. metadataStore.subscribe notifies subscribers on entity registration',
    async () => {
      const { metadataStore } =
        await import('../../src/js/state/MetadataStore.js');
      const events = [];
      const unsubscribe = metadataStore.subscribe((evt) => {
        events.push(evt);
      });

      metadataStore.registerEntity({
        id: 'W_MultiAge_TEST1',
        name: 'Test Building',
      });

      assert.ok(events.length > 0);
      assert.equal(events[0].type, 'entity');
      assert.equal(events[0].id, 'W_MultiAge_TEST1');

      unsubscribe();
      const beforeCount = events.length;
      metadataStore.registerEntity({
        id: 'W_MultiAge_TEST2',
        name: 'Test Building 2',
      });
      assert.equal(
        events.length,
        beforeCount,
        'Unsubscribed listener must not receive events',
      );
    },
  );

  await t.test(
    '6. MetadataStore entity registration resolves in dynamic tooltips',
    async () => {
      const { metadataStore } =
        await import('../../src/js/state/MetadataStore.js');

      metadataStore.registerEntity({
        id: 'W_MultiAge_GR25C10a',
        name: 'Neo Solara Emporium',
      });

      const helperBridge = {
        fEntityNameTrim: (id) => {
          const entity = metadataStore.getEntity(id);
          return entity?.name || id;
        },
      };

      const html = buildFpTooltipHTML(
        [{ id: 'W_MultiAge_GR25C10a', fp: 100 }],
        0,
        helperBridge,
      );
      assert.ok(html.includes('Neo Solara Emporium'));
    },
  );

  await t.test('7. AGES contains expected era keys', async () => {
    const { AGES } = await import('../../src/js/ui/cityStatsTooltips.js');
    assert.ok(Array.isArray(AGES));
    assert.ok(AGES.includes('sad'));
    assert.ok(AGES.includes('ba'));
  });

  await t.test(
    '8. Safely handles missing DOM or null elements in showTooltips',
    async () => {
      const { showTooltips } =
        await import('../../src/js/ui/cityStatsTooltips.js');
      assert.doesNotThrow(() => showTooltips({ customDoc: null }));
      assert.doesNotThrow(() =>
        showTooltips({ customDoc: { getElementById: () => null } }),
      );
    },
  );

  await t.test(
    '9. Disposes existing tooltip and instantiates new one',
    async () => {
      const { showTooltips } =
        await import('../../src/js/ui/cityStatsTooltips.js');
      let disposed = false;
      let created = false;
      class MockTooltip {
        constructor() {
          created = true;
        }
        static getInstance() {
          return {
            dispose() {
              disposed = true;
            },
          };
        }
      }

      const mockDoc = {
        getElementById(id) {
          return id === 'sad' ? { id: 'sad' } : null;
        },
        querySelectorAll() {
          return [];
        },
      };

      showTooltips({
        customDoc: mockDoc,
        customTooltip: MockTooltip,
      });

      assert.equal(disposed, true);
      assert.equal(created, true);
    },
  );
});
