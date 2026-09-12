import assert from 'node:assert/strict';
import test from 'node:test';
import resourcePkg from '../../src/js/msg/ResourceService.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';
import loggerPkg from '../../src/js/utils/logger.js';

const { MessageDispatcher } = dispatcherPkg;
const { setDebugEnabled } = loggerPkg;

function createElement(id) {
  const closeButton = {
    handlers: {},
    addEventListener(type, fn) {
      this.handlers[type] = fn;
    },
  };
  return {
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
    querySelector: (sel) => (sel === '.btn-close' ? closeButton : null),
    closeButton,
  };
}

test('ResourceService Market & Trade Interaction Suite', async (t) => {
  // Setup minimal DOM mock
  const domElements = new Map();
  global.document = {
    getElementById: (id) => {
      if (!domElements.has(id)) domElements.set(id, createElement(id));
      return domElements.get(id);
    },
    createElement: (tag) => createElement(tag),
  };

  const goodsDiv = global.document.getElementById('goods');

  const openMarket = async (method = 'getTradeList') => {
    const dispatcher = new MessageDispatcher();
    resourcePkg.register(dispatcher);
    return dispatcher.dispatchBatch([
      {
        __class__: 'ServerRequest',
        requestClass: 'TradeService',
        requestMethod: method,
        responseData: [],
      },
    ]);
  };

  const harvest = (resources) =>
    resourcePkg.getPlayerResources({
      __class__: 'ServerRequest',
      requestClass: 'ResourceService',
      requestMethod: 'getPlayerResources',
      responseData: { resources },
    });

  await t.test(
    '1. Initial getPlayerResources caches goods and does not render #goods on login (showGoods: false)',
    () => {
      resourcePkg.getPlayerResources({
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
      });

      // Verify cached inventory
      assert.equal(resourcePkg.goods.wine, 150);
      assert.equal(resourcePkg.goods.stone, 200);
      assert.ok(resourcePkg.lastGoodsPayload);
      assert.equal(resourcePkg.availableFP, 12);

      // Locked until Market/Inventory open
      assert.equal(resourcePkg.isGoodsPanelUnlocked(), false);

      // Verify DOM not rendered on login
      assert.equal(goodsDiv.style.display, 'none');
    },
  );

  await t.test(
    '2. Login does not render #goods even when showGoods is enabled, until Market/Inventory has been opened',
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
      const res = await openMarket();
      assert.equal(res.succeeded, 1);
      assert.equal(resourcePkg.isGoodsPanelUnlocked(), true);
      assert.equal(goodsDiv.style.display, '');
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));

      // Subsequent login-style resource updates now keep it rendered.
      goodsDiv.innerHTML = '';
      goodsDiv.style.display = 'none';
      resourcePkg.getPlayerResources(loginPayload);
      assert.equal(goodsDiv.style.display, '');
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));
    },
  );

  await t.test(
    '3. Clicking the #goods .btn-close dismiss relocks the panel and clears its content',
    () => {
      assert.ok(goodsDiv.closeButton.handlers.click, 'dismiss handler bound');
      goodsDiv.closeButton.handlers.click();

      assert.equal(resourcePkg.isGoodsPanelUnlocked(), false);
      assert.equal(goodsDiv.innerHTML, '');
      assert.equal(goodsDiv.style.display, 'none');
      assert.ok(goodsDiv.classList.contains('d-none'));
    },
  );

  await t.test(
    '4. Routine OWN_CITY harvest / background entity sync does not respawn #goods after dismissal',
    () => {
      resourcePkg.setShowOptions({ showGoods: true });
      harvest({ wine: 900, stone: 800, marble: 700 });
      assert.equal(goodsDiv.innerHTML, '');
      assert.equal(goodsDiv.style.display, 'none');
      assert.equal(resourcePkg.isGoodsPanelUnlocked(), false);
    },
  );

  await t.test(
    '5. Reopening the market after dismissal unlocks and renders again',
    async () => {
      const res = await openMarket('getOpenOffers');
      assert.equal(res.succeeded, 1);
      assert.equal(resourcePkg.isGoodsPanelUnlocked(), true);
      assert.equal(goodsDiv.style.display, '');
      assert.ok(goodsDiv.innerHTML.includes('goodstable'));
    },
  );

  await t.test(
    '6. Debug mode bypasses the unlock guard so locked harvests still render',
    () => {
      resourcePkg.lockGoodsPanel();
      goodsDiv.innerHTML = '';
      goodsDiv.style.display = 'none';
      assert.equal(resourcePkg.isGoodsPanelUnlocked(), false);

      setDebugEnabled(true);
      try {
        harvest({ wine: 111, stone: 222 });
        assert.equal(goodsDiv.style.display, '');
        assert.ok(goodsDiv.innerHTML.includes('goodstable'));
      } finally {
        setDebugEnabled(false);
      }

      resourcePkg.setShowOptions({ showGoods: false });
    },
  );

  await t.test(
    '7. goodsSize defaults to 200px if stored value is collapsed/corrupted (< 80px)',
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

  await t.test('8. Special goods header uses data-i18n="special_goods"', () => {
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
