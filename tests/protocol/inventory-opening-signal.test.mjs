import assert from 'node:assert/strict';
import test from 'node:test';
import resources from '../../src/js/msg/ResourceService.js';
import { handleRawNetworkEntry } from '../../src/js/protocol/networkListener.js';
import { isInventoryAsset } from '../../src/js/utils/inventorySignal.js';

test('Inventory atlas signals are specific to trusted CDN assets, not generic goods metadata', () => {
  const url =
    'https://foeen.innogamescdn.com/assets/shared/gui/shop_inventory/shop_inventory_0-822fc9d8d.json';
  assert.equal(isInventoryAsset(url), true);
  for (const invalid of [
    undefined,
    url.replace('https:', 'http:'),
    url.replace(
      'foeen.innogamescdn.com',
      'foeen.innogamescdn.com.attacker.test',
    ),
    'https://foeen.innogamescdn.com/start/metadata',
    url.replace('shop_inventory_0', 'trade_0'),
  ])
    assert.equal(isInventoryAsset(invalid), false);
  let opened = 0;
  handleRawNetworkEntry(url, [], null, '', null, {
    onInventoryOpened: () => opened++,
  });
  assert.equal(opened, 1);
});

test('new startup session relocks a previously opened Goods Inventory panel', () => {
  resources.unlockGoodsPanel();
  assert.equal(resources.isGoodsPanelUnlocked(), true);
  resources.resetGoodsPanelSession();
  assert.equal(resources.isGoodsPanelUnlocked(), false);
});
