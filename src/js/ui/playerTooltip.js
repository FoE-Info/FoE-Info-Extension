/**
 * playerTooltip.js
 *
 * Player tooltip formatting and ignore list popover UI management.
 * Decoupled from StartupService monolith.
 * Dual CJS/ESM compatible.
 */

let extractPlayerIds = null;
try {
  ({ extractPlayerIds } = require('../fn/renderCityStats.js'));
} catch {
  extractPlayerIds = (obj) =>
    obj ? Object.values(obj).filter((x) => typeof x === 'number') : [];
}

let Popover = null;
try {
  ({ Popover } = require('bootstrap'));
} catch {}

let GameOrigin = 'en7';
let ignoredPlayers = {};
let playerNameCache = {};

function setGameOrigin(origin) {
  GameOrigin = origin || 'en7';
}

let setIgnoredPlayers = function (by, ing) {
  ignoredPlayers = {
    ignoredByPlayerIds: by || {},
    ignoredPlayerIds: ing || {},
  };
};

let updatePlayerNameCache = function (id, name, opts) {
  const key = String(id);
  playerNameCache[key] = {
    currentName: name,
    notFound: Boolean(opts?.notFound),
    previousNames: opts?.previousNames || [],
    // Must match state/state.js:329-341, which already stamps `lastUpdated`.
    // A negative entry without one reads as stale and is refetched.
    lastUpdated: Date.now(),
  };
};

try {
  const state = require('../vars/state.js');
  if (state.GameOrigin) GameOrigin = state.GameOrigin;
  if (state.ignoredPlayers) ignoredPlayers = state.ignoredPlayers;
  if (state.playerNameCache) playerNameCache = state.playerNameCache;
  if (state.setIgnoredPlayers) setIgnoredPlayers = state.setIgnoredPlayers;
  if (state.updatePlayerNameCache)
    updatePlayerNameCache = state.updatePlayerNameCache;
} catch {}

const pendingScoreDBFetches = new Set();

// A "this player does not exist" answer is worth keeping; a failed request is
// not. The old code persisted `notFound` from the network-error path and from
// every non-OK status, so one offline moment or one 503 made the tooltip
// suppress that player forever — and because the pending key was never
// released, nothing ever retried it. Three separate corrections:
const NEGATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSIENT_RETRY_MS = 60 * 1000;
/** @type {Map<string, number>} key -> earliest retry time after a transient failure */
const scoreDBRetryAfter = new Map();

function isStaleNegative(cached, now) {
  if (!cached?.notFound) return false;
  // No timestamp means a record written before this rule existed. Expiring it
  // is the safe reading: the cost of one extra lookup is a request, the cost of
  // trusting it is a permanently missing player.
  if (typeof cached.lastUpdated !== 'number') return true;
  return now - cached.lastUpdated >= NEGATIVE_CACHE_TTL_MS;
}

function isTransientStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Defer the next lookup for `key`. Nothing is written to the name cache, so the
 * player renders as `#id` and a later render tries again once the backoff has
 * elapsed.
 */
function scheduleRetry(key, status) {
  // A 429 means back off harder than a plain network failure.
  const delay = status === 429 ? TRANSIENT_RETRY_MS * 5 : TRANSIENT_RETRY_MS;
  scoreDBRetryAfter.set(key, Date.now() + delay);
}

function getScoreDBOrigin(customOrigin) {
  const origin =
    customOrigin ||
    (typeof require !== 'undefined' ?
      (() => {
        try {
          return require('../vars/state.js').GameOrigin;
        } catch {
          return GameOrigin;
        }
      })()
    : GameOrigin);

  if (!origin || !origin.trim()) return 'en7';
  const match = origin.match(/https?:\/\/([a-z0-9]+)\.forgeofempires\.com/i);
  if (match) return match[1].toLowerCase();
  return origin.trim().toLowerCase();
}

function formatPlayerLabel(id) {
  const key = String(id);
  const cache =
    (typeof require !== 'undefined' ?
      (() => {
        try {
          return require('../vars/state.js').playerNameCache;
        } catch {
          return playerNameCache;
        }
      })()
    : playerNameCache) || {};

  const cached = cache[key];
  const now = Date.now();

  if (cached && !isStaleNegative(cached, now)) {
    if (cached.notFound) {
      return null;
    }
    if (cached.currentName) {
      if (cached.previousNames && cached.previousNames.length > 0) {
        const prev = cached.previousNames[cached.previousNames.length - 1];
        return `${cached.currentName} <small class="text-muted">(formerly ${prev})</small>`;
      }
      return cached.currentName;
    }
  }

  if ((scoreDBRetryAfter.get(key) ?? 0) > now) {
    return `#${id}`;
  }

  if (!pendingScoreDBFetches.has(key)) {
    pendingScoreDBFetches.add(key);
    const origin = getScoreDBOrigin();
    if (typeof fetch === 'function') {
      // scoredb player-name lookup is best-effort enrichment, not required for
      // rendering the tooltip; keep it off the critical fetch queue.
      fetch(`https://foe.scoredb.io/${origin}/Player/${id}`, {
        priority: 'low',
      })
        .then((res) => {
          if (!res.ok) {
            if (isTransientStatus(res.status)) {
              // Rate limited or the service is down: the player may well exist.
              scheduleRetry(key, res.status);
              return null;
            }
            updatePlayerNameCache(id, null, { notFound: true });
            updateIgnoreListUI();
            return null;
          }
          return res.text();
        })
        .then((html) => {
          if (!html) return;
          const match = html.match(/<title>([^<-]+)\s*-\s*[^<]+<\/title>/i);
          if (match && match[1]) {
            const fetchedName = match[1].trim();
            if (
              fetchedName.toLowerCase() === 'error' ||
              fetchedName.toLowerCase() === 'not found'
            ) {
              updatePlayerNameCache(id, null, { notFound: true });
            } else {
              scoreDBRetryAfter.delete(key);
              updatePlayerNameCache(id, fetchedName);
            }
          } else {
            updatePlayerNameCache(id, null, { notFound: true });
          }
          updateIgnoreListUI();
        })
        .catch(() => {
          // Offline, DNS failure, abort: never a verdict about the player.
          scheduleRetry(key, 0);
        })
        .finally(() => {
          pendingScoreDBFetches.delete(key);
        });
    } else {
      pendingScoreDBFetches.delete(key);
    }
  }

  return `#${id}`;
}

