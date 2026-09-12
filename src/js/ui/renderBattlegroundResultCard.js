/**
 * renderBattlegroundResultCard.js
 *
 * Guild Battleground result card presenter, extracted from
 * GuildBattlegroundService.getState for modular UI rendering and testing.
 *
 * The builder is side-effect free (returns markup). The render entry point
 * writes into a supplied target element and wires the copy/collapse
 * listeners. Shared array state is never mutated here; the service pushes
 * rows via the injected `onRow` callback.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GbgResultCard');
} catch {
  logger = { debug() {}, info() {}, warn() {}, error() {} };
}

let element = {};
let helper = {};
let collapse = {};
let copy = {};
let post_webstore = {};

try {
  element = require('./AddElement.js');
} catch {}
try {
  helper = require('../fn/helper.js');
} catch {}
try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  copy = require('../fn/copy.js');
} catch {}
try {
  post_webstore = require('../fn/post.js');
} catch {}

function defaultEscape(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Normalizes raw player leaderboard entries into render rows, preserving the
 * legacy field names read by getState (negotiationsWon/battlesWon/attrition).
 */
function normalizeBattlegroundResultRows(responseData = {}) {
  const entries =
    Array.isArray(responseData?.playerLeaderboardEntries) ?
      responseData.playerLeaderboardEntries
    : [];
  return entries.map((entry) => ({
    rank: entry?.rank,
    name: entry?.player?.name,
    negotiations: entry?.negotiationsWon || 0,
    fights: entry?.battlesWon || 0,
    attrition: entry?.attrition || 0,
  }));
}

function buildBattlegroundResultCardHTML(responseData = {}, options = {}) {
  const {
    helper: depHelper = helper,
    element: depElement = element,
    collapseState = false,
  } = options;

  const isCollapsed = Boolean(collapseState);
  const rows = normalizeBattlegroundResultRows(responseData);
  const escape =
    typeof depHelper?.escapeHTML === 'function' ?
      depHelper.escapeHTML
    : defaultEscape;

  const closeBtn =
    typeof depElement?.close === 'function' ? depElement.close() : '';
  const iconMarkup =
    typeof depElement?.icon === 'function' ?
      depElement.icon(
        'battlegroundicon',
        'battlegroundTextCollapse',
        isCollapsed,
      )
    : '';
  const copyBtn =
    typeof depElement?.copy === 'function' ?
      depElement.copy('battlegroundCopyID', 'info', 'right', isCollapsed)
    : '';

  let totalFights = 0;
  let totalNegs = 0;
  let rowsHTML = '';
  for (const row of rows) {
    totalFights += row.fights;
    totalNegs += row.negotiations;
    const safePlayerName = escape(row.name);
    rowsHTML += `<tr><td class="text-center">${row.rank}</td><td class="text-start">${safePlayerName}</td><td class="text-center">${row.negotiations}</td><td class="text-center">${row.fights}</td><td class="text-center">${row.attrition}</td></tr>`;
  }

  return (
    `<div id="battlegroundResultCard" class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">
        ${closeBtn}
        <p id="battlegroundResultTextLabel" class="cursor-pointer" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#battlegroundTextCollapse" aria-expanded="${!isCollapsed}" aria-controls="battlegroundTextCollapse" style="cursor: pointer; user-select: none;">
      ${iconMarkup}
        <strong>Battleground Result:</strong></p>` +
    copyBtn +
    `<div id="battlegroundTextCollapse" class="table-responsive resize-both collapse ${
      isCollapsed ? '' : 'show'
    }"><div class="overflow-y" id="battlegroundText"><table id="gbg-table" class="gbg-table w-100"><caption class="visually-hidden"><span data-i18n="member_activity">Member Activity</span></caption><thead><tr><th scope="col" class="text-center"><span data-i18n="rank">Rank</span></th><th scope="col" class="text-start"><span data-i18n="member">Member</span></th><th scope="col" class="text-center"><span data-i18n="neg">Negs</span></th><th scope="col" class="text-center"><span data-i18n="fights">Fights</span></th><th scope="col" class="text-center"><span data-i18n="attrition">Attrition</span></th></tr></thead><tbody>` +
    rowsHTML +
    `</tbody><tfoot><tr><th scope="col"></th><th scope="col" class="text-start"><span data-i18n="guild_total">Guild Total</span></th><th scope="col" class="text-center">${totalNegs}</th><th scope="col" class="text-center">${totalFights}</th><th scope="col"></th></tr></tfoot></table></div></div></div>`
  );
}

function renderBattlegroundResultCard(responseData = {}, options = {}) {
  const {
    targetEl,
    helper: depHelper = helper,
    element: depElement = element,
    collapse: depCollapse = collapse,
    copy: depCopy = copy,
    post_webstore: depPost = post_webstore,
    url = {},
    onRow,
    onTotals,
    attachListeners = true,
  } = options;

  const collapseState = Boolean(
    options.collapseState ?? depCollapse?.collapseBattleground,
  );

  const html = buildBattlegroundResultCardHTML(responseData, {
    helper: depHelper,
    element: depElement,
    collapseState,
  });

  if (targetEl) targetEl.innerHTML = html;

  const rows = normalizeBattlegroundResultRows(responseData);
  if (typeof onRow === 'function') {
    for (const row of rows) onRow(row);
  }
  if (typeof onTotals === 'function') {
    let fights = 0;
    let negotiations = 0;
    for (const row of rows) {
      fights += row.fights;
      negotiations += row.negotiations;
    }
    onTotals({ fights, negotiations });
  }

  if (attachListeners && typeof document !== 'undefined') {
    const postEl = document.getElementById('battlegroundPostID');
    const copyEl = document.getElementById('battlegroundCopyID');
    if (
      postEl &&
      url?.sheetGuildURL &&
      typeof depPost?.postGBGtoSS === 'function'
    ) {
      postEl.addEventListener('click', depPost.postGBGtoSS);
    } else if (copyEl && typeof depCopy?.BattlegroundCopy === 'function') {
      copyEl.addEventListener('click', depCopy.BattlegroundCopy);
    }

    const labelEl = document.getElementById('battlegroundResultTextLabel');
    if (labelEl && typeof depCollapse?.fCollapseBattleground === 'function') {
      labelEl.addEventListener('click', (e) => {
        if (
          e?.target &&
          typeof e.target.closest === 'function' &&
          e.target.closest('#battlegroundicon')
        ) {
          return;
        }
        depCollapse.fCollapseBattleground();
      });
    }

    const iconEl = document.getElementById('battlegroundicon');
    if (
      iconEl &&
      iconEl !== labelEl &&
      typeof depCollapse?.fCollapseBattleground === 'function'
    ) {
      iconEl.addEventListener('click', () => {
        depCollapse.fCollapseBattleground();
      });
    }
  }

  logger.debug('Rendered battleground result card', {
    entries: rows.length,
    collapseState,
  });

  return html;
}

module.exports = {
  renderBattlegroundResultCard,
  buildBattlegroundResultCardHTML,
  normalizeBattlegroundResultRows,
};
module.exports.default = module.exports;
