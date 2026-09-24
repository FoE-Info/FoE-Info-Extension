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
const { applyCardVisibility } = require('./cardVisibility.js');
const { initStorageListeners } = require('../state/storageListener.js');
const {
  initStorageBootstrap,
  logStorageUsage,
} = require('./storageBootstrap.js');
const {
  bindOptionsButton,
  bindWindowMessageListener,
  bindThemeToggle,
} = require('./uiElementBindings.js');
const {
  bindRuntimeLifecycle,
  onRequested,
  onError,
} = require('./runtimeLifecycle.js');
const { bindNetworkBridge } = require('./networkBridge.js');

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