function getUserTooltipHTML() {
  let html = `<p class="pop">`;
  const origin = getScoreDBOrigin();

  const currentIgnored =
    (typeof require !== 'undefined' ?
      (() => {
        try {
          return require('../vars/state.js').ignoredPlayers;
        } catch {
          return ignoredPlayers;
        }
      })()
    : ignoredPlayers) || {};

  const extractor =
    extractPlayerIds ||
    ((obj) =>
      obj ? Object.values(obj).filter((x) => typeof x === 'number') : []);

  const ignoredByList = extractor(currentIgnored?.ignoredByPlayerIds);
  let ignoredByHtml = '';
  let ignoredByCount = 0;
  ignoredByList.forEach((elem) => {
    const label = formatPlayerLabel(elem);
    if (label) {
      ignoredByCount++;
      ignoredByHtml += `<a href="https://foe.scoredb.io/${origin}/Player/${elem}" target="_blank"><strong>${label}</strong></a><br>`;
    }
  });
  if (ignoredByCount > 0) {
    html += `<strong><span data-i18n="ignored_by">Ignored By:</span></strong><br>${ignoredByHtml}`;
  }

  const ignoringList = extractor(currentIgnored?.ignoredPlayerIds);
  let ignoringHtml = '';
  let ignoringCount = 0;
  ignoringList.forEach((elem) => {
    const label = formatPlayerLabel(elem);
    if (label) {
      ignoringCount++;
      ignoringHtml += `<a href="https://foe.scoredb.io/${origin}/Player/${elem}" target="_blank"><strong>${label}</strong></a><br>`;
    }
  });
  if (ignoringCount > 0) {
    html += `<strong><span data-i18n="ignoring">Ignoring:</span></strong><br>${ignoringHtml}`;
  }

  if (ignoredByCount === 0 && ignoringCount === 0) {
    html += `<em><span data-i18n="none">None</span></em>`;
  }
  html += `</p>`;
  return html;
}

/**
 * Normalizes ignore list payload into a standardized DTO.
 * @param {Object} [data]
 * @returns {{ ignoredByPlayerIds: Object, ignoredPlayerIds: Object } | null}
 */
function normalizeIgnoreListData(data) {
  if (!data || typeof data !== 'object') return null;
  const payload =
    data.responseData && typeof data.responseData === 'object' ?
      data.responseData
    : data;
  const ignoredBy =
    payload.ignoredByPlayerIds || payload.ignored_by_player_ids || null;
  const ignored =
    payload.ignoredPlayerIds || payload.ignored_player_ids || null;
  if (!ignoredBy && !ignored) return null;
  return {
    ignoredByPlayerIds: ignoredBy || {},
    ignoredPlayerIds: ignored || {},
  };
}

function updateIgnoreListUI(data) {
  const normalized = normalizeIgnoreListData(data);
  if (normalized) {
    setIgnoredPlayers(
      normalized.ignoredByPlayerIds,
      normalized.ignoredPlayerIds,
    );
  }
  if (typeof document === 'undefined') return;
  const userElem = document.getElementById('user');
  if (!userElem) return;
  const newHTML = getUserTooltipHTML();
  const escapedHTML = newHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  userElem.setAttribute('data-bs-content', escapedHTML);

  try {
    const bs =
      (typeof window !== 'undefined' && window.bootstrap) ||
      (typeof global !== 'undefined' && global.bootstrap) ||
      null;
    const popoverClass = bs?.Popover || Popover;
    if (popoverClass && typeof popoverClass.getInstance === 'function') {
      const popover = popoverClass.getInstance(userElem);
      if (popover && typeof popover.setContent === 'function') {
        const titleStr =
          userElem.getAttribute('data-bs-title') ||
          userElem.getAttribute('title') ||
          '';
        popover.setContent({
          '.popover-header': titleStr,
          '.popover-body': newHTML,
        });
      }
    }
  } catch (e) {
    console.warn('Popover update error:', e);
  }
}

module.exports = {
  getScoreDBOrigin,
  formatPlayerLabel,
  getUserTooltipHTML,
  updateIgnoreListUI,
  normalizeIgnoreListData,
  scoreDBRetryAfter,
  NEGATIVE_CACHE_TTL_MS,
  TRANSIENT_RETRY_MS,
  pendingScoreDBFetches,
  setGameOrigin,
  setIgnoredPlayers,
  updatePlayerNameCache,
  playerNameCache,
  default: {
    getScoreDBOrigin,
    formatPlayerLabel,
    getUserTooltipHTML,
    updateIgnoreListUI,
    normalizeIgnoreListData,
    pendingScoreDBFetches,
    setGameOrigin,
    setIgnoredPlayers,
    updatePlayerNameCache,
    playerNameCache,
  },
};
