import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import TreasuryPkg from '../../src/js/msg/TreasuryService.js';
import factoryDefaultsPkg from '../../src/js/state/factoryDefaults.js';

const { createFreshWorldSettings, FACTORY_WORLD_SETTINGS } = factoryDefaultsPkg;

const { renderTreasuryPanel } = TreasuryPkg;

test('Panel Resize & Visibility Defaults Suite', async (t) => {
  await t.test('createFreshWorldSettings defaults showGoods to false', () => {
    const defaults = createFreshWorldSettings();
    assert.equal(defaults.showOptions.showGoods, false);
    assert.equal(FACTORY_WORLD_SETTINGS.showOptions.showGoods, false);
  });

  await t.test(
    'TreasuryService.renderTreasuryPanel unhides #treasury and renders rows',
    () => {
      const mockTreasuryDiv = {
        id: 'treasury',
        innerHTML: '',
        classList: {
          contains: (cls) => cls === 'd-none',
          remove: (cls) => {
            if (cls === 'd-none') mockTreasuryDiv.dNoneRemoved = true;
          },
        },
        style: {
          display: 'none',
        },
      };

      const prevDoc = globalThis.document;
      globalThis.document = {
        getElementById: (id) => (id === 'treasury' ? mockTreasuryDiv : null),
      };

      try {
        const reserves = new Map([
          ['iron', new BigNumber(150)],
          ['stone', new BigNumber(80)],
        ]);

        renderTreasuryPanel(reserves, {
          showOptions: { showTreasury: true },
          element: {
            close: () => '<button class="close"></button>',
            copy: () => '<span id="treasuryCopyID"></span>',
            icon: () => '<span id="treasuryicon"></span>',
          },
          helper: {
            fResourceShortName: (k) => k.toUpperCase(),
            escapeHTML: (s) => s,
            translateContainer: () => {},
          },
        });

        assert.equal(mockTreasuryDiv.style.display, '');
        assert.equal(mockTreasuryDiv.dNoneRemoved, true);
        assert.match(mockTreasuryDiv.innerHTML, /IRON/);
        assert.match(mockTreasuryDiv.innerHTML, /150/);
        assert.match(mockTreasuryDiv.innerHTML, /STONE/);
        assert.match(mockTreasuryDiv.innerHTML, /80/);
      } finally {
        globalThis.document = prevDoc;
      }
    },
  );

  await t.test(
    'Services include resize-both classes on collapsible panel containers',
    () => {
      const armySrc = fs.readFileSync(
        path.resolve('src/js/msg/ArmyUnitManagementService.js'),
        'utf8',
      );
      assert.match(
        armySrc,
        /id="armyText"[^>]*class="[^"]*resize-both[^"]*"/,
        'ArmyUnitManagementService must contain resize-both on #armyText',
      );

      const otherPlayerSrc = fs.readFileSync(
        path.resolve('src/js/msg/OtherPlayerService.js'),
        'utf8',
      );
      assert.match(
        otherPlayerSrc,
        /id="listsText"[^>]*resize-both/,
        'OtherPlayerService must contain resize-both on #listsText',
      );
      assert.match(
        otherPlayerSrc,
        /id="friendsText"[^>]*resize-both/,
        'OtherPlayerService must contain resize-both on #friendsText',
      );
      assert.match(
        otherPlayerSrc,
        /id="guildText"[^>]*resize-both/,
        'OtherPlayerService must contain resize-both on #guildText',
      );
      assert.match(
        otherPlayerSrc,
        /id="hoodText"[^>]*resize-both/,
        'OtherPlayerService must contain resize-both on #hoodText',
      );

      const gbgSrc = fs.readFileSync(
        path.resolve('src/js/msg/GuildBattlegroundService.js'),
        'utf8',
      );
      assert.match(
        gbgSrc,
        /id="battlegroundTextCollapse"[^>]*resize-both/,
        'GuildBattlegroundService must contain resize-both on #battlegroundTextCollapse',
      );
    },
  );
});
