/**
 * renderQuantumPanels.js
 *
 * DevTools UI card templates and event bindings for Quantum Incursions (QI).
 * Renders Member Contributions (with diffs and "show changes only" filtering)
 * and the Championship Guild Leaderboard.
 */

let collapse = null;
let element = null;
let copyUtils = null;
let dateUtils = null;
let i18n = null;
let showOptions = { showQIChanges: false };
let GameOrigin = 'default';

try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  element = require('./AddElement.js');
} catch {}
try {
  copyUtils = require('../utils/copy.js');
} catch {}
try {
  dateUtils = require('../utils/date.js');
} catch {}
try {
  i18n = require('../utils/i18n.js');
} catch {}
try {
  const showOptionsPkg = require('../vars/showOptions.js');
  if (showOptionsPkg?.showOptions) showOptions = showOptionsPkg.showOptions;
} catch {}
try {
  const statePkg = require('../vars/state.js');
  if (statePkg?.GameOrigin) GameOrigin = statePkg.GameOrigin;
} catch {}

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('QuantumPanels');
} catch {}

let worldStorage = null;
try {
  worldStorage = require('../utils/worldStorage.js');
} catch {}

const QI_CONTRIBUTIONS_BOUNDED_HEIGHT = 480;
const QI_LEADERBOARD_BOUNDED_HEIGHT = 260;

function applyContributionsSizing(collapseEl, isChangesOnly) {
  if (!collapseEl || !collapseEl.style) return;
  if (isChangesOnly) {
    collapseEl.style.height = 'auto';
    collapseEl.style.maxHeight = 'none';
    collapseEl.style.overflowY = 'visible';
  } else {
    collapseEl.style.height = `${QI_CONTRIBUTIONS_BOUNDED_HEIGHT}px`;
    collapseEl.style.maxHeight = `${QI_CONTRIBUTIONS_BOUNDED_HEIGHT}px`;
    collapseEl.style.overflowY = 'auto';
  }
}

function applyLeaderboardSizing(collapseEl) {
  if (!collapseEl || !collapseEl.style) return;
  collapseEl.style.height = `${QI_LEADERBOARD_BOUNDED_HEIGHT}px`;
  collapseEl.style.maxHeight = `${QI_LEADERBOARD_BOUNDED_HEIGHT}px`;
  collapseEl.style.overflowY = 'auto';
}

