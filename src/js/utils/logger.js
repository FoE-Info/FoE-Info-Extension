/**
 * logger.js
 *
 * Unified logger with debug gating, storage persistence, and leveled console
 * output. Routine diagnostics (debug/info) are emitted only in debug mode;
 * warnings and errors remain visible locally in standard mode. All output
 * targets the DevTools panel console.
 */

let debugEnabled = false;
const subscribers = new Set();

let debugRevision = 0;

function getBrowserStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  if (typeof browser !== 'undefined' && browser?.storage?.local) {
    return browser.storage.local;
  }
  try {
    const storage = require('./storage.js');
    return {
      get: (key) =>
        new Promise((resolve) => {
          if (typeof key === 'string') {
            resolve({ [key]: storage.get(key) });
          } else {
            resolve({});
          }
        }),
      set: (obj) =>
        new Promise((resolve) => {
          for (const [k, v] of Object.entries(obj)) {
            storage.set(k, v);
          }
          resolve();
        }),
    };
  } catch {
    return null;
  }
}

function isDebugEnabled() {
  return debugEnabled;
}

function onDebugToggle(callback) {
  if (typeof callback !== 'function') return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function setDebugEnabled(val, { persist = true } = {}) {
  const next = Boolean(val);
  if (debugEnabled === next) return debugEnabled;
  debugEnabled = next;
  debugRevision++;

  if (persist) {
    const storage = getBrowserStorage();
    if (storage?.set) {
      try {
        const p = storage.set({ debugEnabled: next });
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {}
    }
  }

  for (const cb of subscribers) {
    try {
      cb(debugEnabled);
    } catch (e) {
      console.warn('[FoE-Info:Logger] Subscriber error:', e);
    }
  }

  return debugEnabled;
}

function toggleDebug(opts = {}) {
  return setDebugEnabled(!debugEnabled, opts);
}

function createLogger(moduleName = '') {
  const prefix = moduleName ? `[FoE-Info:${moduleName}]` : '[FoE-Info]';

  return {
    debug: (...args) => {
      if (!debugEnabled) return;
      console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (!debugEnabled) return;
      console.info(prefix, ...args);
    },
    warn: (...args) => {
      console.warn(prefix, ...args);
    },
    error: (...args) => {
      console.error(prefix, ...args);
    },
    time: (label) => {
      if (!debugEnabled) return;
      console.time(`${prefix} ${label}`);
    },
    timeEnd: (label) => {
      if (!debugEnabled) return;
      console.timeEnd(`${prefix} ${label}`);
    },
  };
}

async function initDebugState() {
  const storage = getBrowserStorage();
  const revision = debugRevision;
  const isPanelStartup =
    typeof window !== 'undefined' &&
    window.location?.pathname === '/panel.html';
  if (storage?.get) {
    try {
      const res = await storage.get('debugEnabled');
      const stored =
        res && typeof res.debugEnabled === 'boolean' ?
          res.debugEnabled
        : undefined;
      // Every new panel session starts in standard mode. Other contexts read
      // the shared session value so an explicit icon toggle reaches them.
      if (revision === debugRevision) {
        setDebugEnabled(isPanelStartup ? false : stored === true, {
          persist: false,
        });
        if (isPanelStartup && stored !== false && storage.set) {
          await storage.set({ debugEnabled: false });
        }
      }
    } catch {}
  }

  // Listen for storage changes across contexts
  const onChanged =
    (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) ||
    (typeof browser !== 'undefined' && browser?.storage?.onChanged);

  if (onChanged?.addListener) {
    try {
      onChanged.addListener((changes, areaName) => {
        if (areaName && areaName !== 'local') return;
        if (changes?.debugEnabled) {
          const next = Boolean(changes.debugEnabled.newValue);
          setDebugEnabled(next, { persist: false });
        }
      });
    } catch {}
  }
}

// Auto-initialize if in a browser context
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  initDebugState().catch(() => {});
}

function _resetForTesting() {
  debugEnabled = false;
  debugRevision = 0;
  subscribers.clear();
}

const defaultLogger = createLogger();

module.exports = {
  isDebugEnabled,
  onDebugToggle,
  setDebugEnabled,
  toggleDebug,
  createLogger,
  initDebugState,
  _resetForTesting,
  default: defaultLogger,
  logger: defaultLogger,
};
