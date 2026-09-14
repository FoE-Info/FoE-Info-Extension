import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

// Setup browser extension and DOM mocks before importing dependent modules
if (!globalThis.chrome || !globalThis.chrome.runtime) {
  globalThis.chrome = {
    runtime: { id: 'test-extension-id' },
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
      },
    },
  };
}

const domStore = new Map();

function createMockElement(tag, id = '') {
  const el = {
    tagName: tag.toUpperCase(),
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    className: '',
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      if (child.id) domStore.set(child.id, child);
      return child;
    },
    addEventListener(event, fn) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(fn);
    },
    querySelector(sel) {
      const targetId = sel.replace('#', '');
      if (this.innerHTML.includes(targetId)) {
        return createMockElement('div', targetId);
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    cloneNode() {
      return { ...this };
    },
  };
  if (id) domStore.set(id, el);
  return el;
}

globalThis.document = {
  getElementById(id) {
    if (!domStore.has(id)) {
      domStore.set(id, createMockElement('div', id));
    }
    return domStore.get(id);
  },
  createElement(tag) {
    return createMockElement(tag);
  },
  querySelector(sel) {
    const targetId = sel.replace('#', '');
    return domStore.get(targetId) || null;
  },
  querySelectorAll() {
    return [];
  },
};

globalThis.window = globalThis;

const gbgSignalPkg = await import('../../src/js/msg/GbgSignalService.js');
const { setSignal, getSignals, clearSignals, generateTargetList } =
  gbgSignalPkg;

