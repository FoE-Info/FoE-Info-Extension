import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Execute the real CJS modules with isolated dependencies. These are fixture
// observations of guarded bindings, not evidence from a live game session.
function loadModule(source, dependencies, globals = {}) {
  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    console: { warn() {}, error() {} },
    require(name) {
      if (!Object.hasOwn(dependencies, name))
        throw new Error(`Unavailable fixture dependency: ${name}`);
      const dependency = dependencies[name];
      if (dependency instanceof Error) throw dependency;
      return dependency;
    },
    ...globals,
  });
  vm.runInContext(fs.readFileSync(source, 'utf8'), context, {
    filename: source,
  });
  return module.exports;
}

function minimalDocument() {
  return {
    createElement() {
      return {
        style: {},
        appendChild() {},
      };
    },
  };
}

for (const [scenario, logging] of [
  ['missing logger module', new Error('absent')],
  ['missing logger factory', {}],
]) {
  test(`panel containers mount with ${scenario}`, () => {
    const factory = loadModule('src/js/ui/panelContainerFactory.js', {
      '../utils/logger.js': logging,
    });
    const mounted = [];
    const panels = factory.setupPanelContainers(
      { appendChild: (element) => mounted.push(element) },
      {},
      minimalDocument(),
    );
    assert.ok(mounted.includes(panels.header));
    assert.ok(mounted.includes(panels.quantumContributions));
  });
}

test('panel containers invoke the supplied logger factory and debug method', () => {
  const calls = [];
  const factory = loadModule('src/js/ui/panelContainerFactory.js', {
    '../utils/logger.js': {
      createLogger(name) {
        calls.push(name);
        return { debug: (message) => calls.push(message) };
      },
    },
  });
  factory.setupPanelContainers({ appendChild() {} }, {}, minimalDocument());
  assert.deepEqual(calls, [
    'PanelContainerFactory',
    'panel containers created and mounted',
  ]);
});

for (const scenario of [
  'no callback',
  'throwing callback',
  'replacement callback',
]) {
  test(`QI context guard delegates with ${scenario}`, () => {
    const raids = loadModule('src/js/msg/GuildRaidsService.js', {
      '../protocol/MessageDispatcher.js': { messageDispatcher: {} },
      '../state/GuildDomainState.js': { quantumState: {} },
    });
    const calls = [];
    if (scenario !== 'no callback') {
      raids.configurePresentation({
        setCurrentView(view) {
          calls.push(view);
          if (scenario === 'throwing callback') throw new Error('fixture');
        },
      });
    }
    const handlers = new Map();
    const service = new raids.GuildRaidsService();
    service.handleOverview = (message) => {
      calls.push(message);
      return 'delegated';
    };
    service.register({
      register(requestClass, method, callback) {
        handlers.set(`${requestClass}.${method}`, callback);
      },
    });
    const message = { responseData: {} };
    assert.equal(
      handlers.get('GuildRaidsMapService.getOverview')(message),
      'delegated',
    );
    assert.deepEqual(
      calls,
      scenario === 'no callback' ? [message] : ['QI', message],
    );
  });
}

test('tooltip uses local setters when state and optional UI dependencies cannot load', () => {
  const tooltip = loadModule('src/js/ui/playerTooltip.js', {});
  tooltip.updatePlayerNameCache(42, 'Fixture Player');
  tooltip.updateIgnoreListUI({ ignoredPlayerIds: { first: 42 } });
  assert.equal(tooltip.formatPlayerLabel(42), 'Fixture Player');
  assert.match(tooltip.getUserTooltipHTML(), /Fixture Player/);
  assert.match(tooltip.getUserTooltipHTML(), /ignoring/);
  assert.equal(tooltip.pendingScoreDBFetches.size, 0);
});

test('tooltip invokes namespace setters supplied by the state dependency', async () => {
  const calls = [];
  const state = {
    GameOrigin: 'en7',
    ignoredPlayers: {},
    playerNameCache: {},
    setIgnoredPlayers(by, ignoring) {
      calls.push('setIgnoredPlayers');
      state.ignoredPlayers = {
        ignoredByPlayerIds: by,
        ignoredPlayerIds: ignoring,
      };
    },
    updatePlayerNameCache(id, name) {
      calls.push('updatePlayerNameCache');
      state.playerNameCache[String(id)] = { currentName: name };
    },
  };
  const tooltip = loadModule(
    'src/js/ui/playerTooltip.js',
    { '../vars/state.mjs': state },
    {
      fetch: async () => ({
        ok: true,
        text: async () => '<title>Fixture Player - Forge of Empires</title>',
      }),
    },
  );
  tooltip.updateIgnoreListUI({ ignoredPlayerIds: { first: 42 } });
  assert.equal(tooltip.formatPlayerLabel(42), '#42');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ['setIgnoredPlayers', 'updatePlayerNameCache']);
  assert.equal(tooltip.formatPlayerLabel(42), 'Fixture Player');
  assert.equal(tooltip.pendingScoreDBFetches.size, 0);
});

