/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import { setBattlegroundSize, toolOptions } from '../fn/globals.js';
import { translateContainer } from '../fn/i18n.js';
import * as post_webstore from '../fn/post.js';
import * as storage from '../fn/storage.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import {
  battlegroundDIV,
  BattlegroundPerformance,
  BGtime,
  donationDIV,
  GameOrigin,
  gbgLeaderboardDIV,
  GuildMembers,
  output,
  url,
} from '../vars/state.js';
import * as element from './AddElement.js';
import { buildLeaderboardHTML, copyToClipboard } from './gbgProvinceView.js';

const logger = createLogger('BattlegroundsPanel');

var heightGBG = toolOptions.battlegroundsSize;
let gbgResizeObserver = null;

function setHeight() {
  if (!showOptions.showBattlegroundChanges && heightGBG) {
    setBattlegroundSize(heightGBG);
  }
}

export function fshowBattlegroundChanges() {
  showOptions.showBattlegroundChanges = !showOptions.showBattlegroundChanges;
  storage.set('showOptions', showOptions);
  logger.debug('Toggled battlegrounds changes view', {
    changesOnly: showOptions.showBattlegroundChanges,
  });
  fshowBattleground();
}

export function fshowBattleground() {
  // console.debug(data,BattlegroundPerformance);
  const bgWorldMatch =
    GameOrigin ?
      GameOrigin.match(/^https?:\/\/([a-z0-9]+)\.forgeofempires\.com/i)
    : null;
  const bgWorldLabel =
    bgWorldMatch ?
      bgWorldMatch[1].toUpperCase()
    : (GameOrigin || 'en7')
        .replace(/https?:\/\//i, '')
        .replace(/\.forgeofempires\.com/i, '')
        .toUpperCase();
  var battlegroundHTML = `<div class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">
	<p id="battlegroundTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#battlegroundCollapse" aria-expanded="${!collapse.collapseBattleground}" aria-controls="battlegroundCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
	${element.icon('battlegroundicon', 'battlegroundCollapse', collapse.collapseBattleground)}
	<strong>Battlegrounds: [${bgWorldLabel}]</strong></p>${element.close()}`;

  if (url.sheetGuildURL)
    battlegroundHTML += element.post(
      'battlegroundPostID',
      'info',
      'mid',
      collapse.collapseBattleground,
    );
  battlegroundHTML += element.copy(
    'battlegroundCopyID',
    'info',
    'right',
    collapse.collapseBattleground,
  );
  const isChangesOnly = Boolean(showOptions.showBattlegroundChanges);
  battlegroundHTML += `<div id="battlegroundCollapse" class="alert-info ${
    isChangesOnly ? 'gbg-changes-full' : 'gbg-full-roster'
  } overflow resize collapse ${
    collapse.collapseBattleground ? '' : 'show'
  }"><div id="battlegroundText">`;

  battlegroundHTML += `<p class="showGBGchanges"><input type="checkbox" id="showGBGchanges"><label for="showGBGchanges" data-i18n="show_changes_only">show changes only</label></p>
	${BGtime ? '<p><span data-i18n="last_saved">Last Saved</span>: ' + BGtime + '</p>' : ''}
	<div><table id="gbg-table" class="gbg-table w-100"><caption class="visually-hidden"><span data-i18n="member_activity">Member Activity</span></caption><thead><tr><th scope="col" class="text-start"><span data-i18n="member">Member</span></th><th scope="col" class="text-center"><span data-i18n="neg">Negs</span></th><th scope="col" class="text-center"><span data-i18n="fights">Fights</span></th><th scope="col" class="text-center"><span data-i18n="attrition">Attrition</span></th></tr></thead><tbody>`;
  let renderedRows = 0;
  BattlegroundPerformance.forEach((entry) => {
    // console.debug(entry);
    var wonNegotiations = 0;
    var wonBattles = 0;
    var battleDiff = 0;
    var negotiationsDiff = 0;
    var attrition = 0;
    var attritionDiff = 0;
    if (entry.wonNegotiations) wonNegotiations = entry.wonNegotiations;
    if (entry.wonBattles) wonBattles = entry.wonBattles;
    if (entry.attrition) attrition = entry.attrition;

    var player = GuildMembers.find((id) => id.name == entry.name);
    if (player) {
      battleDiff = wonBattles - player.wonBattles;
      negotiationsDiff = wonNegotiations - player.wonNegotiations;
      attritionDiff = attrition - player.attrition;
    }
    if (
      !showOptions.showBattlegroundChanges ||
      battleDiff ||
      negotiationsDiff ||
      attritionDiff
    ) {
      renderedRows++;
      battlegroundHTML += `<tr><td class="text-start">${entry.name}</td><td class="text-center">${wonNegotiations}`;
      if (negotiationsDiff)
        battlegroundHTML += ` <span class="red">+${negotiationsDiff}</span>`;
      battlegroundHTML += `</td><td class="text-center">${wonBattles}`;
      if (battleDiff)
        battlegroundHTML += ` <span class="red">+${battleDiff}</span>`;
      battlegroundHTML += `</td><td class="text-center">${attrition}`;
      if (attritionDiff)
        battlegroundHTML += ` <span class="red">+${attritionDiff}</span>`;
      battlegroundHTML += `</td></tr>`;
    }
  });

  if (isChangesOnly && renderedRows === 0) {
    battlegroundHTML += `<tr><td colspan="4" class="text-center text-muted fst-italic py-2">No active changes since last save</td></tr>`;
  }

  logger.debug('Rendered battlegrounds changes panel', {
    world: bgWorldLabel,
    changesOnly: isChangesOnly,
    entries: BattlegroundPerformance.length,
    renderedRows,
  });

  const targetEl =
    (typeof document !== 'undefined' &&
      document.getElementById('battleground')) ||
    battlegroundDIV ||
    donationDIV;
  if (targetEl) {
    targetEl.innerHTML =
      battlegroundHTML + `</tbody></table></div></div></div></div>`;
  }

  const postEl = document.getElementById('battlegroundPostID');
  if (postEl && url.sheetGuildURL) {
    postEl.addEventListener('click', post_webstore.postGBGtoSS);
  }

  const copyEl = document.getElementById('battlegroundCopyID');
  if (copyEl) {
    copyEl.addEventListener('click', copy.BattlegroundCopy);
  }

  const iconEl = document.getElementById('battlegroundicon');
  if (iconEl) {
    iconEl.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      collapse.fCollapseBattleground();
    });
  }

  const labelEl = document.getElementById('battlegroundTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (e.target?.closest?.('#battlegroundicon')) return;
      collapse.fCollapseBattleground();
    });
  }

  const showChangesEl = document.getElementById('showGBGchanges');
  if (showChangesEl) {
    showChangesEl.addEventListener('click', fshowBattlegroundChanges);
    showChangesEl.checked = showOptions.showBattlegroundChanges;
  }

  const battlegroundDiv = document.getElementById('battlegroundCollapse');
  if (battlegroundDiv) {
    battlegroundDiv.addEventListener('mouseup', setHeight);
    if (gbgResizeObserver) {
      gbgResizeObserver.disconnect();
    }
    if (typeof ResizeObserver !== 'undefined') {
      gbgResizeObserver = new ResizeObserver((entries) => {
        if (
          battlegroundDiv.classList?.contains('collapsing') ||
          (battlegroundDiv.classList &&
            !battlegroundDiv.classList.contains('show'))
        ) {
          return;
        }
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            heightGBG = entry.contentRect.height;
        }
      });
      gbgResizeObserver.observe(battlegroundDiv);
    }
    if (isChangesOnly) {
      battlegroundDiv.style.height = 'auto';
      battlegroundDiv.style.maxHeight = 'none';
      battlegroundDiv.style.overflowY = 'visible';
    } else {
      const DEFAULT_RESTRICTED_GBG_HEIGHT = 480;
      const restrictedHeight =
        toolOptions.battlegroundsSize && toolOptions.battlegroundsSize > 250 ?
          toolOptions.battlegroundsSize
        : DEFAULT_RESTRICTED_GBG_HEIGHT;
      battlegroundDiv.style.maxHeight = 'none';
      battlegroundDiv.style.overflowY = 'auto';
      const currentHeight = battlegroundDiv.clientHeight;
      if (currentHeight > restrictedHeight) {
        battlegroundDiv.style.height = `${restrictedHeight}px`;
      }
    }
  }

  if (targetEl) {
    translateContainer(targetEl);
  }
}

