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
const { translateContainer } = require('../fn/i18n.js');
const { applyCardVisibility } = require('../ui/cardVisibility.js');
const { processMetadataData } = require('../msg/MetadataService.js');
const { setResourceDefs } = require('../msg/ResourceService.js');
const {
  initStorageListeners,
  handleReceiveStorage,
} = require('../state/storageListener.js');
const { initNetworkListeners } = require('../protocol/networkListener.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

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

function logStorageUsage(browserObj) {
  if (
    browserObj &&
    browserObj.storage &&
    browserObj.storage.local &&
    typeof browserObj.storage.local.getBytesInUse === 'function'
  ) {
    try {
      browserObj.storage.local
        .getBytesInUse(null)
        .then((size) => logger.debug('getBytesInUse', size))
        .catch((err) => logger.warn('getBytesInUse error:', err));
    } catch (e) {
      logger.warn('getBytesInUse exception:', e);
    }
  }
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
  const startup = resolveDep(config, 'startup', () =>
    require('../msg/StartupService.js'),
  );

  return {
    storage: resolveDep(config, 'storage', () => require('../fn/storage.js')),
    setOptions: resolveDep(config, 'setOptions', () =>
      require('../vars/showOptions.js'),
    ),
    applyCardVisibility,
    setTargetsTopic: (val) => state?.setTargetsTopic?.(val),
    setTargetText: (val) => state?.setTargetText?.(val),
    setCurrentPercent: resolveDep(
      config,
      'setCurrentPercent',
      () => require('../msg/GreatBuildingsService.js'),
      'setCurrentPercent',
    ),
    setUrl: (val) => state?.setUrl?.(val),
    setToolOptions: resolveDep(
      config,
      'setToolOptions',
      () => require('../fn/globals.js'),
      'setToolOptions',
    ),
    setResourceDefs,
    collapseOptions: resolveDep(config, 'collapseOptions', () =>
      require('../fn/collapse.js'),
    ),
    processMetadataData,
    resolveMissingCityEntitiesFromMap: config.resolveMissingCityEntitiesFromMap,
    renderLiveCityStats: startup?.renderLiveCityStats,
    startupService: startup?.startupService,
    setDonationPercent: config.setDonationPercent,
    setDonationSuffix: config.setDonationSuffix,
    setLanguage: config.setLanguage,
    setMetadataLoaded: config.setMetadataLoaded,
    getLastStartupMsg: config.getLastStartupMsg,
    setLastStartupMsg: config.setLastStartupMsg,
    getServiceLastStartupMsg: () => startup?.lastStartupMsg,
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

function initStorageBootstrap(config = {}, storageDeps) {
  const browserObj = config.browser;
  if (!browserObj?.storage?.local?.get) return;

  Promise.resolve(true)
    .then(() => {
      logStorageUsage(browserObj);

      browserObj.storage.local
        .get(null)
        .then((stored) => {
          handleReceiveStorage(stored, storageDeps);

          if (
            typeof process !== 'undefined' &&
            process.env?.NODE_ENV === 'development'
          ) {
            if (typeof $ !== 'undefined' && $.i18n) $.i18n.debug = true;
          }

          const language =
            typeof config.getLanguage === 'function' ?
              config.getLanguage()
            : 'auto';
          if (typeof $ === 'undefined' || typeof $.i18n !== 'function') {
            logger.debug('jQuery i18n unavailable; skipping translation load');
            return;
          }

          if (language != 'auto') {
            $.i18n({ locale: language });
          }
          logger.debug(language, $.i18n().locale, $.i18n.debug);
          $.i18n()
            .load({
              de: {
                load: 'Laden Sie das Spiel, um Ihre Stadtstatistiken anzuzeigen',
              },
              sv: {
                load: 'Ladda spelet för att se din stadsstatistik',
              },
              fi: {
                load: 'Lataa peli nähdäksesi kaupunkitilastot',
              },
              pt: {
                load: 'Carregue o jogo para ver as estatísticas da sua cidade',
              },
              nl: {
                load: 'Laad het spel om je stadsstatistieken te zien',
              },
              sr: {
                load: 'Учитајте игру да бисте видели статистику града',
              },
              ru: {
                load: 'Слава Украине!',
              },
              ua: {
                load: 'Слава Україні!',
              },
              en: 'i18n/en.json',
              es: 'i18n/es.json',
              fr: 'i18n/fr.json',
              el: 'i18n/el.json',
              gr: 'i18n/gr.json',
              it: 'i18n/it.json',
            })
            .done(function () {
              translateContainer(config.document?.body);
              logger.debug('i18n.load OK');
            });
        })
        .catch((err) => logger.warn('storage bootstrap failed:', err));
    })
    .catch((err) => logger.warn('storage bootstrap promise failed:', err));
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

module.exports = {
  initIndexUiBindings,
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
