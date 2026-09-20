import assert from 'node:assert/strict';
import test from 'node:test';

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

const { guildBattlegroundService } =
  await import('../../src/js/msg/GuildBattlegroundService.js');
const dispatcherPkg =
  await import('../../src/js/protocol/MessageDispatcher.js');
const { MessageDispatcher } = dispatcherPkg;

const gbgSignalPkg = await import('../../src/js/msg/GbgSignalService.js');
const {
  setSignal,
  removeSignal,
  getSignals,
  clearSignals,
  generateTargetList,
  onProvinceConquered,
} = gbgSignalPkg;

test('GuildBattleground Signals and Dispatching Suite', async (t) => {
  t.beforeEach(() => {
    domStore.clear();
    clearSignals();
  });

  await t.test(
    'setSignal and removeSignal update signals list without throwing TypeErrors',
    () => {
      assert.doesNotThrow(() => {
        setSignal(null, [10, 'focus']);
      }, 'setSignal must not throw TypeError on signals array operations');

      const currentSignals = getSignals();
      assert.ok(Array.isArray(currentSignals), 'signals must be an array');
      assert.equal(currentSignals.length, 1);

      const sig = currentSignals[0];
      assert.equal(sig.id ?? sig.provinceId, 10);
      assert.equal(sig.type ?? sig.signal, 'focus');

      assert.doesNotThrow(() => {
        removeSignal(null, [10]);
      }, 'removeSignal must not throw TypeError');

      const afterRemove = getSignals();
      assert.equal(afterRemove.length, 0);
    },
  );

  await t.test(
    'Setting an ignore signal removes the province from focus targets',
    () => {
      setSignal(null, [5, 'focus']);
      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 5);

      // Setting 'ignore' signal removes sector 5 from targets
      setSignal(null, [5, 'ignore']);
      currentSignals = getSignals();
      assert.equal(
        currentSignals.length,
        0,
        'Setting an ignore signal must remove province from attack targets',
      );

      // Add second signal for province 8
      setSignal(null, [8, 'focus']);
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 8);
    },
  );

  await t.test(
    'PostData extraction routes setSignal and removeSignal via request postData.text',
    async () => {
      const dispatcher = new MessageDispatcher();
      guildBattlegroundService.register(dispatcher, {
        setSignal,
        removeSignal,
      });

      // 1. Dispatch setSignal via raw network entry with postData.text
      const setRpcResponse = [
        {
          __class__: 'ServerRequest',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'setSignal',
          requestId: 101,
          responseData: {},
        },
      ];
      const setNetworkRequest = {
        request: {
          postData: {
            text: JSON.stringify([
              {
                __class__: 'ServerRequest',
                requestClass: 'GuildBattlegroundSignalsService',
                requestMethod: 'setSignal',
                requestId: 101,
                requestData: [15, 'focus'],
              },
            ]),
          },
        },
      };

      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=1',
        JSON.stringify(setRpcResponse),
        '',
        [],
        setNetworkRequest,
      );

      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(
        currentSignals[0].id ?? currentSignals[0].provinceId,
        15,
        'setSignal via postData must add sector 15 to signals',
      );
      assert.equal(currentSignals[0].type ?? currentSignals[0].signal, 'focus');

      // 2. Dispatch removeSignal via raw network entry with postData.text
      const removeRpcResponse = [
        {
          __class__: 'ServerRequest',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'removeSignal',
          requestId: 102,
          responseData: {},
        },
      ];
      const removeNetworkRequest = {
        request: {
          postData: {
            text: JSON.stringify([
              {
                __class__: 'ServerRequest',
                requestClass: 'GuildBattlegroundSignalsService',
                requestMethod: 'removeSignal',
                requestId: 102,
                requestData: [15],
              },
            ]),
          },
        },
      };

      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=2',
        JSON.stringify(removeRpcResponse),
        '',
        [],
        removeNetworkRequest,
      );

      currentSignals = getSignals();
      assert.equal(
        currentSignals.length,
        0,
        'removeSignal via postData must remove sector from signals',
      );
    },
  );

  await t.test(
    'removeSignal resolves provinceId from context.requestPayload when responseData is empty',
    async () => {
      const dispatcher = new MessageDispatcher();
      guildBattlegroundService.register(dispatcher, {
        setSignal,
        removeSignal,
      });

      // 1. Dispatch setSignal
      setSignal(null, [14, 'focus']);
      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);

      // 2. Dispatch ServerResponse with empty responseData and matching requestId in requestPayload
      const removeRpcResponse = [
        {
          __class__: 'ServerResponse',
          requestId: 26,
          responseData: [],
        },
      ];
      const networkRequest = {
        postData: {
          text: JSON.stringify([
            {
              __class__: 'ServerRequest',
              requestClass: 'GuildBattlegroundSignalsService',
              requestMethod: 'removeSignal',
              requestId: 26,
              requestData: [14],
            },
          ]),
        },
      };

      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=3',
        JSON.stringify(removeRpcResponse),
        '',
        [],
        networkRequest,
      );

      currentSignals = getSignals();
      assert.equal(
        currentSignals.length,
        0,
        'removeSignal with empty responseData must resolve province from requestPayload and remove signal',
      );
    },
  );

  await t.test(
    'Object payload format support for setSignal and removeSignal',
    async () => {
      // 1. Direct object call
      setSignal(null, { provinceId: 21, type: 'focus' });
      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 21);

      removeSignal(null, { provinceId: 21 });
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 0);

      // 2. Dispatcher call with responseData as object
      const dispatcher = new MessageDispatcher();
      guildBattlegroundService.register(dispatcher, {
        setSignal,
        removeSignal,
      });

      const setResp = [
        {
          __class__: 'ServerResponse',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'setSignal',
          responseData: { provinceId: 33, type: 'focus' },
        },
      ];
      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=obj_test1',
        JSON.stringify(setResp),
      );
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 33);

      const removeResp = [
        {
          __class__: 'ServerResponse',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'removeSignal',
          responseData: { provinceId: 33 },
        },
      ];
      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=obj_test2',
        JSON.stringify(removeResp),
      );
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 0);
    },
  );

  await t.test(
    'Conquest of sector by any guild prunes signals and drops it from target list',
    () => {
      // Province 42 marked for attack
      setSignal(null, [42, 'focus']);
      assert.equal(getSignals().length, 1);

      const volcanoDefs = [
        { id: 42, name: 'D4 B', connections: [], totalBuildingSlots: 1 },
      ];

      // Before conquest: open sector (lockedUntil = 0) with another guild's ownership
      let result = generateTargetList({
        map: [{ id: 42, ownerId: 5, lockedUntil: 0 }],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        options: { GBGprovinceTime: true },
      });
      assert.equal(result.targets.length, 1);
      assert.ok(result.textProvinceUnlocked.includes('D4B'));

      // Case 1: Another guild conquers D4B before us -> onProvinceConquered prunes signal
      onProvinceConquered(42);
      assert.equal(getSignals().length, 0);

      result = generateTargetList({
        map: [{ id: 42, ownerId: 8, lockedUntil: 1789120000 }],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        options: { GBGprovinceTime: true },
      });
      assert.equal(result.targets.length, 0);
      assert.equal(result.textProvinceUnlocked, '');
      assert.equal(result.textProvinceLocked, '');

      // Case 2: If our own guild owns it, generateTargetList must exclude it even if focus signal exists
      setSignal(null, [42, 'focus']);
      result = generateTargetList({
        map: [{ id: 42, ownerId: 1, lockedUntil: 0 }],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        options: { GBGprovinceTime: true },
      });
      assert.equal(
        result.targets.length,
        0,
        'Must not target sectors owned by our own guild',
      );
    },
  );
});
