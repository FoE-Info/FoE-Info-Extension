import assert from 'node:assert/strict';
import test from 'node:test';

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    const el = {
      tagName: tagName.toUpperCase(),
      id: '',
      style: { display: '' },
    };
    return el;
  }

  const doc = {
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

  globalThis.document = doc;
  globalThis.window = {
    addEventListener: () => {},
  };

  return { doc, elementsById };
}

test('Card Visibility Suite - Decoupling GBG from GB Donation', async (t) => {
  createMockDOM();
  const { applyCardVisibility, optionToElementId } = await import(
    `../../src/js/ui/cardVisibility.js?t=${Date.now()}`
  );

  await t.test(
    'optionToElementId maps showBattleground and showLeaderboard to dedicated containers',
    () => {
      assert.equal(
        optionToElementId.showBattleground,
        'battleground',
        'showBattleground must map to battleground element',
      );
      assert.equal(
        optionToElementId.showLeaderboard,
        'gbgLeaderboard',
        'showLeaderboard must map to gbgLeaderboard element',
      );
    },
  );

  await t.test(
    'toggling showDonation does NOT affect #battleground or #gbgLeaderboard',
    () => {
      const donationEl = document.getElementById('donation');
      const battlegroundEl = document.getElementById('battleground');
      const gbgLeaderboardEl = document.getElementById('gbgLeaderboard');

      // 1. When showDonation is false but showBattleground is true
      applyCardVisibility({
        showDonation: false,
        showBattleground: true,
        showLeaderboard: true,
      });

      assert.equal(
        donationEl.style.display,
        'none',
        '#donation should be hidden when showDonation: false',
      );
      assert.equal(
        battlegroundEl.style.display,
        '',
        '#battleground must remain visible when showDonation is false',
      );
      assert.equal(
        gbgLeaderboardEl.style.display,
        '',
        '#gbgLeaderboard must remain visible when showDonation is false',
      );

      // 2. When showBattleground is explicitly false
      applyCardVisibility({
        showDonation: true,
        showBattleground: false,
        showLeaderboard: true,
      });

      assert.equal(
        donationEl.style.display,
        '',
        '#donation should be visible when showDonation: true',
      );
      assert.equal(
        battlegroundEl.style.display,
        'none',
        '#battleground should be hidden when showBattleground: false',
      );
      assert.equal(
        gbgLeaderboardEl.style.display,
        '',
        '#gbgLeaderboard should remain visible',
      );

      // 3. When showLeaderboard is explicitly false
      applyCardVisibility({
        showDonation: true,
        showBattleground: true,
        showLeaderboard: false,
      });

      assert.equal(
        gbgLeaderboardEl.style.display,
        'none',
        '#gbgLeaderboard should be hidden when showLeaderboard: false',
      );
    },
  );

  await t.test(
    'optionToElementId maps showGBInfo and showGBDonors to dedicated containers',
    () => {
      assert.equal(
        optionToElementId.showGBInfo,
        'gbInfo',
        'showGBInfo must map to gbInfo element',
      );
      assert.equal(
        optionToElementId.showGBDonors,
        'greatbuilding',
        'showGBDonors must map to greatbuilding element',
      );
    },
  );

  await t.test(
    'toggling showGBInfo does NOT affect #greatbuilding and vice versa',
    () => {
      const gbInfoEl = document.getElementById('gbInfo');
      const gbEl = document.getElementById('greatbuilding');

      // 1. showGBInfo: true, showGBDonors: false
      applyCardVisibility({
        showGBInfo: true,
        showGBDonors: false,
      });

      assert.equal(
        gbInfoEl.style.display,
        '',
        '#gbInfo should be visible when showGBInfo is true',
      );
      assert.equal(
        gbEl.style.display,
        'none',
        '#greatbuilding should be hidden when showGBDonors is false',
      );

      // 2. showGBInfo: false, showGBDonors: true
      applyCardVisibility({
        showGBInfo: false,
        showGBDonors: true,
      });

      assert.equal(
        gbInfoEl.style.display,
        'none',
        '#gbInfo should be hidden when showGBInfo is false',
      );
      assert.equal(
        gbEl.style.display,
        '',
        '#greatbuilding should be visible when showGBDonors is true',
      );

      // 3. showGBInfo: false, showGBDonors: false
      applyCardVisibility({
        showGBInfo: false,
        showGBDonors: false,
      });

      assert.equal(gbInfoEl.style.display, 'none');
      assert.equal(gbEl.style.display, 'none');
    },
  );

  await t.test(
    'optionToElementId maps showGalaxy to #galaxy and toggles its display',
    () => {
      assert.equal(
        optionToElementId.showGalaxy,
        'galaxy',
        'showGalaxy must map to galaxy element',
      );

      const galaxyEl = globalThis.document.getElementById('galaxy');

      // 1. showGalaxy: true -> visible
      applyCardVisibility({ showGalaxy: true });
      assert.equal(galaxyEl.style.display, '');

      // 2. showGalaxy: false -> hidden
      applyCardVisibility({ showGalaxy: false });
      assert.equal(galaxyEl.style.display, 'none');
    },
  );

  await t.test(
    'showGoods enabled never forces #goods visible on its own — only hides it; revealing it is left to renderGoodsPanel',
    () => {
      assert.equal(
        optionToElementId.showGoods,
        undefined,
        'goods must not be in the generic optionToElementId map',
      );

      const goodsEl = globalThis.document.getElementById('goods');

      // Empty panel (never unlocked by Market/Inventory yet): enabling the
      // setting must NOT reveal it.
      goodsEl.innerHTML = '';
      goodsEl.style.display = 'none';
      applyCardVisibility({ showGoods: true });
      assert.equal(goodsEl.style.display, 'none');

      // Once renderGoodsPanel has actually populated it, the setting being
      // on is allowed to keep/make it visible.
      goodsEl.innerHTML = '<div id="goodsText">some rendered content</div>';
      applyCardVisibility({ showGoods: true });
      assert.equal(goodsEl.style.display, '');

      // The setting can always hide it, populated or not.
      applyCardVisibility({ showGoods: false });
      assert.equal(goodsEl.style.display, 'none');
    },
  );

  await t.test(
    'showGuildOverview controls #guild independently of the Friends/Guild/Hood Lists showGuild option',
    () => {
      assert.equal(
        optionToElementId.showGuild,
        undefined,
        'showGuild belongs to the Lists panel (rendered inside #friends), not #guild',
      );
      assert.equal(
        optionToElementId.showGuildOverview,
        'guild',
        'showGuildOverview must control the standalone Guild Overview panel (#guild)',
      );

      const guildEl = globalThis.document.getElementById('guild');

      applyCardVisibility({ showGuild: false, showGuildOverview: true });
      assert.equal(
        guildEl.style.display,
        '',
        'disabling the Lists showGuild option must not hide the Guild Overview panel',
      );

      applyCardVisibility({ showGuild: true, showGuildOverview: false });
      assert.equal(
        guildEl.style.display,
        'none',
        'showGuildOverview must be able to hide the Guild Overview panel on its own',
      );
    },
  );

  await t.test(
    'unconstrained mode reveals #guildOverview wrapper alongside #guild',
    () => {
      const guildOverviewEl =
        globalThis.document.getElementById('guildOverview');
      const guildEl = globalThis.document.getElementById('guild');

      guildOverviewEl.style.display = 'none';
      guildEl.style.display = 'none';

      applyCardVisibility({ showGuildOverview: true });
      assert.equal(
        guildOverviewEl.style.display,
        '',
        '#guildOverview wrapper must be revealed when showGuildOverview is on',
      );
      assert.equal(
        guildEl.style.display,
        '',
        '#guild must be revealed when showGuildOverview is on',
      );

      applyCardVisibility({ showGuildOverview: false });
      assert.equal(
        guildOverviewEl.style.display,
        'none',
        '#guildOverview wrapper must be hidden when showGuildOverview is off',
      );
      assert.equal(guildEl.style.display, 'none');
    },
  );
});
