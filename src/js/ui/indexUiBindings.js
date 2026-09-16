/**
 * indexUiBindings.js
 *
 * Index-level UI, startup, and runtime bindings extracted from the index.js
 * monolith. Owns the panel event listeners (options button, theme media query,
 * window message bridge), storage byte-usage logging, the storage/i18n startup
 * bootstrap, browser runtime lifecycle listeners, storage-change wiring, and the
 * DevTools/network bridge.
 *
 * All browser/DOM dependencies are injected through `config`, and the remaining
 * extension-module dependencies are resolved lazily so this module can be
 * required safely in a headless Node test environment.
 *
 * Dual CJS/ESM compatible.
 */

const { createLogger } = require('../utils/logger.js');
const { escapeHTML } = require('../utils/formatters.js');
const { applyCardVisibility } = require('../ui/cardVisibility.js');
const { initStorageListeners } = require('../state/storageListener.js');
const { initNetworkListeners } = require('../protocol/networkListener.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');
const {
  initStorageBootstrap,
  logStorageUsage,
} = require('./storageBootstrap.js');

const logger = createLogger('IndexUiBindings');

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

function bindOptionsButton(targetDocument, browserObj, win) {
  if (!targetDocument || typeof targetDocument.querySelector !== 'function') {
    return null;
  }
  const optionsButton = targetDocument.querySelector('#go-to-options');
  if (!optionsButton || typeof optionsButton.addEventListener !== 'function') {
    return null;
  }
  optionsButton.addEventListener('click', function () {
    if (browserObj.runtime && browserObj.runtime.openOptionsPage) {
      browserObj.runtime.openOptionsPage();
    } else {
      win.open(browserObj.runtime.getURL('options.html'));
    }
  });
  logger.debug('bound #go-to-options click handler');
  return optionsButton;
}

function bindWindowMessageListener(win) {
  if (!win || typeof win.addEventListener !== 'function') return null;
  win.addEventListener(
    'message',
    function (event) {
      logger.debug('received response:', event?.data);
    },
    false,
  );
  return win;
}

function bindThemeToggle(win, targetDocument, onThemeChange) {
  if (!win || typeof win.matchMedia !== 'function') return null;
  const media = win.matchMedia('(prefers-color-scheme: dark)');
  if (!media || typeof media.addEventListener !== 'function') return null;
  media.addEventListener('change', ({ matches }) => {
    if (targetDocument?.body?.classList) {
      targetDocument.body.classList.toggle('bg-dark');
      targetDocument.body.classList.toggle('text-light');
    }
    logger.debug(matches ? 'change to dark mode!' : 'change to light mode!');
    if (typeof onThemeChange === 'function') onThemeChange(matches);
  });
  return media;
}

function buildStorageDeps(config = {}) {
  const state = resolveDep(config, 'state', () => require('../vars/state.js'));

  return {
    storage: resolveDep(config, 'storage', () => require('../fn/storage.js')),
    setOptions: resolveDep(config, 'setOptions', () =>
      require('../vars/showOptions.js'),
    ),
    applyCardVisibility,
    setTargetsTopic: (val) => state?.setTargetsTopic?.(val),
    setTargetText: (val) => state?.setTargetText?.(val),
    setCurrentPercent: config.setCurrentPercent,
    setUrl: (val) => state?.setUrl?.(val),
    setToolOptions: resolveDep(
      config,
      'setToolOptions',
      () => require('../fn/globals.js'),
      'setToolOptions',
    ),
    setResourceDefs: config.setResourceDefs,
    collapseOptions: resolveDep(config, 'collapseOptions', () =>
      require('../fn/collapse.js'),
    ),
    processMetadataData: config.processMetadataData,
    resolveMissingCityEntitiesFromMap: config.resolveMissingCityEntitiesFromMap,
    renderLiveCityStats: config.renderLiveCityStats,
    startupService: config.startupService,
    setDonationPercent: config.setDonationPercent,
    setDonationSuffix: config.setDonationSuffix,
    setLanguage: config.setLanguage,
    setMetadataLoaded: config.setMetadataLoaded,
    getLastStartupMsg: config.getLastStartupMsg,
    setLastStartupMsg: config.setLastStartupMsg,
    getServiceLastStartupMsg: config.getServiceLastStartupMsg,
    getPendingStartupMsg: config.getPendingStartupMsg,
    setPendingStartupMsg: config.setPendingStartupMsg,
    BuildingEntityLookup: state?.BuildingEntityLookup,
    AllyDefs: state?.AllyDefs,
    ResearchDefs: state?.ResearchDefs,
    MilitaryDefs: state?.MilitaryDefs,
    MetaIds: state?.MetaIds,
    playerNameCache: state?.playerNameCache,
    browser: config.browser,
  };
}

function bindStorageListeners(storageDeps) {
  initStorageListeners(storageDeps);
  logger.debug('storage listeners initialized');
}

