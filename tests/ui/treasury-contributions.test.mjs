import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import stateModule from '../../src/js/state/GuildDomainState.js';
import contributionsModule from '../../src/js/ui/treasuryContributionsPanel.js';
import treasuryModule from '../../src/js/ui/treasuryPanel.js';

test('treasury contributions use accumulated precise totals, escape names, and obey their setting', (t) => {
  const previous = globalThis.document;
  const target = { innerHTML: '', style: {} };
  globalThis.document = { getElementById: () => null };
  t.after(() => {
    globalThis.document = previous;
  });
  const rows = new Map([
    [
      '<Player>',
      {
        goodsDonated: new BigNumber('9007199254740993'),
        medalsDonated: new BigNumber(12),
      },
    ],
  ]);
  contributionsModule.renderTreasuryContributionsPanel(rows, {
    targetEl: target,
  });
  assert.match(target.innerHTML, /9,007,199,254,740,993/);
  assert.match(target.innerHTML, /&lt;Player&gt;/);
  contributionsModule.renderTreasuryContributionsPanel(rows, {
    targetEl: target,
    showContributions: false,
  });
  assert.equal(target.innerHTML, '');
  assert.equal(target.style.display, 'none');
});

test('treasury subscription publishes contributions alongside logs without replacing reserves', () => {
  const state = new stateModule.TreasuryState();
  const calls = [];
  const unbind = treasuryModule.bindTreasuryPanel(state, {
    renderReserves: () => calls.push('reserves'),
    renderLogs: () => calls.push('logs'),
    renderContributions: (rows) => calls.push(rows),
  });
  const contributions = new Map([
    ['Player', { goodsDonated: new BigNumber(20) }],
  ]);
  state.setLogs([], {}, { contributions });
  assert.deepEqual(calls, [contributions, 'logs']);
  state.setReserves({ medals: 100 });
  assert.deepEqual(calls, [contributions, 'logs', 'reserves']);
  unbind();
});

test('rendering treasury reserves preserves the mounted logs and contributions siblings', (t) => {
  const previous = globalThis.document;
  const reserves = { innerHTML: '', style: {}, querySelector: () => null };
  const logs = { innerHTML: 'existing logs', style: {} };
  const contributions = { innerHTML: 'existing contributions', style: {} };
  globalThis.document = {
    getElementById: (id) =>
      ({
        treasuryReserves: reserves,
        treasuryLog: logs,
        treasuryContributions: contributions,
      })[id] || null,
  };
  t.after(() => {
    globalThis.document = previous;
  });
  treasuryModule.renderTreasuryPanel(
    { medals: 20 },
    { showOptions: { showTreasury: true } },
  );
  assert.match(reserves.innerHTML, /treasurytable/);
  assert.equal(logs.innerHTML, 'existing logs');
  assert.equal(contributions.innerHTML, 'existing contributions');
});

test('Treasury Logs icon expands once and pagination preserves expansion and viewport size', (t) => {
  const previousDocument = globalThis.document;
  let collapsed = true;
  let toggles = 0;
  const nodes = {};
  const makeNode = () => ({
    style: {},
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
  });
  const target = {
    style: {},
    querySelector: (id) => nodes[id.slice(1)],
    set innerHTML(html) {
      this.html = html;
      nodes.treasuryLogTextLabel = makeNode();
      nodes.treasuryLogicon = makeNode();
      nodes.treasuryLogViewport = makeNode();
      nodes.treasuryLogViewport.style.height =
        /height: (\d+)px/.exec(html)?.[1] + 'px';
    },
    get innerHTML() {
      return this.html;
    },
  };
  globalThis.document = { getElementById: (id) => nodes[id] || null };
  t.after(() => {
    globalThis.document = previousDocument;
  });
  const collapse = {
    get collapseTreasuryLog() {
      return collapsed;
    },
    fCollapseTreasuryLog() {
      collapsed = !collapsed;
      toggles++;
    },
  };
  const render = () =>
    treasuryModule.renderTreasuryLogPanel(
      [],
      {},
      { targetEl: target, collapse },
    );
  render();
  assert.match(target.innerHTML, /id="treasuryLogText" class="collapse "/);
  nodes.treasuryLogicon.listeners.click();
  nodes.treasuryLogTextLabel.listeners.click({
    target: { closest: () => nodes.treasuryLogicon },
  });
  assert.equal(toggles, 1);
  nodes.treasuryLogViewport.style.height = '320px';
  render();
  assert.match(target.innerHTML, /id="treasuryLogText" class="collapse show"/);
  assert.match(target.innerHTML, /height: 320px/);
  assert.match(target.innerHTML, /min-height: 0/);
  nodes.treasuryLogTextLabel.listeners.click({
    target: { closest: () => null },
  });
  render();
  assert.equal(collapsed, true);
  assert.match(target.innerHTML, /id="treasuryLogText" class="collapse "/);
});

