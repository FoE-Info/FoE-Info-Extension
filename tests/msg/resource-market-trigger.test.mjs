import assert from 'node:assert/strict';
import test from 'node:test';
import resourcePkg from '../../src/js/msg/ResourceService.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { MessageDispatcher } = dispatcherPkg;

test('ResourceService Market & Trade Interaction Suite', async (t) => {
  // Setup minimal DOM mock
  const domElements = new Map();
  global.document = {
    getElementById: (id) => {
      if (!domElements.has(id)) {
        domElements.set(id, {
          id,
          innerHTML: '',
          innerText: '',
          style: {},
          className: '',
          classList: {
            classes: new Set(),
            add(c) {
              this.classes.add(c);
            },
            remove(c) {
              this.classes.delete(c);
            },
            contains(c) {
              return this.classes.has(c);
            },
          },
          offsetHeight: 100,
          addEventListener: () => {},
        });
      }
      return domElements.get(id);
    },
    createElement: (tag) => ({
      tagName: tag,
      innerHTML: '',
      style: {},
      appendChild: () => {},
    }),
  };

  const goodsDiv = global.document.getElementById('goods');

  await t.test(
    '1. Initial getPlayerResources caches goods and does not render #goods on login (showGoods: false)',
    () => {
      const loginPayload = {
        __class__: 'ServerRequest',
        requestClass: 'ResourceService',
        requestMethod: 'getPlayerResources',
        responseData: {
          resources: {
            wine: 150,
            stone: 200,
            dye: 80,
            strategy_points: 12,
          },
        },
      };

      resourcePkg.getPlayerResources(loginPayload);

      // Verify cached inventory
      assert.equal(resourcePkg.goods.wine, 150);
      assert.equal(resourcePkg.goods.stone, 200);
      assert.ok(resourcePkg.lastGoodsPayload);
      assert.equal(resourcePkg.availableFP, 12);

      // Verify DOM not rendered on login
      assert.equal(goodsDiv.style.display, 'none');
    },
  );

  await t.test(
    '1b. Login does not render #goods even when showGoods is enabled, until Market/Inventory has been opened',
    async () => {
      resourcePkg.setShowOptions({ showGoods: true });
      goodsDiv.innerHTML = '';
      goodsDiv.style.display = 'none';
      goodsDiv.classList.add('d-none');

      const loginPayload = {
        __class__: 'ServerRequest',
        requestClass: 'ResourceService',
        requestMethod: 'getPlayerResources',
        responseData: {
          resources: { wine: 50, stone: 60, strategy_points: 5 },
        },
      };
      resourcePkg.getPlayerResources(loginPayload);

      // showGoods is enabled, but the panel must stay hidden on login —
      // it only unlocks once Market or Inventory has actually been opened.
      assert.equal(goodsDiv.style.display, 'none');
      assert.equal(goodsDiv.innerHTML, '');

      // Opening the market unlocks it for the rest of the session.
      const dispatcher = new MessageDispatcher();
      resourcePkg.register(dispatcher);
      await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'TradeService',
          requestMethod: 'getTradeList',
          responseData: [],
        },
      ]);
      assert.equal(goodsDiv.style.display, '');
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));

      // Subsequent login-style resource updates now keep it rendered.
      goodsDiv.innerHTML = '';
      goodsDiv.style.display = 'none';
      resourcePkg.getPlayerResources(loginPayload);
      assert.equal(goodsDiv.style.display, '');
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));

      resourcePkg.setShowOptions({ showGoods: false });
    },
  );

  await t.test('2. Dismissing/closing panel clears or hides #goods', () => {
    // Simulate user closing panel
    goodsDiv.innerHTML = '';
    goodsDiv.style.display = 'none';
    goodsDiv.classList.add('d-none');

    assert.equal(goodsDiv.innerHTML, '');
    assert.equal(goodsDiv.style.display, 'none');
    assert.ok(goodsDiv.classList.contains('d-none'));
  });

  await t.test(
    '3. Opening market (TradeService.getTradeList) unhides and re-renders #goods',
    async () => {
      const dispatcher = new MessageDispatcher();
      resourcePkg.register(dispatcher);

      const marketMsg = {
        __class__: 'ServerRequest',
        requestClass: 'TradeService',
        requestMethod: 'getTradeList',
        responseData: [],
      };

      const dispatchRes = await dispatcher.dispatchBatch([marketMsg]);
      assert.equal(dispatchRes.succeeded, 1);

      // Verify container unhidden and re-rendered
      assert.equal(goodsDiv.style.display, '');
      assert.equal(goodsDiv.classList.contains('d-none'), false);
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));
      assert.ok(goodsDiv.innerHTML.includes('wine'));
      assert.ok(goodsDiv.innerHTML.includes('stone'));
    },
  );

  await t.test(
    '4. TradeService.getOpenOffers also triggers re-render',
    async () => {
      // Re-hide container
      goodsDiv.innerHTML = '';
      goodsDiv.style.display = 'none';

      const dispatcher = new MessageDispatcher();
      resourcePkg.register(dispatcher);

      const openOffersMsg = {
        __class__: 'ServerRequest',
        requestClass: 'TradeService',
        requestMethod: 'getOpenOffers',
        responseData: [],
      };

      const dispatchRes = await dispatcher.dispatchBatch([openOffersMsg]);
      assert.equal(dispatchRes.succeeded, 1);
      assert.equal(goodsDiv.style.display, '');
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));
    },
  );

  await t.test(
    '5. goodsSize defaults to 200px if stored value is collapsed/corrupted (< 80px)',
    () => {
      // Simulate stored size corrupted by collapse (e.g. 35px)
      resourcePkg.setGlobals({
        toolOptions: { goodsSize: 35 },
        setGoodsSize: () => {},
      });

      resourcePkg.renderGoodsPanel(undefined, true);
      assert.ok(goodsDiv.innerHTML.includes('height: 200px'));

      // Valid custom size >= 80px is respected
      resourcePkg.setGlobals({
        toolOptions: { goodsSize: 350 },
        setGoodsSize: () => {},
      });
      resourcePkg.renderGoodsPanel(undefined, true);
      assert.ok(goodsDiv.innerHTML.includes('height: 350px'));
    },
  );

  await t.test('6. Special goods header uses data-i18n="special_goods"', () => {
    resourcePkg.getPlayerResources({
      responseData: {
        resources: {
          promethium: 500,
        },
      },
    });
    resourcePkg.renderGoodsPanel(undefined, true);
    assert.ok(
      goodsDiv.innerHTML.includes('data-i18n="special_goods"'),
      'Special goods must include data-i18n="special_goods"',
    );
  });
});