function getWorldLabel() {
  try {
    const currentW =
      typeof worldStorage?.getCurrentWorld === 'function' ?
        worldStorage.getCurrentWorld()
      : null;
    const origin = currentW || GameOrigin;
    const match =
      origin ?
        origin.match(/^https?:\/\/([a-z0-9]+)\.forgeofempires\.com/i)
      : null;
    return match ?
        match[1].toUpperCase()
      : (origin || 'en7')
          .replace(/https?:\/\//i, '')
          .replace(/\.forgeofempires\.com/i, '')
          .toUpperCase();
  } catch {
    return 'EN7';
  }
}

/**
 * Renders the QI Member Contributions card with live diffs and filter controls.
 * @param {Array} members
 * @param {number} [lastSavedTimestamp]
 */
function renderQuantumContributionsCard(members, lastSavedTimestamp) {
  if (typeof document === 'undefined') return;

  const targetEl = document.getElementById('quantumContributions');
  if (!targetEl) return;

  const worldLabel = getWorldLabel();
  const isCollapsed = Boolean(collapse?.collapseQIContributions);
  const isChangesOnly = Boolean(showOptions?.showQIChanges);

  const iconHtml =
    element && typeof element.icon === 'function' ?
      element.icon(
        'qiContributionsIcon',
        'qiContributionsCollapse',
        isCollapsed,
      )
    : `<span class="header-icon collapse-toggle fw-bold font-monospace" id="qiContributionsIcon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="qiContributionsCollapse" data-bs-target="#qiContributionsCollapse" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;

  const closeBtn =
    element && typeof element.close === 'function' ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';

  const copyBtn =
    element && typeof element.copy === 'function' ?
      element.copy('qiContributionsCopyID', 'info', 'right', isCollapsed)
    : `<span id="qiContributionsCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" style="display: ${isCollapsed ? 'none' : 'block'}" data-i18n="copy">Copy</span>`;

  const timeFormatted =
    lastSavedTimestamp && dateUtils?.formatDateTime ?
      dateUtils.formatDateTime(lastSavedTimestamp)
    : '';

  let cardHTML = `<div id="quantumContributionsCard" class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">
    ${closeBtn}
    <p id="qiContributionsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#qiContributionsCollapse" aria-expanded="${!isCollapsed}" aria-controls="qiContributionsCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
      <strong><span data-i18n="qi_contributions">QI Contributions</span>: [${worldLabel}]</strong>
    </p>
    ${copyBtn}
    <div id="qiContributionsCollapse" class="alert-info overflow resize collapse ${isCollapsed ? '' : 'show'}">
      <div class="mt-2 mb-1 px-1 d-flex flex-row justify-content-between align-items-center">
        <div class="form-check form-check-inline mb-0">
          <input class="form-check-input" type="checkbox" id="showQIchanges" ${isChangesOnly ? 'checked' : ''}>
          <label class="form-check-label small" for="showQIchanges" data-i18n="show_changes_only">show changes only</label>
        </div>
        ${timeFormatted ? `<span class="small text-muted">Last Saved: ${timeFormatted}</span>` : ''}
      </div>
      <div id="qiContributionsTableWrapper" class="mt-1">
        <table id="qiContributionsTable" class="goods-table w-100">
          <caption class="visually-hidden"><span data-i18n="qi_contributions">QI Contributions</span></caption>
          <thead>
            <tr>
              <th scope="col" class="text-start" data-i18n="member">Member</th>
              <th scope="col" class="text-end" data-i18n="progress">Progress</th>
              <th scope="col" class="text-end" data-i18n="ap_spent">AP Spent</th>
            </tr>
          </thead>
          <tbody>`;

  let renderedCount = 0;
  if (Array.isArray(members)) {
    for (const m of members) {
      const hasChanges =
        (m.progressDiff && m.progressDiff > 0) ||
        (m.actionPointsDiff && m.actionPointsDiff > 0);
      if (isChangesOnly && !hasChanges) continue;

      renderedCount++;
      const progressFormatted = Number(
        m.progressContribution || 0,
      ).toLocaleString();
      const apFormatted = Number(m.actionPoints || 0).toLocaleString();

      cardHTML += `<tr>
        <td class="text-start">${m.name}</td>
        <td class="text-end">${progressFormatted}${
          m.progressDiff ?
            ` <span class="badge bg-danger ms-1">+${m.progressDiff.toLocaleString()}</span>`
          : ''
        }</td>
        <td class="text-end">${apFormatted}${
          m.actionPointsDiff ?
            ` <span class="badge bg-danger ms-1">+${m.actionPointsDiff.toLocaleString()}</span>`
          : ''
        }</td>
      </tr>`;
    }
  }

  if (isChangesOnly && renderedCount === 0) {
    cardHTML += `<tr><td colspan="3" class="text-center text-muted fst-italic py-2" data-i18n="no_active_changes">No active changes since last save</td></tr>`;
  }

  cardHTML += `</tbody></table></div></div></div>`;
  targetEl.innerHTML = cardHTML;

  const contributionsCollapseEl = document.getElementById(
    'qiContributionsCollapse',
  );
  if (contributionsCollapseEl) {
    applyContributionsSizing(contributionsCollapseEl, isChangesOnly);
    contributionsCollapseEl.addEventListener('shown.bs.collapse', () =>
      applyContributionsSizing(contributionsCollapseEl, isChangesOnly),
    );
  }

  // Bind Checkbox
  const checkboxEl = document.getElementById('showQIchanges');
  if (checkboxEl) {
    checkboxEl.addEventListener('change', () => {
      if (showOptions) {
        showOptions.showQIChanges = checkboxEl.checked;
        try {
          const storage = require('../utils/storage.js');
          if (typeof storage.set === 'function') {
            storage.set('showOptions', showOptions);
          }
        } catch {}
      }
      renderQuantumContributionsCard(members, lastSavedTimestamp);
    });
  }

  // Bind Collapse
  const labelEl = document.getElementById('qiContributionsTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (e.target?.closest?.('#qiContributionsIcon')) return;
      if (typeof collapse?.fCollapseQIContributions === 'function') {
        collapse.fCollapseQIContributions();
      }
    });
  }

  const iconEl = document.getElementById('qiContributionsIcon');
  if (iconEl && typeof collapse?.fCollapseQIContributions === 'function') {
    iconEl.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      collapse.fCollapseQIContributions();
    });
  }

  // Bind Copy
  const copyEl = document.getElementById('qiContributionsCopyID');
  if (copyEl) {
    copyEl.addEventListener('click', () => {
      if (typeof copyUtils?.copyToClipboard === 'function') {
        copyUtils.copyToClipboard('#qiContributionsTable');
      }
    });
  }

  if (i18n && typeof i18n.translateContainer === 'function') {
    i18n.translateContainer(targetEl);
  }

  logger?.debug('Rendered QI member contributions card', {
    total: members?.length || 0,
    rendered: renderedCount,
    changesOnly: isChangesOnly,
  });
}

/**
 * Renders the QI Championship Leaderboard card matching the GBG Leaderboard layout.
 * @param {Array} rankings
 */
function renderQuantumLeaderboardCard(rankings) {
  if (typeof document === 'undefined') return;

  const targetEl = document.getElementById('quantumLeaderboard');
  if (!targetEl) return;

  const isCollapsed = Boolean(collapse?.collapseQILeaderboard);

  const iconHtml =
    element && typeof element.icon === 'function' ?
      element.icon('qiLeaderboardIcon', 'qiLeaderboardCollapse', isCollapsed)
    : `<span class="header-icon collapse-toggle fw-bold font-monospace" id="qiLeaderboardIcon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="qiLeaderboardCollapse" data-bs-target="#qiLeaderboardCollapse" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;

  const closeBtn =
    element && typeof element.close === 'function' ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';

  const copyBtn =
    element && typeof element.copy === 'function' ?
      element.copy('qiLeaderboardCopyID', 'info', 'right', isCollapsed)
    : `<span id="qiLeaderboardCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" style="display: ${isCollapsed ? 'none' : 'block'}" data-i18n="copy">Copy</span>`;

  let cardHTML = `<div id="quantumLeaderboardCard" class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">
    ${closeBtn}
    <p id="qiLeaderboardTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#qiLeaderboardCollapse" aria-expanded="${!isCollapsed}" aria-controls="qiLeaderboardCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
      <strong><span data-i18n="qi_leaderboard">QI Leaderboard</span>:</strong>
    </p>
    ${copyBtn}
    <div id="qiLeaderboardCollapse" class="alert-info overflow resize collapse ${isCollapsed ? '' : 'show'}">
      <div id="qiLeaderboardTableWrapper" class="mt-1">
        <table id="qiLeaderboardTable" class="goods-table w-100">
          <caption class="visually-hidden"><span data-i18n="qi_leaderboard">QI Leaderboard</span></caption>
          <thead>
            <tr>
              <th scope="col" class="text-start" data-i18n="guild">Guild</th>
              <th scope="col" class="text-center" data-i18n="rank">Rank</th>
              <th scope="col" class="text-end" data-i18n="total_points">Total Points</th>
            </tr>
          </thead>
          <tbody>`;

  if (Array.isArray(rankings)) {
    for (const r of rankings) {
      const pointsFormatted = Number(r.points || 0).toLocaleString();
      cardHTML += `<tr>
        <td class="text-start">${r.clanName}</td>
        <td class="text-center">${r.rank}</td>
        <td class="text-end">${pointsFormatted}</td>
      </tr>`;
    }
  }

  cardHTML += `</tbody></table></div></div></div>`;
  targetEl.innerHTML = cardHTML;

  const leaderboardCollapseEl = document.getElementById(
    'qiLeaderboardCollapse',
  );
  if (leaderboardCollapseEl) {
    applyLeaderboardSizing(leaderboardCollapseEl);
    leaderboardCollapseEl.addEventListener('shown.bs.collapse', () =>
      applyLeaderboardSizing(leaderboardCollapseEl),
    );
  }

  // Bind Collapse
  const labelEl = document.getElementById('qiLeaderboardTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (e.target?.closest?.('#qiLeaderboardIcon')) return;
      if (typeof collapse?.fCollapseQILeaderboard === 'function') {
        collapse.fCollapseQILeaderboard();
      }
    });
  }

  const iconEl = document.getElementById('qiLeaderboardIcon');
  if (iconEl && typeof collapse?.fCollapseQILeaderboard === 'function') {
    iconEl.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      collapse.fCollapseQILeaderboard();
    });
  }

  // Bind Copy
  const copyEl = document.getElementById('qiLeaderboardCopyID');
  if (copyEl) {
    copyEl.addEventListener('click', () => {
      if (typeof copyUtils?.copyToClipboard === 'function') {
        copyUtils.copyToClipboard('#qiLeaderboardTable');
      }
    });
  }

  if (i18n && typeof i18n.translateContainer === 'function') {
    i18n.translateContainer(targetEl);
  }

  logger?.debug('Rendered QI leaderboard card', {
    count: rankings?.length || 0,
  });
}

module.exports = {
  renderQuantumContributionsCard,
  renderQuantumLeaderboardCard,
};
module.exports.default = module.exports;
