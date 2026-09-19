/**
 * themeManager.js
 *
 * Manages panel theme resolution (auto/system, light, dark), frame background classes,
 * and media/storage synchronization.
 *
 * Core invariant:
 * - Alert cards retain their signature pastel palette in both light and dark modes.
 * - Only the window canvas (body/content) and header frame toggle between light and dark.
 */

let loggerModule;
try {
  loggerModule = require('../utils/logger.js');
} catch {}
const logger =
  typeof loggerModule?.createLogger === 'function' ?
    loggerModule.createLogger('ThemeManager')
  : { debug: () => {}, warn: () => {} };

let currentPreference = 'auto';
let isDarkActive = false;
let mediaQueryListener = null;

function resolveTheme(
  preference = 'auto',
  devtoolsTheme = '',
  prefersDark = false,
) {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;

  // 'auto' mode: check DevTools theme first, fallback to system prefers-color-scheme
  if (devtoolsTheme === 'dark') return true;
  if (devtoolsTheme === 'default') return false;
  return Boolean(prefersDark);
}

function applyTheme(targetDocument, isDark) {
  if (!targetDocument || !targetDocument.body) return;

  targetDocument.documentElement.setAttribute(
    'data-theme',
    isDark ? 'dark' : 'light',
  );

  if (targetDocument.body.classList) {
    targetDocument.body.classList.toggle('dark-mode', isDark);
    targetDocument.body.classList.toggle('bg-dark', isDark);
    targetDocument.body.classList.toggle('text-light', isDark);
  }

  const titleEl = targetDocument.getElementById('title');
  if (titleEl) {
    titleEl.classList.toggle('bg-dark', isDark);
    titleEl.classList.toggle('text-light', isDark);
    const headingEl = titleEl.querySelector('h6');
    if (headingEl) {
      headingEl.classList.toggle('bg-dark', isDark);
      headingEl.classList.toggle('text-light', isDark);
    }
  }

  const contentEl = targetDocument.getElementById('content');
  if (contentEl) {
    contentEl.classList.toggle('bg-dark', isDark);
    contentEl.classList.toggle('text-light', isDark);
  }
}

function updateThemeState(
  targetDocument,
  preference,
  devtoolsTheme,
  prefersDark,
  onThemeChange,
) {
  currentPreference = preference;
  const nextIsDark = resolveTheme(preference, devtoolsTheme, prefersDark);
  isDarkActive = nextIsDark;
  applyTheme(targetDocument, nextIsDark);
  logger.debug(`Theme applied: preference=${preference}, isDark=${nextIsDark}`);
  if (typeof onThemeChange === 'function') {
    onThemeChange(nextIsDark);
  }
  return nextIsDark;
}

function initTheme(options = {}) {
  const {
    targetWindow = typeof window !== 'undefined' ? window : null,
    targetDocument = typeof document !== 'undefined' ? document : null,
    devtoolsTheme = '',
    initialPreference = 'auto',
    onThemeChange = null,
  } = options;

  let prefersDark = false;
  if (targetWindow && typeof targetWindow.matchMedia === 'function') {
    const media = targetWindow.matchMedia('(prefers-color-scheme: dark)');
    prefersDark = media.matches;

    if (mediaQueryListener && typeof media.removeEventListener === 'function') {
      media.removeEventListener('change', mediaQueryListener);
    }
    mediaQueryListener = (e) => {
      if (currentPreference === 'auto') {
        updateThemeState(
          targetDocument,
          'auto',
          devtoolsTheme,
          e.matches,
          onThemeChange,
        );
      }
    };
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', mediaQueryListener);
    }
  }

  return updateThemeState(
    targetDocument,
    initialPreference,
    devtoolsTheme,
    prefersDark,
    onThemeChange,
  );
}

function getTheme() {
  return currentPreference;
}

function isDarkMode() {
  return isDarkActive;
}

module.exports = {
  resolveTheme,
  applyTheme,
  initTheme,
  getTheme,
  isDarkMode,
};
module.exports.default = module.exports;