test('tooltip marks a player deleted after four ScoreDB 500 responses', async () => {
  let fetches = 0;
  let now = 1_000_000;
  const state = {
    GameOrigin: 'en7',
    ignoredPlayers: {},
    playerNameCache: {},
    deletedPlayerIds: {},
    setIgnoredPlayers(by, ignoring) {
      state.ignoredPlayers = {
        ignoredByPlayerIds: by,
        ignoredPlayerIds: ignoring,
      };
    },
    updatePlayerNameCache(id, name, opts = {}) {
      if (opts.notFound) {
        state.playerNameCache[String(id)] = {
          notFound: true,
          ...(opts.permanent ? { permanent: true } : {}),
          lastUpdated: now,
        };
      } else if (typeof opts.scoreDBFailureCount === 'number') {
        state.playerNameCache[String(id)] = {
          scoreDBFailureCount: opts.scoreDBFailureCount,
          scoreDBRetryAfter: opts.scoreDBRetryAfter,
          lastUpdated: now,
        };
      } else if (name) {
        state.playerNameCache[String(id)] = { currentName: name };
      }
    },
    markDeletedPlayer(id) {
      state.deletedPlayerIds[String(id)] = now;
    },
  };
  const globals = {
    Date: class FakeDate extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () => {
      fetches++;
      return { ok: false, status: 500 };
    },
  };
  const loadTooltip = () =>
    loadModule(
      'src/js/ui/playerTooltip.js',
      { '../vars/state.mjs': state },
      globals,
    );

  let tooltip = loadTooltip();
  tooltip.updateIgnoreListUI({ ignoredPlayerIds: { deleted: 856168137 } });
  for (let attempt = 1; attempt <= 4; attempt++) {
    tooltip.getUserTooltipHTML();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fetches, attempt);
    if (attempt < 4) {
      assert.equal(
        state.playerNameCache['856168137'].scoreDBFailureCount,
        attempt,
      );
      now = state.playerNameCache['856168137'].scoreDBRetryAfter;
      if (attempt === 1) tooltip = loadTooltip();
    }
  }
  assert.equal(state.deletedPlayerIds['856168137'], now);
  assert.equal(state.playerNameCache['856168137'].permanent, true);

  // The deleted-ID list survives a module reload and suppresses both the
  // request and the Ignore List display entry.
  tooltip = loadTooltip();
  tooltip.updateIgnoreListUI({ ignoredPlayerIds: { deleted: 856168137 } });
  assert.match(tooltip.getUserTooltipHTML(), /None/);
  assert.equal(tooltip.formatPlayerLabel(856168137), null);
  assert.equal(fetches, 4);
});

test('tooltip does not count DNS failures as deleted-player evidence', async () => {
  const state = {
    GameOrigin: 'en7',
    ignoredPlayers: {},
    playerNameCache: {},
    deletedPlayerIds: {},
    markDeletedPlayer(id) {
      state.deletedPlayerIds[String(id)] = true;
    },
    updatePlayerNameCache(id, name, opts = {}) {
      if (typeof opts.scoreDBFailureCount === 'number') {
        state.playerNameCache[String(id)] = opts;
      }
    },
  };
  const tooltip = loadModule(
    'src/js/ui/playerTooltip.js',
    { '../vars/state.mjs': state },
    {
      fetch: async () => {
        throw new Error('DNS lookup failed');
      },
    },
  );
  tooltip.formatPlayerLabel(856168137);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.playerNameCache['856168137'].scoreDBFailureCount, 0);
  assert.ok(state.playerNameCache['856168137'].scoreDBRetryAfter);
  assert.equal(state.deletedPlayerIds['856168137'], undefined);
  assert.equal(tooltip.pendingScoreDBFetches.size, 0);
});

test('tooltip treats an error page as temporary rather than deleted', async () => {
  const state = {
    GameOrigin: 'en7',
    ignoredPlayers: {},
    playerNameCache: {},
    deletedPlayerIds: {},
    markDeletedPlayer(id) {
      state.deletedPlayerIds[String(id)] = true;
    },
    updatePlayerNameCache(id, name, opts = {}) {
      if (typeof opts.scoreDBFailureCount === 'number') {
        state.playerNameCache[String(id)] = opts;
      } else if (opts.notFound) {
        state.playerNameCache[String(id)] = { notFound: true };
      }
    },
  };
  const tooltip = loadModule(
    'src/js/ui/playerTooltip.js',
    { '../vars/state.mjs': state },
    {
      fetch: async () => ({
        ok: true,
        text: async () => '<title>Error - ScoreDB</title>',
      }),
    },
  );
  tooltip.formatPlayerLabel(856168137);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.playerNameCache['856168137'].scoreDBFailureCount, 0);
  assert.ok(state.playerNameCache['856168137'].scoreDBRetryAfter);
  assert.equal(state.deletedPlayerIds['856168137'], undefined);
});
