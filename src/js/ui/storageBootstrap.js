/**
 * storageBootstrap.js
 *
 * Bootstraps local extension storage on startup, hydrates storage listeners
 * and in-memory state, and loads canonical UI localization dictionaries.
 */

const { createLogger } = require('../utils/logger.js');

const logger = createLogger('StorageBootstrap');

const CANONICAL_LOCALES = {
  de: 'i18n/de.json',
  el: 'i18n/el.json',
  en: 'i18n/en.json',
  es: 'i18n/es.json',
  fr: 'i18n/fr.json',
  gr: 'i18n/gr.json',
  it: 'i18n/it.json',
};

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

function resolveHandleReceiveStorage(config) {
  if (typeof config.handleReceiveStorage === 'function') {
    return config.handleReceiveStorage;
  }
  try {
    return require('../state/storageListener.js').handleReceiveStorage;
  } catch {
    return () => {};
  }
}

function resolveTranslateContainer(config) {
  if (typeof config.translateContainer === 'function') {
    return config.translateContainer;
  }
  try {
    return require('../fn/i18n.js').translateContainer;
  } catch {
    return () => {};
  }
}

function resolveDollar(config) {
  if (config.$ !== undefined) {
    return config.$;
  }
  if (typeof $ !== 'undefined') {
    return $;
  }
  return undefined;
}

/**
 * Bootstraps storage and localization on startup.
 *
 * @param {Object} [config]
 * @param {Object} [storageDeps]
 * @returns {Promise<void>}
 */
function initStorageBootstrap(config = {}, storageDeps = {}) {
  const browserObj = config.browser;
  if (!browserObj?.storage?.local?.get) {
    return Promise.resolve();
  }

  const handleReceiveStorageFn = resolveHandleReceiveStorage(config);
  const translateContainerFn = resolveTranslateContainer(config);
  const jq = resolveDollar(config);

  return Promise.resolve(true)
    .then(() => {
      logStorageUsage(browserObj);

      return browserObj.storage.local
        .get(null)
        .then((stored) => {
          handleReceiveStorageFn(stored, storageDeps);

          if (
            typeof process !== 'undefined' &&
            process.env?.NODE_ENV === 'development'
          ) {
            if (typeof jq !== 'undefined' && jq?.i18n) {
              jq.i18n.debug = true;
            }
          }

          const language =
            typeof config.getLanguage === 'function' ?
              config.getLanguage()
            : 'auto';

          if (typeof jq === 'undefined' || typeof jq?.i18n !== 'function') {
            logger.debug('jQuery i18n unavailable; skipping translation load');
            return;
          }

          if (language !== 'auto') {
            jq.i18n({ locale: language });
          }
          logger.debug(language, jq.i18n().locale, jq.i18n.debug);

          jq.i18n()
            .load(CANONICAL_LOCALES)
            .done(function () {
              translateContainerFn(config.document?.body);
              logger.debug('i18n.load OK');
            });
        })
        .catch((err) => logger.warn('storage bootstrap failed:', err));
    })
    .catch((err) => logger.warn('storage bootstrap promise failed:', err));
}

module.exports = {
  initStorageBootstrap,
  logStorageUsage,
  CANONICAL_LOCALES,
};
