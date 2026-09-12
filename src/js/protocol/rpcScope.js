/**
 * rpcScope.js
 *
 * Out-of-scope InnoGames RPC services. Unhandled responses from these classes
 * are hidden from the RPC console log and rpcLog buffer by default so the debug
 * console stays focused on in-domain traffic. `window.foeShowIgnoredRpc(true)`
 * (persisted under `showIgnoredRpc`) brings them back for one-off inspection.
 */

const { createLogger } = require('../utils/logger.js');

const logger = createLogger('RpcScope');

const STORAGE_KEY = 'showIgnoredRpc';

const IGNORED_RPC_CLASSES = new Set([
  'AnnouncementsService',
  'CampaignService',
  'CashShopService',
  'ChallengeService',
  'ClanRecruitmentService',
  'CrmService',
  'ForgePlusPackageService',
  'FriendService',
  'ItemAuctionService',
  'ItemShopService',
  'ItemStoreService',
  'LogService',
  'MessageService',
  'PlayerProfileService',
  'PremiumService',
  'ResearchService',
  'SaleInfoService',
  'SettingsService',
  'TrackingService',
  'TutorialService',
  'VisitAllService',
]);

let showIgnoredRpc = false;
const subscribers = new Set();

function getBrowserStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  if (typeof browser !== 'undefined' && browser?.storage?.local) {
    return browser.storage.local;
  }
  return null;
}

function isIgnoredRpcClass(requestClass) {
  return !!requestClass && IGNORED_RPC_CLASSES.has(requestClass);
}

function isIgnoredRpcLoggingEnabled() {
  return showIgnoredRpc;
}

function shouldLogUnhandledRpc(requestClass) {
  return !isIgnoredRpcClass(requestClass) || showIgnoredRpc;
}

function setIgnoredRpcLoggingEnabled(value, { persist = true } = {}) {
  const next = Boolean(value);
  if (showIgnoredRpc === next) return showIgnoredRpc;
  showIgnoredRpc = next;

  if (persist) {
    const storage = getBrowserStorage();
    if (storage?.set) {
      try {
        const p = storage.set({ [STORAGE_KEY]: next });
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {}
    }
  }

  logger.info(`Ignored RPC logging ${next ? 'enabled' : 'disabled'}`);

  for (const cb of subscribers) {
    try {
      cb(showIgnoredRpc);
    } catch (e) {
      console.warn('[FoE-Info:RpcScope] Subscriber error:', e);
    }
  }

  return showIgnoredRpc;
}

function toggleIgnoredRpcLogging(opts = {}) {
  return setIgnoredRpcLoggingEnabled(!showIgnoredRpc, opts);
}

function onIgnoredRpcToggle(callback) {
  if (typeof callback !== 'function') return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

async function initIgnoredRpcState() {
  const storage = getBrowserStorage();
  if (storage?.get) {
    try {
      const res = await storage.get(STORAGE_KEY);
      if (res && typeof res[STORAGE_KEY] === 'boolean') {
        setIgnoredRpcLoggingEnabled(res[STORAGE_KEY], { persist: false });
      }
    } catch {}
  }

  const onChanged =
    (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) ||
    (typeof browser !== 'undefined' && browser?.storage?.onChanged);

  if (onChanged?.addListener) {
    try {
      onChanged.addListener((changes, areaName) => {
        if (areaName && areaName !== 'local') return;
        if (changes?.[STORAGE_KEY]) {
          setIgnoredRpcLoggingEnabled(Boolean(changes[STORAGE_KEY].newValue), {
            persist: false,
          });
        }
      });
    } catch {}
  }
}

if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  initIgnoredRpcState().catch(() => {});
  if (typeof window !== 'undefined') {
    window.foeShowIgnoredRpc = (value) =>
      value === undefined ?
        toggleIgnoredRpcLogging()
      : setIgnoredRpcLoggingEnabled(value);
  }
}

function _resetForTesting() {
  showIgnoredRpc = false;
  subscribers.clear();
}

module.exports = {
  STORAGE_KEY,
  IGNORED_RPC_CLASSES,
  isIgnoredRpcClass,
  isIgnoredRpcLoggingEnabled,
  shouldLogUnhandledRpc,
  setIgnoredRpcLoggingEnabled,
  toggleIgnoredRpcLogging,
  onIgnoredRpcToggle,
  initIgnoredRpcState,
  _resetForTesting,
};
module.exports.default = module.exports;
