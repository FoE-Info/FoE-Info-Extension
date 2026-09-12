import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/QuantumState.js';
import bindingPkg from '../../src/js/ui/quantumRenderBinding.js';

const { QuantumState } = statePkg;
const { bindQuantumPanels } = bindingPkg;

function createMockElement(id = '') {
  const listeners = new Map();
  return {
    id,
    innerHTML: '',
    style: {},
    className: '',
    checked: false,
    value: '',
    addEventListener(event, fn) {
      listeners.set(event, [fn]);
    },
    click() {
      for (const fn of [...(listeners.get('click') || [])])
        fn({ target: this });
    },
    dispatchEvent(event) {
      for (const fn of [...(listeners.get(event?.type || event) || [])])
        fn(event);
    },
  };
}

test('quantumRenderBinding - reactive channel routing', async (t) => {
  await t.test('repaints only the changed channel', () => {
    const state = new QuantumState();
    const calls = [];
    const off = bindQuantumPanels(state, {
      renderContributions: (members, savedAt) =>
        calls.push(['members', members.length, savedAt]),
      renderLeaderboard: (rankings) =>
        calls.push(['leaderboard', rankings.length]),
    });

    state.setMemberActivity([{ id: 1 }], 111);
    state.setLeaderboard([{ rank: 1 }]);
    off();

    state.setMemberActivity([{ id: 2 }]);

    assert.deepEqual(calls, [
      ['members', 1, 111],
      ['leaderboard', 1],
    ]);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindQuantumPanels(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });

  await t.test('repaints only the changed panel through real renderers', () => {
    const domStore = new Map();
    const contributions = createMockElement('quantumContributions');
    const leaderboard = createMockElement('quantumLeaderboard');
    domStore.set('quantumContributions', contributions);
    domStore.set('quantumLeaderboard', leaderboard);
    globalThis.document = {
      getElementById(id) {
        if (!domStore.has(id)) domStore.set(id, createMockElement(id));
        return domStore.get(id);
      },
      createElement(tag) {
        return createMockElement(tag);
      },
    };

    const state = new QuantumState();
    bindQuantumPanels(state);

    state.setLeaderboard([
      { rank: 1, clanName: 'Knights of the Round', points: 45200 },
    ]);
    const leaderboardBefore = leaderboard.innerHTML;

    state.setMemberActivity(
      [
        {
          playerId: 101,
          name: 'Arthur',
          progressContribution: 1250,
          progressDiff: 250,
          actionPoints: 120,
          actionPointsDiff: 20,
        },
      ],
      1715420000000,
    );

    assert.match(contributions.innerHTML, /Arthur/);
    assert.equal(leaderboard.innerHTML, leaderboardBefore);
  });
});
