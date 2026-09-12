/** Extension options page controller. */
const browserApi =
  (typeof globalThis !== 'undefined' && globalThis.browser) ||
  (typeof window !== 'undefined' && window.browser) ||
  (() => {
    try {
      return require('webextension-polyfill');
    } catch {
      return null;
    }
  })();

try {
  require('../css/options.scss');
} catch {}

const {
  populateForm,
  readGlobalSettingsFromForm,
  readWorldSettingsFromForm,
} = require('./ui/optionsForm.js');
const { createLogger } = require('./utils/logger.js');
const logger = createLogger('Options');
const {
  getGlobalSettings,
  getWorldSettings,
  initStorage,
  registerKnownWorld,
  resetWorldSettings,
  sanitizeWorldId,
  saveWorldSettings,
  setWorld,
} = require('./utils/storage.js');
const { loadAll, setLocale, translateContainer } = require('./utils/i18n.js');

const SUPPORTED_LOCALES = new Set(['en', 'de', 'el', 'es', 'fr', 'gr', 'it']);

function resolveOptionsLocale(language) {
  let code = String(language || 'en').toLowerCase();
  if (code === 'game') return 'en';
  if (code === 'auto') {
    const browserLang =
      typeof navigator !== 'undefined' && navigator.language ?
        navigator.language
      : 'en';
    code = browserLang.slice(0, 2).toLowerCase();
  }
  return SUPPORTED_LOCALES.has(code) ? code : 'en';
}

async function initOptionsI18n(globals) {
  try {
    const locale = resolveOptionsLocale(globals?.language);
    const map = { en: 'i18n/en.json' };
    if (locale !== 'en') map[locale] = `i18n/${locale}.json`;
    await loadAll(map);
    setLocale(locale);
    translateContainer(document.body);
    logger.debug(`options i18n loaded: ${locale}`);
  } catch (err) {
    logger.warn('options i18n bootstrap failed:', err);
  }
}

let activeWorld = 'en7';
let autoSaveTimer = null;
let toastTimer = null;

function getBrowser() {
  return (
    (typeof globalThis !== 'undefined' && globalThis.browser) ||
    (typeof window !== 'undefined' && window.browser) ||
    browserApi
  );
}