test('treasury log resource labels resolve streamed metadata and escape it', (t) => {
  const previous = globalThis.document;
  globalThis.document = { getElementById: () => null };
  t.after(() => {
    globalThis.document = previous;
  });
  const target = { innerHTML: '', style: {} };
  treasuryModule.renderTreasuryLogPanel(
    [
      {
        playerName: 'Player',
        resource: 'internal_id',
        amount: new BigNumber(1),
      },
    ],
    {},
    {
      targetEl: target,
      resourceDefs: [{ id: 'internal_id', name: '<Real resource>' }],
    },
  );
  assert.match(target.innerHTML, /&lt;Real resource&gt;/);
  assert.doesNotMatch(target.innerHTML, /internal_id/);
});

test('contributions controls preserve collapsed preference across rerenders', (t) => {
  const previous = globalThis.document;
  const nodes = {};
  const target = {
    style: {},
    set innerHTML(value) {
      this.html = value;
      for (const id of [
        'treasuryContributionsLabel',
        'treasuryContributionsicon',
        'treasuryContributionsCopyID',
      ])
        nodes[id] = {
          addEventListener(type, fn) {
            this[type] = fn;
          },
        };
    },
  };
  globalThis.document = { getElementById: (id) => nodes[id] || null };
  t.after(() => {
    globalThis.document = previous;
  });
  let collapsed = false;
  let toggles = 0;
  const context = {
    targetEl: target,
    collapse: {
      get collapseTreasuryContributions() {
        return collapsed;
      },
      fCollapseTreasuryContributions() {
        collapsed = !collapsed;
        toggles++;
      },
    },
    element: {
      copy: (id) => `<span id="${id}">Copy</span>`,
      icon: (id) => `<span id="${id}"></span>`,
    },
  };
  contributionsModule.renderTreasuryContributionsPanel(new Map(), context);
  assert.match(
    target.html,
    /id="treasuryContributionsText" class="collapse show"/,
  );
  assert.equal(typeof nodes.treasuryContributionsCopyID.click, 'function');
  nodes.treasuryContributionsicon.click();
  nodes.treasuryContributionsLabel.click({
    target: { closest: () => nodes.treasuryContributionsicon },
  });
  assert.equal(toggles, 1);
  contributionsModule.renderTreasuryContributionsPanel(new Map(), context);
  assert.match(target.html, /id="treasuryContributionsText" class="collapse "/);
});

test('contribution eras use abbreviations and put newer streamed resources first', (t) => {
  const previous = globalThis.document;
  globalThis.document = { getElementById: () => null };
  t.after(() => {
    globalThis.document = previous;
  });
  const target = { innerHTML: '', style: {} };
  contributionsModule.renderTreasuryContributionsPanel(new Map(), {
    targetEl: target,
    logs: [],
    reserves: new Map([
      ['old', 1],
      ['new', 2],
      ['hub', 3],
    ]),
    resourceDefs: [
      { id: 'old', era: 'SpaceAgeJupiterMoon', name: 'Old goods' },
      { id: 'new', era: 'StellarAgeDiscovery', name: 'New goods' },
      { id: 'hub', era: 'SpaceAgeSpaceHub', name: 'Hub goods' },
    ],
    roster: [],
  });
  assert.match(target.innerHTML, /SAD: New goods/);
  assert.match(target.innerHTML, /SASH: Hub goods/);
  assert.match(target.innerHTML, /SAJM: Old goods/);
  assert.ok(
    target.innerHTML.indexOf('SAD: New goods') <
      target.innerHTML.indexOf('SASH: Hub goods'),
  );
  assert.ok(
    target.innerHTML.indexOf('SASH: Hub goods') <
      target.innerHTML.indexOf('SAJM: Old goods'),
  );
  assert.doesNotMatch(
    target.innerHTML,
    /SpaceAgeJupiterMoon|StellarAgeDiscovery/,
  );
});
