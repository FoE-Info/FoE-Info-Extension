import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/GuildBattlegroundState.js';

const { GuildBattlegroundState } = statePkg;

// The renderer graph needs browser globals at import time.
function createMockElement(id = '') {
  return {
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    className: '',
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(event, fn) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(fn);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    cloneNode() {
      return { ...this };
    },
  };
}

if (typeof globalThis.document === 'undefined') {
  const domStore = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!domStore.has(id)) domStore.set(id, createMockElement(id));
      return domStore.get(id);
    },
    createElement(tag) {
      return createMockElement(tag);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  globalThis.window = globalThis;
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
}

const bindingPkg = await import('../../src/js/ui/gbgRenderBinding.js');
const binding = bindingPkg.default || bindingPkg;
const { bindGuildBattlegroundPanels } = binding;

test('gbgRenderBinding - renders published payloads', async (t) => {
  await t.test('forwards the targets payload to the renderer', () => {
    const state = new GuildBattlegroundState();
    const calls = [];
    const off = bindGuildBattlegroundPanels(state, {
      renderTargets: (params) => calls.push(params),
    });

    const payload = {
      map: [{ id: 1 }],
      signals: [{ provinceId: 1, signal: 'focus' }],
      mapName: 'volcano',
    };
    state.setTargets(payload);
    off();
    state.setTargets({ map: [], mapName: 'waterfall' });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].map, payload.map);
    assert.equal(calls[0].signals, payload.signals);
    assert.equal(calls[0].mapName, 'volcano');
  });

  await t.test('forwards the result payload and onRow to the renderer', () => {
    const state = new GuildBattlegroundState();
    const calls = [];
    const onRow = () => {};
    const off = bindGuildBattlegroundPanels(state, {
      renderResult: (responseData, options) =>
        calls.push({ responseData, options }),
    });

    const responseData = { stateId: 'subscribed' };
    state.setResult({ responseData, onRow });
    off();
    state.setResult({ responseData: { stateId: 'other' } });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].responseData, responseData);
    assert.equal(calls[0].options.onRow, onRow);
  });

  await t.test(
    'forwards the leaderboard payload with translateContainer',
    () => {
      const state = new GuildBattlegroundState();
      const calls = [];
      const off = bindGuildBattlegroundPanels(state, {
        renderLeaderboard: (leaderboard, options) =>
          calls.push({ leaderboard, options }),
      });

      const leaderboard = [{ clan: { name: 'Alpha' } }];
      state.setLeaderboard({ leaderboard });
      off();
      state.setLeaderboard({ leaderboard: [] });

      assert.equal(calls.length, 1);
      assert.equal(calls[0].leaderboard, leaderboard);
      assert.ok('translateContainer' in calls[0].options);
    },
  );

  await t.test('forwards the province payload to the costs renderer', () => {
    const state = new GuildBattlegroundState();
    const calls = [];
    const off = bindGuildBattlegroundPanels(state, {
      renderCosts: (payload) => calls.push(payload),
    });

    const payload = {
      map: [],
      provinceDefs: [],
      mapName: 'volcano',
      buildingDefs: {},
    };
    state.setProvince(payload);
    off();
    state.setProvince({ map: [] });

    assert.deepEqual(calls, [payload]);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new GuildBattlegroundState();
    let called = 0;
    bindGuildBattlegroundPanels(state, {
      renderTargets: () => {
        called++;
      },
      renderResult: () => {
        called++;
      },
      renderLeaderboard: () => {
        called++;
      },
      renderCosts: () => {
        called++;
      },
    });

    state.setTargets(null);
    state.setResult(null);
    state.setLeaderboard(null);
    state.setProvince(null);

    assert.equal(called, 0);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindGuildBattlegroundPanels(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
