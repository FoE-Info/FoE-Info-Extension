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

// Webpack DefinePlugin inlines DEBUG_BUILD: prod=false, beta/dev=true.
// Falls back to true in Node/test environments where the global is absent so
// tests can exercise debug logging via setDebugEnabled(true).
const DEBUG_BUILD_ENABLED =
  typeof DEBUG_BUILD === 'undefined' ? true : DEBUG_BUILD;
// Only auto-enable debug in real debug builds (webpack-defined), never in
// Node/test runs where a mock window may trigger initDebugState.
const DEBUG_DEFAULT_ON =
  typeof DEBUG_BUILD !== 'undefined' && DEBUG_BUILD === true;

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
      if (!DEBUG_BUILD_ENABLED || !debugEnabled) return;
      console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (!DEBUG_BUILD_ENABLED || !debugEnabled) return;
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
  if (storage?.get) {
    try {
      const res = await storage.get('debugEnabled');
      const stored =
        res && typeof res.debugEnabled === 'boolean' ?
          res.debugEnabled
        : undefined;
      // Persisted user choice wins; otherwise default on for beta/dev only.
      const initial = stored !== undefined ? stored : DEBUG_DEFAULT_ON;
      setDebugEnabled(initial, { persist: false });
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
