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

  if (cached) {
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

  if (!pendingScoreDBFetches.has(key)) {
    pendingScoreDBFetches.add(key);
    const origin = getScoreDBOrigin();
    if (typeof fetch === 'function') {
      fetch(`https://foe.scoredb.io/${origin}/Player/${id}`)
        .then((res) => {
          if (!res.ok) {
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
              updatePlayerNameCache(id, fetchedName);
            }
          } else {
            updatePlayerNameCache(id, null, { notFound: true });
          }
          updateIgnoreListUI();
        })
        .catch(() => {
          updatePlayerNameCache(id, null, { notFound: true });
          updateIgnoreListUI();
        });
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
    html += `<strong>Ignored By:</strong><br>${ignoredByHtml}`;
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
    html += `<strong>Ignoring:</strong><br>${ignoringHtml}`;
  }

  if (ignoredByCount === 0 && ignoringCount === 0) {
    html += `<em>None</em>`;
  }
  html += `</p>`;
  return html;
}

function updateIgnoreListUI(msg) {
  const data = msg?.responseData || msg;
  if (
    data &&
    (data.ignoredByPlayerIds ||
      data.ignoredPlayerIds ||
      data.ignored_by_player_ids ||
      data.ignored_player_ids)
  ) {
    setIgnoredPlayers(
      data.ignoredByPlayerIds || data.ignored_by_player_ids || {},
      data.ignoredPlayerIds || data.ignored_player_ids || {},
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
    pendingScoreDBFetches,
    setGameOrigin,
    setIgnoredPlayers,
    updatePlayerNameCache,
    playerNameCache,
  },
};
