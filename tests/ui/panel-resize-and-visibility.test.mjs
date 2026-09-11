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

  await t.test(
    'Battleground panel sizing adapts to showBattlegroundChanges mode',
    () => {
      const helperSrc = fs.readFileSync(
        path.resolve('src/js/fn/helper.js'),
        'utf8',
      );
      const globalsSrc = fs.readFileSync(
        path.resolve('src/js/fn/globals.js'),
        'utf8',
      );
      const customScss = fs.readFileSync(
        path.resolve('src/css/custom.scss'),
        'utf8',
      );

      // Verify globals default is updated to 400
      assert.match(
        globalsSrc,
        /battlegroundsSize:\s*400/,
        'toolOptions.battlegroundsSize in globals.js must default to 400',
      );

      // Verify helper applies gbg-changes-full vs gbg-full-roster
      assert.match(
        helperSrc,
        /isChangesOnly\s*\?\s*['"]gbg-changes-full['"]\s*:\s*['"]gbg-full-roster['"]/,
        'helper.js must conditionally apply gbg-changes-full or gbg-full-roster',
      );

      // Verify helper sets auto height in changes-only mode and 400px default restricted height in full mode
      assert.match(
        helperSrc,
        /if\s*\(\s*isChangesOnly\s*\)\s*\{[\s\S]*?battlegroundDiv\.style\.height\s*=\s*['"]auto['"]/,
        'helper.js must set height to auto in changes-only mode',
      );
      assert.match(
        helperSrc,
        /DEFAULT_RESTRICTED_GBG_HEIGHT\s*=\s*400/,
        'helper.js must define DEFAULT_RESTRICTED_GBG_HEIGHT as 400',
      );

      // Verify setHeight only persists when NOT in changes-only mode
      assert.match(
        helperSrc,
        /if\s*\(\s*!showOptions\.showBattlegroundChanges\s*&&\s*heightGBG\s*\)\s*\{[\s\S]*?setBattlegroundSize\(heightGBG\)/,
        'setHeight must only persist size when viewing full guild roster',
      );

      // Verify custom.scss has .gbg-changes-full with height auto
      assert.match(
        customScss,
        /\.gbg-changes-full\s*\{[\s\S]*?height:\s*auto\s*!important/,
        'custom.scss must define .gbg-changes-full with height: auto !important',
      );
    },
  );
});