function bindRuntimeLifecycle(config = {}) {
  const browserObj = config.browser;
  const tool = config.tool || { name: 'FoE-Info', version: '' };
  const alertFn =
    typeof config.alertFn === 'function' ? config.alertFn : globalThis.alert;

  if (browserObj?.runtime?.onInstalled?.addListener) {
    browserObj.runtime.onInstalled.addListener((details) => {
      if (details.reason == 'install') {
        logger.debug(`${tool.name} installed!`);
      } else if (details.reason == 'update') {
        logger.debug(
          `${tool.name} updated from ${details.previousVersion} to ${tool.version}!`,
        );
        if (typeof alertFn === 'function') {
          alertFn(
            `${tool.name} updated from ${details.previousVersion} to ${tool.version}!`,
          );
        }
      }
    });
  }

  if (browserObj?.runtime?.onUpdateAvailable?.addListener) {
    browserObj.runtime.onUpdateAvailable.addListener((details) => {
      logger.debug('updating to version ' + details.version);
      if (typeof alertFn === 'function') {
        alertFn('updating to version ' + details.version);
      }
      browserObj.runtime.reload();
    });
  }

  if (typeof browserObj?.runtime?.requestUpdateCheck === 'function') {
    let requestingCheck;
    try {
      requestingCheck = browserObj.runtime.requestUpdateCheck();
    } catch (err) {
      logger.warn('requestUpdateCheck failed:', err);
      return;
    }
    if (requestingCheck && typeof requestingCheck.then === 'function') {
      requestingCheck.then(onRequested, onError);
    }
  }
}

function onRequested(status, details) {
  if (status == 'update_available') {
    logger.debug('update pending...', details?.version);
  } else if (status == 'no_update') {
    logger.debug('no update found');
  } else if (status == 'throttled') {
    logger.debug("Oops, I'm asking too frequently - I need to back off.");
  }
}

function onError(error) {
  logger.warn(`Error: ${error}`);
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

  if (!browserObj) return;

  initNetworkListeners({
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

function initIndexUiBindings(config = {}) {
  const win =
    config.window || (typeof window !== 'undefined' ? window : undefined);
  const targetDocument =
    config.document || (typeof document !== 'undefined' ? document : undefined);
  const browserObj = config.browser;

  bindOptionsButton(targetDocument, browserObj, win);
  bindWindowMessageListener(win);
  bindThemeToggle(win, targetDocument, config.onThemeChange);
  logStorageUsage(browserObj);

  const storageDeps = buildStorageDeps(config);
  initStorageBootstrap(config, storageDeps);
  bindStorageListeners(storageDeps);

  bindRuntimeLifecycle(config);
  bindNetworkBridge(config);

  logger.debug('index UI bindings initialized');
  return { storageDeps };
}

function bootstrapExtensionUi(options = {}) {
  const browserObj =
    options.browser ||
    (typeof __webpack_require__ !== 'undefined' ?
      require('webextension-polyfill')
    : globalThis.browser);
  const win =
    options.window || (typeof window !== 'undefined' ? window : undefined);
  const targetDoc =
    options.document ||
    (typeof document !== 'undefined' ? document : undefined);
  const citystats = options.citystats || options.containers?.citystats;
  const tool = options.tool || browserObj?.runtime?.getManifest?.() || {};

  let lastStartupMsg = null;
  let pendingStartupMsg = null;
  let inspectedWorldId = null;
  let gameVersion = 0;
  let language =
    (win && (win.navigator?.userLanguage || win.navigator?.language)) || 'en';

  const onStartupMsg = options.onStartupMsg || (() => {});

  return initIndexUiBindings({
    browser: browserObj,
    window: win,
    document: targetDoc,
    citystats,
    tool,
    renderLiveCityStats: options.renderLiveCityStats,
    startupService: options.startupService,
    setCurrentPercent: options.setCurrentPercent,
    setResourceDefs: options.setResourceDefs,
    processMetadataData: options.processMetadataData,
    getLanguage: () => language,
    setLanguage: (v) => {
      language = v;
    },
    getLastStartupMsg: () => lastStartupMsg,
    getServiceLastStartupMsg: options.getServiceLastStartupMsg,
    setLastStartupMsg: (m) => {
      lastStartupMsg = m;
      onStartupMsg(m);
    },
    getPendingStartupMsg: () => pendingStartupMsg,
    setPendingStartupMsg: (m) => {
      pendingStartupMsg = m;
    },
    resolveMissingCityEntitiesFromMap:
      options.resolveMissingCityEntitiesFromMap,
    logRpcMessage: options.logRpcMessage,
    getInspectedWorldId: () => inspectedWorldId,
    setInspectedWorldId: (w) => {
      inspectedWorldId = w;
    },
    getGameVersion: () => gameVersion,
    setGameVersion: (v) => {
      gameVersion = v;
    },
    onGameVersionChange: (newVersion) => {
      if (citystats) {
        const safeVersion = escapeHTML(newVersion);
        const safeName = escapeHTML(tool.name || 'FoE-Info');
        const safeToolVersion = escapeHTML(tool.version || '');
        const html = `<div><span data-i18n="gameversion">Game Version</span>: ${safeVersion}<br>${safeName}: ${safeToolVersion}</div>`;
        if (typeof citystats.insertAdjacentHTML === 'function') {
          citystats.insertAdjacentHTML('beforeend', html);
        } else {
          citystats.innerHTML = `${citystats.innerHTML}${html}`;
        }
      }
    },
  });
}

module.exports = {
  initIndexUiBindings,
  bootstrapExtensionUi,
  bindOptionsButton,
  bindWindowMessageListener,
  bindThemeToggle,
  logStorageUsage,
  bindRuntimeLifecycle,
  bindNetworkBridge,
  initStorageBootstrap,
  buildStorageDeps,
  onRequested,
  onError,
};
module.exports.default = module.exports;
