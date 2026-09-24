const { createLogger } = require('../utils/logger.js');
const { applyCardVisibility } = require('./cardVisibility.js');
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

function bindNetworkBridge(config = {}) {
  const browserObj = config.browser;
  const storage = resolveDep(config, 'storage', () =>
    require('../fn/storage.js'),
  );
  const state = resolveDep(config, 'state', () => require('../vars/state.js'));
  const setGameOrigin = state?.setGameOrigin || config.setGameOrigin;
  const setOptions = resolveDep(config, 'setOptions', () =>
    require('../vars/showOptions.js'),
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
              storage?.setWorld?.(world);
              setGameOrigin?.(`https://${hostname}`);
              storage?.registerKnownWorld?.(world);
              storage?.getWorldSettings?.(world).then((worldSettings) => {
                if (worldSettings && worldSettings.showOptions) {
                  setOptions?.('showOptions', worldSettings.showOptions);
                  applyCardVisibility();
                }
              });
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
            storage.setWorld(world);
            setGameOrigin?.(`https://${match[1]}.forgeofempires.com`);
            storage.registerKnownWorld(world);
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
};
module.exports.default = module.exports;