export function renderGbgLeaderboardPanel(leaderboard, options = {}) {
  const {
    targetEl,
    collapse: depCollapse = collapse,
    element: depElement = element,
    translateContainer: depTranslate = translateContainer,
    copyToClipboard: depCopyToClipboard = copyToClipboard,
    doc = typeof document !== 'undefined' ? document : null,
  } = options;

  const isCollapsed = Boolean(depCollapse?.collapseGBGLeaderboard);
  const iconHtml =
    depElement && typeof depElement.icon === 'function' ?
      depElement.icon(
        'gbgLeaderboardIcon',
        'gbgLeaderboardCollapse',
        isCollapsed,
      )
    : `<span class="header-icon collapse-toggle fw-bold font-monospace" id="gbgLeaderboardIcon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="gbgLeaderboardCollapse" data-bs-target="#gbgLeaderboardCollapse" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;
  const closeBtn =
    depElement && typeof depElement.close === 'function' ?
      depElement.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const copyBtn =
    depElement && typeof depElement.copy === 'function' ?
      depElement.copy('gbgLeaderboardCopyID', 'info', 'right', isCollapsed)
    : `<span id="gbgLeaderboardCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" style="display: ${isCollapsed ? 'none' : 'block'}" data-i18n="copy">Copy</span>`;

  const leaderboardHTML = buildLeaderboardHTML(leaderboard);
  const tableMarkup =
    leaderboardHTML.startsWith('<table') ? leaderboardHTML : (
      `<table class="goods-table w-100">${leaderboardHTML}</table>`
    );

  const resolvedTarget =
    targetEl ||
    (doc && doc.getElementById('gbgLeaderboard')) ||
    gbgLeaderboardDIV ||
    output;
  if (!resolvedTarget) return null;

  resolvedTarget.innerHTML = `<div id="gbgLeaderboardCard" class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">
      ${closeBtn}
      <p id="gbgLeaderboardTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#gbgLeaderboardCollapse" aria-expanded="${!isCollapsed}" aria-controls="gbgLeaderboardCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <strong>GBG Leaderboard:</strong>
      </p>
      ${copyBtn}
      <div id="gbgLeaderboardCollapse" class="alert-info overflow resize collapse ${isCollapsed ? '' : 'show'}">
        <div id="leaderboardText" class="mt-1">${tableMarkup}</div>
      </div>
    </div>`;

  if (!doc) return resolvedTarget;

  const labelEl = doc.getElementById('gbgLeaderboardTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (e?.target?.closest?.('#gbgLeaderboardIcon')) return;
      if (typeof depCollapse?.fCollapseGBGLeaderboard === 'function') {
        depCollapse.fCollapseGBGLeaderboard();
      }
    });
  }

  const iconEl = doc.getElementById('gbgLeaderboardIcon');
  if (iconEl && typeof depCollapse?.fCollapseGBGLeaderboard === 'function') {
    iconEl.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      depCollapse.fCollapseGBGLeaderboard();
    });
  }

  const copyEl = doc.getElementById('gbgLeaderboardCopyID');
  if (copyEl && typeof depCopyToClipboard === 'function') {
    copyEl.addEventListener('click', () => {
      depCopyToClipboard('#leaderboardText');
    });
  }

  if (typeof depTranslate === 'function') {
    depTranslate(resolvedTarget);
  }

  return resolvedTarget;
}