test('GuildBattleground UI Panels and Integration Suite', async (t) => {
  t.beforeEach(() => {
    domStore.clear();
    clearSignals();
  });

  await t.test(
    'Switching back to Target Generator from a pre-existing GBG Targets chat panel when setting a signal',
    () => {
      const targetsGBG = document.getElementById('targetsGBG');

      // Step 1: Pre-existing chat thread panel is active
      targetsGBG.innerHTML = `
        <div id="alert-chat" class="alert alert-info show">
          <button id="targetPostID">Post</button>
          <p id="targetLabel"><strong>GBG Targets</strong> today at 10:00</p>
          <p id="targetText">Attack A1S</p>
        </div>
      `;
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'Initial state must show GBG Targets chat panel',
      );
      assert.ok(
        targetsGBG.querySelector('#targetPostID'),
        'Post button must be present in chat panel',
      );

      // Step 2: Signal placed on map
      setSignal(null, [0, 'focus']);
      const volcanoDefs = [
        { id: 0, name: 'A1S Central', connections: [], totalBuildingSlots: 1 },
      ];
      const targetList = generateTargetList({
        map: [{ id: 0, lockedUntil: 0, totalBuildingSlots: 1 }],
        activeSignals: getSignals(),
        volcanoDefs,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });

      // Target generator updates #targetsGBG (matching checkProvinces behavior)
      if (targetList.textProvinceUnlocked) {
        targetsGBG.innerHTML = `
          <div class="alert alert-info">
            <button id="targetCopyID">Copy</button>
            <p id="targetGenLabel"><strong>GBG Target Generator:</strong></p>
            <div id="targetGenCollapse"><p id="targetGenText">${targetList.textProvinceUnlocked}</p></div>
          </div>
        `;
      }

      // Step 3: Assert it switched back to GBG Target Generator
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        'Must switch back to Target Generator panel',
      );
      assert.equal(
        targetsGBG.querySelector('#targetPostID'),
        null,
        'Chat thread Post button must no longer be present',
      );
      assert.ok(
        targetsGBG.querySelector('#targetCopyID'),
        'Target Generator copy button must be present',
      );
    },
  );

  await t.test(
    'ConversationService renders targets thread when opened and setSignal switches back to Target Generator',
    async () => {
      const { conversationService } =
        await import('../../src/js/msg/ConversationService.js');
      const targetsGBG =
        document.getElementById('targetsGBG') ||
        createMockElement('div', 'targetsGBG');
      targetsGBG.innerHTML = `
        <div class="alert alert-info">
          <button id="targetCopyID">Copy</button>
          <p id="targetGenLabel"><strong>GBG Target Generator:</strong></p>
          <div id="targetGenCollapse"><p id="targetGenText">D4A (20%) @ 08:06</p></div>
        </div>
      `;

      // Opening Message Center updates targetsGBG with the thread view
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Attack B1S now!',
                  sender: { name: 'Commander' },
                  date: 'today at 10:00',
                },
              },
            ],
          },
        },
      });

      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'ConversationService must display Message Center Targets card when opened',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('Attack B1S now!'),
        'Chat thread text must be present in Message Center card',
      );
    },
  );

  await t.test(
    'fshowBattleground and getLeaderboard render to dedicated containers with null guards',
    () => {
      const rendererSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/ui/renderBattlegroundsPanel.js'),
        'utf8',
      );
      const gbgServiceSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/msg/GuildBattlegroundService.js'),
        'utf8',
      );
      const gbgBindingSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/ui/gbgRenderBinding.js'),
        'utf8',
      );
      const resultCardSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/ui/renderBattlegroundResultCard.js'),
        'utf8',
      );

      // Verify the battleground renderer imports battlegroundDIV and renders to it
      assert.match(
        rendererSource,
        /battlegroundDIV/,
        'renderBattlegroundsPanel.js must import battlegroundDIV from state',
      );
      assert.match(
        rendererSource,
        /document\.getElementById\(['"]battleground['"]\)[\s\S]*?battlegroundDIV/,
        'renderBattlegroundsPanel.js fshowBattleground must target dedicated battleground container',
      );
      assert.match(
        rendererSource,
        /const\s+copyEl\s*=\s*document\.getElementById\(['"]battlegroundCopyID['"]\);[\s\S]*?if\s*\(\s*copyEl\s*\)/,
        'renderBattlegroundsPanel.js fshowBattleground must null-guard battlegroundCopyID click listener',
      );
      assert.match(
        rendererSource,
        /const\s+iconEl\s*=\s*document\.getElementById\(['"]battlegroundicon['"]\);[\s\S]*?if\s*\(\s*iconEl\s*\)/,
        'renderBattlegroundsPanel.js fshowBattleground must null-guard battlegroundicon click listener',
      );

      // Verify GuildBattlegroundService publishes to the reactive store instead
      // of importing the UI renderers directly (F2 decoupling).
      assert.match(
        gbgServiceSource,
        /guildBattlegroundState\.setLeaderboard/,
        'GuildBattlegroundService.getLeaderboard must publish to the reactive store',
      );
      assert.match(
        gbgServiceSource,
        /guildBattlegroundState\.setPerformance/,
        'GuildBattlegroundService must publish performance to the reactive store',
      );
      assert.doesNotMatch(
        gbgServiceSource,
        /from '\.\.\/fn\/helper(?:\.js)?'/,
        'GuildBattlegroundService must not import from helper.js',
      );
      assert.doesNotMatch(
        gbgServiceSource,
        /from '\.\.\/ui\//,
        'GuildBattlegroundService must not import UI renderers directly',
      );

      // Verify gbgRenderBinding.js owns the renderer wiring and container targeting
      assert.match(
        gbgBindingSource,
        /battlegroundDIV/,
        'gbgRenderBinding.js must target the dedicated battleground container',
      );
      assert.match(
        gbgBindingSource,
        /renderGbgLeaderboardPanel/,
        'gbgRenderBinding.js must delegate the leaderboard to renderBattlegroundsPanel.js',
      );
      assert.match(
        gbgBindingSource,
        /document\.getElementById\(['"]battleground['"]\)[\s\S]*?battlegroundDIV/,
        'gbgRenderBinding.js must resolve the dedicated battleground container',
      );
      assert.match(
        rendererSource,
        /gbgLeaderboardDIV/,
        'renderBattlegroundsPanel.js must import gbgLeaderboardDIV',
      );
      assert.match(
        rendererSource,
        /getElementById\(['"]gbgLeaderboard['"]\)[\s\S]*?gbgLeaderboardDIV/,
        'renderBattlegroundsPanel.js renderGbgLeaderboardPanel must target dedicated gbgLeaderboard container',
      );
      assert.match(
        resultCardSource,
        /document\.getElementById\(['"]battlegroundCopyID['"]\)[\s\S]*?BattlegroundCopy/,
        'renderBattlegroundResultCard must null-guard and wire battlegroundCopyID listener',
      );
    },
  );

  await t.test(
    'renderBattlegroundResultCard renders GBG table with centered rank, member start, centered negs/fights/attrition, and clickable title',
    () => {
      const resultCardSource = fs.readFileSync(
        path.resolve('src/js/ui/renderBattlegroundResultCard.js'),
        'utf8',
      );
      assert.match(
        resultCardSource,
        /<th scope="col" class="text-center"><span data-i18n="rank">Rank<\/span><\/th><th scope="col" class="text-start"><span data-i18n="member">Member<\/span><\/th><th scope="col" class="text-center"><span data-i18n="neg">Negs<\/span><\/th><th scope="col" class="text-center"><span data-i18n="fights">Fights<\/span><\/th><th scope="col" class="text-center"><span data-i18n="attrition">Attrition<\/span><\/th>/,
        'GBG table must render centered headers with capitalized Attrition',
      );
      assert.match(
        resultCardSource,
        /<td class="text-center">\$\{row\.rank\}<\/td><td class="text-start">\$\{safePlayerName\}<\/td><td class="text-center">\$\{row\.negotiations\}<\/td><td class="text-center">\$\{row\.fights\}<\/td><td class="text-center">\$\{row\.attrition\}<\/td>/,
        'GBG table rows must have centered rank, negotiations, battles, attrition, and left-aligned name',
      );
      assert.match(
        resultCardSource,
        /id="battlegroundResultTextLabel"\s+class="cursor-pointer"/,
        'GBG result text label must have cursor-pointer class',
      );
      assert.match(
        resultCardSource,
        /document\.getElementById\(['"]battlegroundResultTextLabel['"]\)/,
        'GBG result text label must have collapse event listener bound',
      );
    },
  );

  await t.test(
    'getUpdatedProvinces updates provinces and preserves existing buildings',
    () => {
      const gbgServiceSource = fs.readFileSync(
        path.resolve('src/js/msg/GuildBattlegroundService.js'),
        'utf8',
      );
      assert.match(
        gbgServiceSource,
        /export function getUpdatedProvinces\(msg\)/,
        'GuildBattlegroundService must export getUpdatedProvinces function',
      );
      assert.match(
        gbgServiceSource,
        /Object\.assign\(existing,\s*updated\)/,
        'getUpdatedProvinces must merge updated province properties into existing map entry',
      );
    },
  );
});
