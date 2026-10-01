const { createLogger } = require('../utils/logger.js');
const { applyCardVisibility } = require('./cardVisibility.js');
const { applyWorldConfig } = require('../state/storageWorldSettings.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');
const {
  initNetworkListeners: initNetworkListenersDefault,
} = require('../protocol/networkListener.js');

const logger = createLogger('NetworkBridge');

function safeRequire(loader) {
  if (typeof __webpack_require__ === 'undefined') return undefined;
  try {
    return loader();
  } catch {
    return undefined;
  }
}

function resolveDep(config, key, loader, exportName) {
  if (config && config[key] !== undefined) {
    return config[key];
  }
  const mod = safeRequire(loader);
  if (!mod) return undefined;
  if (exportName) return mod[exportName] ?? mod.default?.[exportName];
  return mod.default ?? mod;
}

/**
 * Creates a world-switch coordinator.
 *
 * A single switch increments a generation token, sets the world, loads the
 * target world's COMPLETE saved configuration, applies it (showOptions,
 * donation, webhooks, collapses), and resets session-scoped
 * state. Async completion is guarded by the generation token: a slow load for
 * world A can never apply after the user has already switched to world B.
 *
 * @param {Object} deps - storage handle plus the config appliers consumed by
 *   applyWorldConfig (setOptions, setDonationPercent, ..., collapseOptions),
 *   applyCardVisibility and an optional resetSessionState hook.
 * @returns {{ switchToWorld: (worldId: string) => Promise<Object|null>,
 *             getGeneration: () => number }}
 */
function createWorldSwitcher(deps = {}) {
  let generation = 0;

  async function switchToWorld(worldId) {
    const gen = ++generation;
    const storage = deps.storage;

    if (typeof storage?.setWorld === 'function') {
      storage.setWorld(worldId);
    }

    let worldData = null;
    try {
      worldData = await storage?.getWorldSettings?.(worldId);
    } catch (e) {
      logger.debug('world configuration load failed', e?.message);
    }

    if (gen !== generation) {
      // A newer switch superseded this load — discard the stale configuration.
      return null;
    }

    if (worldData && typeof worldData === 'object') {
      applyWorldConfig(worldData, deps);
    }
    deps.applyCardVisibility?.();
    if (typeof deps.resetSessionState === 'function') {
      try {
        deps.resetSessionState();
      } catch (e) {
        logger.debug('session reset failed', e?.message);
      }
    }
    return worldData;
  }

  return { switchToWorld, getGeneration: () => generation };
}

function bindNetworkBridge(config = {}) {
  const browserObj = config.browser;
  const storage = resolveDep(config, 'storage', () =>
    require('../fn/storage.js'),
  );
  const state = resolveDep(config, 'state', () => require('../vars/state.mjs'));
  const setGameOrigin = state?.setGameOrigin || config.setGameOrigin;
  const setOptions = resolveDep(config, 'setOptions', () =>
    require('../vars/showOptions.mjs'),
  );

  const getInspectedWorldId =
    typeof config.getInspectedWorldId === 'function' ?
      config.getInspectedWorldId
    : () => null;
  const setInspectedWorldId =
    typeof config.setInspectedWorldId === 'function' ?
      config.setInspectedWorldId
    : () => {};
  const getGameVersion =
    typeof config.getGameVersion === 'function' ?
      config.getGameVersion
    : () => 0;
  const setGameVersion =
    typeof config.setGameVersion === 'function' ?
      config.setGameVersion
    : () => {};
  const onGameVersionChange =
    typeof config.onGameVersionChange === 'function' ?
      config.onGameVersionChange
    : () => {};

  const applierDeps = {
    storage,
    setOptions,
    applyCardVisibility,
    setTargetsTopic: config.setTargetsTopic || state?.setTargetsTopic,
    setTargetText: config.setTargetText || state?.setTargetText,
    setUrl: config.setUrl || state?.setUrl,
    setDonationPercent: config.setDonationPercent,
    setCurrentPercent: config.setCurrentPercent,
    setDonationSuffix: config.setDonationSuffix,
    setToolOptions: resolveDep(
      config,
      'setToolOptions',
      () => require('../fn/globals.mjs'),
      'setToolOptions',
    ),
    collapseOptions: resolveDep(config, 'collapseOptions', () =>
      require('../fn/collapse.mjs'),
    ),
    // A Great Building cache holds per-world RPC-derived data, so a world
    // change must not surface another world's building data. Default the
    // session reset to the registry's reset (idempotent Map clear, generation
    // token-guarded inside createWorldSwitcher so it cannot race an in-flight
    // read). Callers keep the option to override with their own hook.
    resetSessionState:
      resolveDep(
        config,
        'resetSessionState',
        () => require('../state/GreatBuildingRegistry.js'),
        'reset',
      ) ?? config.resetSessionState,
  };
  const worldSwitcher = createWorldSwitcher(applierDeps);
  const { switchToWorld } = worldSwitcher;

  try {
    if (browserObj?.devtools?.inspectedWindow?.eval) {
      browserObj.devtools.inspectedWindow.eval(
        'window.location.hostname',
        (hostname) => {
          if (hostname && typeof hostname === 'string') {
            const match = hostname.match(/([a-z0-9]+)\.forgeofempires\.com/i);
            if (match && match[1]) {
              const world = match[1].toLowerCase();
              setInspectedWorldId(world);
              setGameOrigin?.(`https://${hostname}`);
              storage?.registerKnownWorld?.(world);
              // Applies the world's complete saved configuration.
              switchToWorld(world);
            }
          }
        },
      );
    }
  } catch (e) {
    logger.debug('devtools inspectedWindow bridge unavailable', e?.message);
  }

  try {
    if (browserObj?.devtools?.network?.onNavigated) {
      browserObj.devtools.network.onNavigated.addListener((url) => {
        if (url && typeof url === 'string') {
          const match = url.match(
            /https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i,
          );
          if (
            match &&
            match[1] &&
            typeof storage?.isPlayableWorld === 'function' &&
            storage.isPlayableWorld(match[1])
          ) {
            const world = match[1].toLowerCase();
            setInspectedWorldId(world);
            setGameOrigin?.(`https://${match[1]}.forgeofempires.com`);
            storage.registerKnownWorld(world);
            // Applies the target world's complete saved configuration
            // (donation options, webhooks, collapses) instead of
            // only setting the world id.
            switchToWorld(world);
          }
        }
      });
    }
  } catch (e) {
    logger.debug('devtools onNavigated bridge unavailable', e?.message);
  }
  // Use injected networkListeners if provided, otherwise default to real impl.
  const initNetworkListenersImpl =
    config.networkListeners ?? initNetworkListenersDefault;
  initNetworkListenersImpl({
    storage,
    setGameOrigin,
    setOptions,
    applyCardVisibility,
    // networkListener.js must call this (instead of its partial showOptions
    // fallback) whenever it detects a world change during RPC traffic.
    switchToWorld,
    messageDispatcher,
    logRpcMessage: config.logRpcMessage,
    browser: browserObj,
    getInspectedWorldId,
    setInspectedWorldId,
    onGameVersionChange,
    getGameVersion,
    setGameVersion,
  });
}

module.exports = {
  bindNetworkBridge,
  createWorldSwitcher,
};
module.exports.default = module.exports;
