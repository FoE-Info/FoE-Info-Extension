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
    'Services include resize classes on collapsible panel containers',
    () => {
      const armySrc = fs.readFileSync(
        path.resolve('src/js/msg/ArmyUnitManagementService.js'),
        'utf8',
      );
      assert.match(
        armySrc,
        /id="armyText"[^>]*class="[^"]*resize[^"]*"/,
        'ArmyUnitManagementService must contain resize on #armyText',
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

  await t.test(
    'Army panel defaults to 185px height and respects toolOptions.armySize',
    async () => {
      const globalsSrc = fs.readFileSync(
        path.resolve('src/js/fn/globals.js'),
        'utf8',
      );
      assert.match(
        globalsSrc,
        /armySize:\s*185/,
        'toolOptions.armySize in globals.js must default to 185',
      );

      const armySrc = fs.readFileSync(
        path.resolve('src/js/msg/ArmyUnitManagementService.js'),
        'utf8',
      );
      assert.match(
        armySrc,
        /185/,
        'ArmyUnitManagementService must default armySize to 185',
      );

      const armyPkg =
        await import('../../src/js/msg/ArmyUnitManagementService.js');
      const { armyUnitManagementService } = armyPkg.default || armyPkg;

      let savedHeight = null;
      const mockArmyDiv = {
        id: 'army',
        innerHTML: '',
        style: { display: '' },
      };

      const prevDoc = globalThis.document;
      const prevResize = globalThis.ResizeObserver;

      let resizeCallback = null;
      globalThis.ResizeObserver = class {
        constructor(cb) {
          resizeCallback = cb;
        }
        observe() {}
        disconnect() {}
      };

      const mockArmyText = {
        id: 'armyText',
        style: { height: '' },
        classList: {
          _classes: new Set(['show']),
          contains(c) {
            return this._classes.has(c);
          },
          add(c) {
            this._classes.add(c);
          },
          remove(c) {
            this._classes.delete(c);
          },
        },
      };

      globalThis.document = {
        getElementById: (id) => {
          if (id === 'army') return mockArmyDiv;
          if (id === 'armyText') return mockArmyText;
          return null;
        },
      };

      try {
        const payload = {
          responseData: [
            { unitTypeId: 'rogue', count: 50 },
            { unitTypeId: 'champion', count: 10 },
          ],
        };

        // 1. Default render without toolOptions -> renders with 185px default
        armyUnitManagementService(payload, {
          setArmySize: (h) => {
            savedHeight = h;
          },
          helper: {
            fGVGagesname: () => 'SAD',
            fLevelfromAge: () => 20,
          },
        });

        assert.match(
          mockArmyDiv.innerHTML,
          /id="armyText"[^>]*style="height:\s*185px"/,
          '#armyText must render with 185px default height',
        );

        // 2. Custom resized height in toolOptions -> renders with custom height
        armyUnitManagementService(payload, {
          toolOptions: { armySize: 310 },
          setArmySize: (h) => {
            savedHeight = h;
          },
          helper: {
            fGVGagesname: () => 'SAD',
            fLevelfromAge: () => 20,
          },
        });

        assert.match(
          mockArmyDiv.innerHTML,
          /id="armyText"[^>]*style="height:\s*310px"/,
          '#armyText must render with custom 310px height from toolOptions',
        );

        // 3. User resizing triggers setArmySize
        assert.ok(resizeCallback, 'ResizeObserver callback must be registered');
        resizeCallback([{ contentRect: { height: 350 } }]);
        assert.equal(
          savedHeight,
          350,
          'setArmySize must receive resized height',
        );

        // 4. Intermediate heights during collapse must be ignored
        mockArmyText.classList.add('collapsing');
        resizeCallback([{ contentRect: { height: 60 } }]);
        assert.equal(
          savedHeight,
          350,
          'setArmySize must NOT update during collapse animation',
        );

        mockArmyText.classList.remove('collapsing');
        mockArmyText.classList.remove('show');
        resizeCallback([{ contentRect: { height: 75 } }]);
        assert.equal(
          savedHeight,
          350,
          'setArmySize must NOT update when panel is not shown',
        );
      } finally {
        globalThis.document = prevDoc;
        globalThis.ResizeObserver = prevResize;
      }
    },
  );
});
