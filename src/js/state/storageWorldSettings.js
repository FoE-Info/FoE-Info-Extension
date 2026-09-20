/**
 * storageWorldSettings.js
 *
 * Applies world-scoped configurations (options, donations, webhooks, collapses)
 * and global settings (time formatting, theme, language, debug mode).
 * Decoupled from storageListener.js.
 */

let createLogger;
try {
  createLogger = require('../utils/logger.js').createLogger;
} catch {
  createLogger = () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  });
}

const logger = createLogger('StorageWorldSettings');

/**
 * Applies world-scoped settings for the active world.
 *
 * @param {Object} worldData - Data for the active world from storage
 * @param {Object} deps - Resolved dependencies
 */
function applyWorldConfig(worldData, deps = {}) {
  if (!worldData || typeof worldData !== 'object') return;

  logger.debug('Applying world configuration:', worldData);

  if (worldData.showOptions) {
    deps.setOptions?.('showOptions', worldData.showOptions);
    deps.applyCardVisibility?.();
  }

  if (worldData.donation) {
    deps.setDonationPercent?.(worldData.donation.percent);
    deps.setCurrentPercent?.(worldData.donation.percent);
    deps.setDonationSuffix?.(worldData.donation.suffix);
    deps.setTargetsTopic?.(worldData.donation.targets);
    deps.setTargetText?.(worldData.donation.targetText);
  }

  if (worldData.webhooks) {
    deps.setUrl?.(worldData.webhooks);
  }

  if (worldData.toolOptions) {
    deps.setToolOptions?.(worldData.toolOptions);
  }

  if (worldData.collapses && typeof worldData.collapses === 'object') {
    for (const [collapseKey, collapseValue] of Object.entries(
      worldData.collapses,
    )) {
      deps.collapseOptions?.(collapseKey, collapseValue);
    }
  }
}

/**
 * Applies global extension settings (time formatting, theme, language).
 *
 * @param {Object} settings - Settings object (from 'global:settings' key)
 * @param {Object} deps - Resolved dependencies
 * @param {Object} [browser] - WebExtensions browser API object
 */
function applyGlobalSettings(settings, deps = {}, browser = null) {
  if (!settings || typeof settings !== 'object') return;

  logger.debug('Applying global settings:', settings);

  if (settings.timeFormatting) {
    try {
      const { setTimeFormattingConfig } = require('../utils/date.js');
      setTimeFormattingConfig(settings.timeFormatting);
    } catch (e) {
      logger.warn('Failed to set time formatting config:', e);
    }
  }

  if (settings.language && settings.language !== 'auto') {
    deps.setLanguage?.(settings.language);
  }

  if (settings.theme) {
    try {
      const themeManager = require('../ui/themeManager.js');
      const devtoolsTheme =
        deps.browser?.devtools?.panels?.themeName ||
        browser?.devtools?.panels?.themeName ||
        '';
      themeManager.initTheme({
        targetDocument: typeof document !== 'undefined' ? document : null,
        targetWindow: typeof window !== 'undefined' ? window : null,
        devtoolsTheme,
        initialPreference: settings.theme,
      });
    } catch (e) {
      logger.warn('Failed to initialize theme:', e);
    }
  }
}

/**
 * Applies top-level legacy fallback keys when no world-specific data exists.
 *
 * @param {string} key - Storage key
 * @param {*} value - Storage value
 * @param {Object} deps - Resolved dependencies
 * @returns {boolean} True if the key was handled as a legacy fallback
 */
function applyLegacyWorldFallbacks(key, value, deps = {}) {
  switch (key) {
    case 'showOptions':
      deps.setOptions?.('showOptions', value);
      deps.applyCardVisibility?.();
      return true;
    case 'targets':
      deps.setTargetsTopic?.(value);
      return true;
    case 'targetText':
      deps.setTargetText?.(value);
      return true;
    case 'toolOptions':
      deps.setToolOptions?.(value);
      return true;
    case 'donationPercent':
      deps.setDonationPercent?.(value);
      deps.setCurrentPercent?.(value);
      return true;
    case 'donationSuffix':
      deps.setDonationSuffix?.(value);
      return true;
    case 'url':
      deps.setUrl?.(value);
      return true;
    default:
      return false;
  }
}

/**
 * Sets debug logging state if debugEnabled key is provided.
 *
 * @param {*} enabled - Boolean flag or truthy value
 */
function applyDebugEnabled(enabled) {
  try {
    const { setDebugEnabled } = require('../utils/logger.js');
    setDebugEnabled(Boolean(enabled), { persist: false });
  } catch {}
}

module.exports = {
  applyWorldConfig,
  applyGlobalSettings,
  applyLegacyWorldFallbacks,
  applyDebugEnabled,
};
module.exports.default = module.exports;