async function detectActiveGameTab() {
  const foeRegex = /^https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i;
  const b = getBrowser();
  try {
    if (b?.tabs?.query) {
      // 1. Active tab in current window
      const currentActive = await b.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (currentActive?.[0]?.url) {
        const match = currentActive[0].url.match(foeRegex);
        if (match?.[1]) return sanitizeWorldId(match[1]);
      }
      // 2. Query all open FoE tabs and pick the most recently accessed
      const foeTabs = await b.tabs.query({
        url: '*://*.forgeofempires.com/*',
      });
      if (foeTabs && foeTabs.length > 0) {
        const sorted = [...foeTabs].sort(
          (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0),
        );
        for (const t of sorted) {
          if (t.url) {
            const match = t.url.match(foeRegex);
            if (match?.[1]) return sanitizeWorldId(match[1]);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Unable to query browser tabs:', err);
  }
  return null;
}

async function discoverOpenGameWorlds() {
  const foeRegex = /^https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i;
  const worlds = [];
  const b = getBrowser();
  try {
    if (b?.tabs?.query) {
      const tabs = await b.tabs.query({
        url: '*://*.forgeofempires.com/*',
      });
      for (const tab of tabs || []) {
        if (tab.url) {
          const match = tab.url.match(foeRegex);
          if (match?.[1]) {
            const w = sanitizeWorldId(match[1]);
            if (!worlds.includes(w)) worlds.push(w);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Unable to query game tabs:', err);
  }
  return worlds;
}

async function detectActiveWorld(globals) {
  // 1. URL search or hash override (e.g. ?world=en16 or #en16)
  if (typeof window !== 'undefined' && window.location) {
    try {
      const urlParam =
        new URLSearchParams(window.location.search).get('world') ||
        window.location.hash.replace(/^#/, '');
      if (urlParam) {
        const sanitized = sanitizeWorldId(urlParam);
        if (sanitized && !sanitized.endsWith('0')) return sanitized;
      }
    } catch {}
  }

  // 2. Active game tab detection
  const detected = await detectActiveGameTab();
  if (detected && !detected.endsWith('0')) return detected;

  // 3. Stored lastActiveWorld
  if (globals?.lastActiveWorld && !globals.lastActiveWorld.endsWith('0')) {
    return sanitizeWorldId(globals.lastActiveWorld);
  }

  // 4. Known worlds list fallback
  const validKnown = globals?.knownWorlds?.filter((w) => !w.endsWith('0'));
  if (validKnown?.length) {
    return sanitizeWorldId(validKnown[0]);
  }
  return 'en7';
}

function renderWorldSelector(knownWorlds, currentWorld) {
  const select = document.getElementById('worldSelector');
  if (!select) return;
  select.innerHTML = '';
  const filtered = [...knownWorlds, currentWorld].filter(
    (w) => w && !w.endsWith('0'),
  );
  const worlds = Array.from(new Set(filtered));
  for (const w of worlds) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w.toUpperCase();
    if (w === currentWorld) opt.selected = true;
    select.appendChild(opt);
  }
  select.value = currentWorld;
}

function showSaveToast(message = 'Settings saved automatically.') {
  const toast = document.getElementById('saveToast');
  if (!toast) return;
  // Reveal the live region before writing so assistive tech announces it.
  toast.style.display = 'block';
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

function isOptionsFormValid() {
  const form = document.getElementById('optionsForm');
  return (
    !form || typeof form.checkValidity !== 'function' || form.checkValidity()
  );
}

async function saveCurrentSettings() {
  const b = getBrowser();
  const worldSettings = readWorldSettingsFromForm();
  await saveWorldSettings(activeWorld, worldSettings);
  const globalForm = readGlobalSettingsFromForm();
  const globals = await getGlobalSettings();
  const updatedGlobals = {
    ...globals,
    language: globalForm.language,
    timeFormatting: globalForm.timeFormatting,
    lastActiveWorld: activeWorld,
  };
  if (b?.storage?.local) {
    await b.storage.local.set({ 'global:settings': updatedGlobals });
  }
  try {
    const { setTimeFormattingConfig } = require('./utils/date.js');
    setTimeFormattingConfig(globalForm.timeFormatting);
  } catch {}
}

function onFormInput(e) {
  if (
    e.target &&
    (e.target.id === 'worldSelector' ||
      e.target.id === 'resetWorldBtn' ||
      e.target.id === 'save')
  ) {
    return;
  }
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    if (!isOptionsFormValid()) return;
    await saveCurrentSettings();
    showSaveToast();
  }, 300);
}

async function onWorldChange(e) {
  const b = getBrowser();
  const nextWorld = sanitizeWorldId(e.target.value);
  if (nextWorld === activeWorld) return;
  clearTimeout(autoSaveTimer);
  await saveCurrentSettings();

  activeWorld = nextWorld;
  setWorld(activeWorld);

  const globals = await getGlobalSettings();
  if (b?.storage?.local) {
    await b.storage.local.set({
      'global:settings': { ...globals, lastActiveWorld: activeWorld },
    });
  }

  const newSettings = await getWorldSettings(activeWorld);
  populateForm(newSettings, globals);
}

async function onResetWorld() {
  const confirmed = confirm(
    `Reset settings for world "${activeWorld.toUpperCase()}" to fresh install defaults?`,
  );
  if (!confirmed) return;
  clearTimeout(autoSaveTimer);
  const fresh = await resetWorldSettings(activeWorld);
  const globals = await getGlobalSettings();
  populateForm(fresh, globals);
  showSaveToast(`World "${activeWorld.toUpperCase()}" reset to defaults.`);
}

async function onExplicitSave() {
  clearTimeout(autoSaveTimer);
  await saveCurrentSettings();
  showSaveToast('Settings saved.');
}

function onOptionsSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('optionsForm');
  if (
    form &&
    typeof form.checkValidity === 'function' &&
    !form.checkValidity()
  ) {
    if (typeof form.reportValidity === 'function') form.reportValidity();
    return;
  }
  onExplicitSave();
}

async function initOptions() {
  const t0 = performance.now();
  await initStorage();
  const globals = await getGlobalSettings();
  await initOptionsI18n(globals);

  // 1. Immediately determine active world from URL, active game tab, or stored globals
  const initialWorld = await detectActiveWorld(globals);
  activeWorld = initialWorld;
  setWorld(activeWorld);

  // 2. Immediately render world selector and populate form from local storage
  const rawKnown =
    Array.isArray(globals.knownWorlds) ? globals.knownWorlds : [];
  const validKnown = rawKnown.filter((w) => w && !w.endsWith('0'));
  if (
    !validKnown.includes(activeWorld) ||
    globals.lastActiveWorld !== activeWorld
  ) {
    if (!validKnown.includes(activeWorld)) validKnown.push(activeWorld);
    registerKnownWorld(activeWorld).catch(() => {});
  }
  renderWorldSelector(validKnown, activeWorld);

  const worldSettings = await getWorldSettings(activeWorld);
  populateForm(worldSettings, globals);

  const elapsed = (performance.now() - t0).toFixed(2);
  logger.debug(
    `initOptions completed in ${elapsed}ms for world: ${activeWorld}`,
  );

  // 3. Mark container as loaded so it transitions in cleanly without FOUC
  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('loaded');
  }

  // 4. Attach event listeners
  document
    .getElementById('worldSelector')
    ?.addEventListener('change', onWorldChange);
  document
    .getElementById('resetWorldBtn')
    ?.addEventListener('click', onResetWorld);
  document
    .getElementById('optionsForm')
    ?.addEventListener('submit', onOptionsSubmit);

  const dateTimeFormatEl = document.getElementById('dateTimeFormat');
  const customPatternDiv = document.getElementById('customPatternDiv');
  if (dateTimeFormatEl && customPatternDiv) {
    dateTimeFormatEl.addEventListener('change', () => {
      customPatternDiv.style.display =
        dateTimeFormatEl.value === 'custom' ? '' : 'none';
    });
  }

  const formContainer = document.querySelector('.container') || document.body;
  formContainer.addEventListener('input', onFormInput);
  formContainer.addEventListener('change', onFormInput);

  // 5. In background: discover any new open game worlds without blocking UI
  discoverOpenGameWorlds()
    .then(async (discovered) => {
      let hasNew = false;
      for (const w of discovered) {
        if (!w.endsWith('0') && !validKnown.includes(w)) {
          await registerKnownWorld(w);
          hasNew = true;
        }
      }
      if (hasNew) {
        const refreshedGlobals = await getGlobalSettings();
        const updatedKnown = refreshedGlobals.knownWorlds?.filter(
          (w) => !w.endsWith('0'),
        ) || [activeWorld];
        renderWorldSelector(updatedKnown, activeWorld);
      }
    })
    .catch(() => {});
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptions);
  } else {
    initOptions();
  }
}

module.exports = {
  detectActiveGameTab,
  discoverOpenGameWorlds,
  detectActiveWorld,
  renderWorldSelector,
  initOptions,
  onOptionsSubmit,
  isOptionsFormValid,
};
module.exports.default = module.exports;
