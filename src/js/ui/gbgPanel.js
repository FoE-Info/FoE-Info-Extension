/**
 * gbgPanel.js
 *
 * Unified Guild Battlegrounds (GBG) panel controller:
 * - Battleground result card & member activity table
 * - Province building costs table and clipboard copy
 * - Guild leaderboard panel & changes-only roster view
 * - Reactive store subscription (bindGuildBattlegroundPanels)
 *
 * The target generator is a separate feature and lives in
 * ./gbgTargetGenerator.js. This module re-exports it for existing consumers.
 */

const { escapeHTML } = require('../utils/escape.js');

let collapse = {};
try {
  collapse = require('../fn/collapse.mjs');
} catch {}
let copy = {};
try {
  copy = require('../fn/copy.mjs');
} catch {}
let globals = {};
try {
  globals = require('../fn/globals.mjs');
} catch {}
const { setBattlegroundSize, setBuildingCostSize, toolOptions = {} } = globals;
let translateContainer = () => {};
try {
  ({ translateContainer } = require('../fn/i18n.js'));
} catch {}
let post_webstore = {};
try {
  post_webstore = require('../fn/post.js');
} catch {}
let storage = {};
try {
  storage = require('../fn/storage.js');
} catch {}
let showOptions = {};
try {
  showOptions = require('../vars/showOptions.mjs').showOptions || {};
} catch {}

let stateVars = {};
try {
  stateVars = require('../vars/state.mjs');
} catch {}

const {
  battlegroundDIV,
  BattlegroundPerformance = [],
  content,
  donationDIV,
  gbgLeaderboardDIV,
  GuildMembers = [],
  output,
  targets,
  url = {},
} = stateVars;

let element = {};
try {
  element = require('./AddElement.js');
} catch {}
let helper = {};
try {
  helper = require('../fn/helper.mjs');
} catch {}

let guildBattlegroundState = null;
try {
  ({ guildBattlegroundState } = require('../state/GuildDomainState.js'));
} catch {}

let gbgTargetGenerator = {};
try {
  gbgTargetGenerator = require('./gbgTargetGenerator.js');
} catch {}

const {
  buildTargetGeneratorTargets,
  bindTargetGeneratorEvents,
  buildTargetGeneratorMarkup,
  renderTargetGeneratorCard,
  renderTargetGeneratorPanel,
  sortProvincesByLock,
  targetCopy: targetGeneratorCopy,
} = gbgTargetGenerator;

// ============================================================================
// 1. CLIPBOARD & PROVINCE VIEW UTILITIES
// ============================================================================

async function copyToClipboard(elementSelector) {
  if (typeof document === 'undefined') return false;
  const el =
    typeof elementSelector === 'string' ?
      document.querySelector(elementSelector)
    : elementSelector;
  if (!el) return false;

  const text = el.innerText || el.textContent || '';
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const copied = document.execCommand('copy');
    if (sel) sel.removeAllRanges();
    return copied;
  } catch {}
  return false;
}

function buildingCostCopy() {
  copyToClipboard('#buildingCostText');
}

function buildBuildingCostsTableHTML({
  map = [],
  ProvinceDefs = [],
  mapName = '',
  BuildingDefs = {},
  helper: depHelper = helper,
} = {}) {
  let costsHTML = '';
  const activeProvinces = (map || []).filter(
    (p) => p && p.availableBuildings != null,
  );
  activeProvinces.forEach((province) => {
    const costs = province.availableBuildings || [];
    const slots = province.totalBuildingSlots;
    const def = (ProvinceDefs || []).find((d) => d.id == province.id);
    const rawName = ((def && def.name) || '').split(' ');
    let name0 = rawName[0] || '';
    let name1 = rawName[1] || '';

    if (mapName === 'waterfall') {
      name1 = '';
      name0 = name0.substr(0, 3);
    } else {
      name1 = name1.charAt(0);
      name0 = name0.substr(0, 2);
    }

    costsHTML += `<tr><th scope="col">${name0 + name1}${
      slots ? ' [' + slots + ']' : ''
    }</th><th scope="col"><span data-i18n="resource">Resource</span> 1</th><th scope="col"><span data-i18n="qty">Qty</span></th><th scope="col"><span data-i18n="resource">Resource</span> 2</th><th scope="col"><span data-i18n="qty">Qty</span></th><th scope="col"><span data-i18n="resource">Resource</span> 3</th><th scope="col"><span data-i18n="qty">Qty</span></th></tr>`;
    costs.forEach((building) => {
      const bName =
        BuildingDefs && BuildingDefs[building.buildingId]?.name ?
          BuildingDefs[building.buildingId].name
        : building.buildingId;
      costsHTML += `<tr><td>${escapeHTML(bName)}</td>`;
      const resources = building.costs?.resources || {};
      Object.keys(resources).forEach((resource) => {
        const resLabel =
          typeof depHelper?.fResourceShortName === 'function' ?
            depHelper.fResourceShortName(resource)
          : resource;
        costsHTML += `<td>${resLabel}</td><td>${resources[resource]}</td>`;
      });
      costsHTML += `</tr>`;
    });
  });
  return costsHTML;
}

const buildProvinceTableHTML = buildBuildingCostsTableHTML;

function buildBuildingCostCardHTML({
  costsHTML = '',
  collapse: depCollapse = collapse,
  toolOptions: depToolOptions = toolOptions,
  element: depElement = element,
} = {}) {
  const closeBtn =
    typeof depElement?.close === 'function' ? depElement.close() : '';
  const iconMarkup =
    typeof depElement?.icon === 'function' ?
      depElement.icon(
        'buildingCostIcon',
        'buildingCostText',
        depCollapse?.collapseBuildingCost,
      )
    : '';
  const copyBtn =
    typeof depElement?.copy === 'function' ?
      depElement.copy(
        'buildingCostID',
        'primary',
        'right',
        depCollapse?.collapseBuildingCost,
      )
    : '';
  const isShow = depCollapse?.collapseBuildingCost === false ? 'show' : '';
  const height = depToolOptions?.buildingCostSize || 100;

  return (
    `<div class="alert alert-info alert-dismissible  show collapsed" role="status" aria-live="polite">
    ${closeBtn}
    <p id="buildingCostTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#buildingCostText" aria-expanded="${!depCollapse?.collapseBuildingCost}" aria-controls="buildingCostText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconMarkup}
    <strong><span data-i18n="gbg_building_costs">GBG Building Costs</span>:</strong></p>` +
    copyBtn +
    `<div style="height: ${height}px" id="buildingCostText" class="overflow-y resize collapse ${isShow}"><div class="overflow-auto"><table class="goods-table w-100">` +
    `<caption class="visually-hidden"><span data-i18n="gbg_building_costs">GBG Building Costs</span></caption>` +
    costsHTML +
    `</table></div></div></div>`
  );
}

function renderBuildingCostCard({
  costsDiv,
  costsHTML = '',
  collapse: depCollapse = collapse,
  buildingCostCopy: onBuildingCostCopy = buildingCostCopy,
  toolOptions: depToolOptions = toolOptions,
  setBuildingCostSize: depSetBuildingCostSize = setBuildingCostSize,
  helper: depHelper = helper,
  element: depElement = element,
  ResizeObserverClass = typeof ResizeObserver !== 'undefined' ? ResizeObserver
  : null,
} = {}) {
  const cardHTML = buildBuildingCostCardHTML({
    costsHTML,
    collapse: depCollapse,
    toolOptions: depToolOptions,
    element: depElement,
  });
  if (costsDiv) {
    costsDiv.innerHTML = cardHTML;
  }

  if (typeof document !== 'undefined') {
    const copyBtn =
      document.getElementById('buildingCostID') ||
      document.getElementById('costCopyID');
    if (copyBtn && typeof onBuildingCostCopy === 'function') {
      copyBtn.addEventListener('click', (e) => {
        if (typeof e?.preventDefault === 'function') e.preventDefault();
        onBuildingCostCopy();
      });
    }

    const icon1 = document.getElementById('buildingCostIcon');
    const icon2 =
      document.getElementById('buildingCosticon') ||
      document.getElementById('costicon');
    if (icon1 && typeof depCollapse?.fCollapseBuildingCost === 'function') {
      icon1.addEventListener('click', () => {
        depCollapse.fCollapseBuildingCost();
      });
    }
    if (
      icon2 &&
      icon2 !== icon1 &&
      typeof depCollapse?.fCollapseBuildingCost === 'function'
    ) {
      icon2.addEventListener('click', () => {
        depCollapse.fCollapseBuildingCost();
      });
    }
    const labelBtn =
      document.getElementById('buildingCostTextLabel') ||
      document.getElementById('costTextLabel');
    if (labelBtn && typeof depCollapse?.fCollapseBuildingCost === 'function') {
      labelBtn.addEventListener('click', (e) => {
        if (
          e.target?.closest?.('#buildingCosticon') ||
          e.target?.closest?.('#costicon')
        )
          return;
        depCollapse.fCollapseBuildingCost();
      });
    }

    const collapseEl =
      document.getElementById('buildingCostText') ||
      document.getElementById('costCollapse');
    if (
      collapseEl &&
      ResizeObserverClass &&
      typeof depSetBuildingCostSize === 'function'
    ) {
      try {
        const ro = new ResizeObserverClass((entries) => {
          for (const entry of entries) {
            const h = Math.round(entry.contentRect.height);
            if (h >= 80) depSetBuildingCostSize(h);
          }
        });
        ro.observe(collapseEl);
      } catch {}
    }

    if (costsDiv && typeof depHelper?.translateContainer === 'function') {
      depHelper.translateContainer(costsDiv);
    }
  }

  return cardHTML;
}

function buildLeaderboardHTML(leaderboard = []) {
  let leaderboardHTML = `<thead><tr><th scope="col" class="text-start">Guild</th><th scope="col" class="text-center">VP/hr</th><th scope="col" class="text-center">Total VP</th></tr></thead><tbody>`;
  (leaderboard || []).forEach((guild) => {
    const name = escapeHTML(guild?.clan?.name || '');
    const vpHourly = Number(guild?.victoryPointsHourly || 0).toLocaleString();
    const vpTotal = Number(guild?.victoryPointsTotal || 0).toLocaleString();
    leaderboardHTML += `<tr><td class="text-start">${name}</td><td class="text-center tabular-nums">${vpHourly}</td><td class="text-center tabular-nums">${vpTotal}</td></tr>`;
  });
  leaderboardHTML += `</tbody>`;
  return leaderboardHTML;
}

// ============================================================================
// 3. BATTLEGROUND RESULT CARD
// ============================================================================

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
    : escapeHTML;

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
        <strong><span data-i18n="battleground_result">Battleground Result</span>:</strong></p>` +
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
    onRow,
  } = options;

  const doc = typeof document !== 'undefined' ? document : null;
  const target =
    targetEl ||
    (doc && doc.getElementById('battleground')) ||
    battlegroundDIV ||
    donationDIV;

  if (
    Array.isArray(responseData?.playerLeaderboardEntries) &&
    typeof onRow === 'function'
  ) {
    for (const entry of responseData.playerLeaderboardEntries) {
      onRow({
        rank: entry?.rank,
        name: entry?.player?.name,
        negotiations: entry?.negotiationsWon || 0,
        fights: entry?.battlesWon || 0,
        attrition: entry?.attrition || 0,
      });
    }
  }

  const html = buildBattlegroundResultCardHTML(responseData, {
    helper: depHelper,
    element: depElement,
    collapseState: depCollapse?.collapseBattleground,
  });

  if (target) {
    target.innerHTML = html;
  }

  const copyEl =
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('battlegroundCopyID')
    : null) ||
    (typeof document !== 'undefined' ?
      document.getElementById('battlegroundCopyID')
    : null);
  if (copyEl && typeof depCopy?.BattlegroundCopy === 'function') {
    copyEl.addEventListener('click', depCopy.BattlegroundCopy);
  }

  const iconEl =
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('battlegroundicon')
    : null) ||
    (typeof document !== 'undefined' ?
      document.getElementById('battlegroundicon')
    : null);
  if (iconEl && typeof depCollapse?.fCollapseBattleground === 'function') {
    iconEl.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      depCollapse.fCollapseBattleground();
    });
  }

  const labelEl =
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('battlegroundResultTextLabel')
    : null) ||
    (typeof document !== 'undefined' ?
      document.getElementById('battlegroundResultTextLabel')
    : null);
  if (labelEl && typeof depCollapse?.fCollapseBattleground === 'function') {
    labelEl.addEventListener('click', (e) => {
      if (e?.target?.closest?.('#battlegroundicon')) return;
      depCollapse.fCollapseBattleground();
    });
  }

  if (depHelper?.translateContainer && target) {
    depHelper.translateContainer(target);
  }

  return html;
}

// ============================================================================
// 4. ROSTER CHANGES & BATTLEGROUNDS PANEL
// ============================================================================

let heightGBG = toolOptions?.battlegroundsSize || 200;
let gbgResizeObserver = null;

function setHeight() {
  if (!showOptions.showBattlegroundChanges && heightGBG) {
    if (typeof setBattlegroundSize === 'function') {
      setBattlegroundSize(heightGBG);
    }
  }
}

function fshowBattlegroundChanges() {
  showOptions.showBattlegroundChanges = !showOptions.showBattlegroundChanges;
  if (typeof storage.set === 'function') {
    storage.set('showOptions', showOptions);
  }
  fshowBattleground();
}

function fshowBattleground() {
  const GameOrigin = stateVars.GameOrigin || '';
  const BGtime = stateVars.BGtime || '';
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
  let battlegroundHTML = `<div class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">
	<p id="battlegroundTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#battlegroundCollapse" aria-expanded="${!collapse.collapseBattleground}" aria-controls="battlegroundCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
	${element.icon ? element.icon('battlegroundicon', 'battlegroundCollapse', collapse.collapseBattleground) : ''}
	<strong><span data-i18n="battlegrounds">Battlegrounds</span>: [${escapeHTML(bgWorldLabel)}]</strong></p>${element.close ? element.close() : ''}`;

  if (url.sheetGuildURL && element.post)
    battlegroundHTML += element.post(
      'battlegroundPostID',
      'info',
      'mid',
      collapse.collapseBattleground,
    );
  if (element.copy)
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

  battlegroundHTML += `<div class="form-check form-check-inline showGBGchanges"><input class="form-check-input" type="checkbox" id="showGBGchanges" ${
    isChangesOnly ? 'checked' : ''
  }><label class="form-check-label small" for="showGBGchanges" data-i18n="show_changes_only">show changes only</label></div>
	${BGtime ? '<p><span data-i18n="last_saved">Last Saved</span>: ' + escapeHTML(BGtime) + '</p>' : ''}
	<div><table id="gbg-table" class="gbg-table w-100"><caption class="visually-hidden"><span data-i18n="member_activity">Member Activity</span></caption><thead><tr><th scope="col" class="text-start"><span data-i18n="member">Member</span></th><th scope="col" class="text-center"><span data-i18n="neg">Negs</span></th><th scope="col" class="text-center"><span data-i18n="fights">Fights</span></th><th scope="col" class="text-center"><span data-i18n="attrition">Attrition</span></th></tr></thead><tbody>`;
  let renderedRows = 0;
  (BattlegroundPerformance || []).forEach((entry) => {
    let wonNegotiations = 0;
    let wonBattles = 0;
    let battleDiff = 0;
    let negotiationsDiff = 0;
    let attrition = 0;
    let attritionDiff = 0;
    if (entry.wonNegotiations) wonNegotiations = entry.wonNegotiations;
    if (entry.wonBattles) wonBattles = entry.wonBattles;
    if (entry.attrition) attrition = entry.attrition;

    let player = (GuildMembers || []).find((id) => id.name == entry.name);
    if (player) {
      battleDiff = wonBattles - (player.wonBattles ?? wonBattles);
      negotiationsDiff =
        wonNegotiations - (player.wonNegotiations ?? wonNegotiations);
      attritionDiff = attrition - (player.attrition ?? attrition);
    }
    if (
      !showOptions.showBattlegroundChanges ||
      battleDiff > 0 ||
      negotiationsDiff > 0
    ) {
      renderedRows++;
      battlegroundHTML += `<tr><td class="text-start">${escapeHTML(entry.name)}</td><td class="text-center">${wonNegotiations}`;
      if (negotiationsDiff)
        battlegroundHTML += ` <span class="red">${negotiationsDiff > 0 ? '+' : ''}${negotiationsDiff}</span>`;
      battlegroundHTML += `</td><td class="text-center">${wonBattles}`;
      if (battleDiff)
        battlegroundHTML += ` <span class="red">${battleDiff > 0 ? '+' : ''}${battleDiff}</span>`;
      battlegroundHTML += `</td><td class="text-center">${attrition}`;
      if (attritionDiff)
        battlegroundHTML += ` <span class="red">${attritionDiff > 0 ? '+' : ''}${attritionDiff}</span>`;
      battlegroundHTML += `</td></tr>`;
    }
  });

  if (isChangesOnly && renderedRows === 0) {
    battlegroundHTML += `<tr><td colspan="4" class="text-center text-muted fst-italic py-2"><span data-i18n="no_active_changes">No active changes since last save</span></td></tr>`;
  }

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
  if (
    postEl &&
    url.sheetGuildURL &&
    typeof post_webstore.postGBGtoSS === 'function'
  ) {
    postEl.addEventListener('click', post_webstore.postGBGtoSS);
  }

  const copyEl = document.getElementById('battlegroundCopyID');
  if (copyEl) {
    if (typeof copy.BattlegroundCopy === 'function') {
      copyEl.addEventListener('click', copy.BattlegroundCopy);
    }
  }

  const iconEl = document.getElementById('battlegroundicon');
  if (iconEl) {
    iconEl.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      collapse.fCollapseBattleground?.();
    });
  }

  const labelEl = document.getElementById('battlegroundTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (e?.target?.closest?.('#battlegroundicon')) return;
      collapse.fCollapseBattleground?.();
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
        toolOptions?.battlegroundsSize && toolOptions.battlegroundsSize > 250 ?
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

  if (targetEl && typeof translateContainer === 'function') {
    translateContainer(targetEl);
  }
}

function renderGbgLeaderboardPanel(leaderboard, options = {}) {
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
      `<table class="goods-table w-100"><caption class="visually-hidden"><span data-i18n="leaderboard">GBG Leaderboard</span></caption>${leaderboardHTML}</table>`
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
        <strong><span data-i18n="gbg_leaderboard">GBG Leaderboard</span>:</strong>
      </p>
      ${copyBtn}
      <div id="gbgLeaderboardCollapse" class="alert-info overflow resize collapse ${isCollapsed ? '' : 'show'}">
        <div id="leaderboardText">${tableMarkup}</div>
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

// ============================================================================
// 5. REACTIVE STORE BINDING
// ============================================================================

function renderProvinceCosts(payload = {}) {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return null;

  let costsDiv = doc.getElementById('costs');
  if (!costsDiv) {
    costsDiv = doc.createElement('div');
    costsDiv.id = 'costs';
    const parent = doc.getElementById('content') || content;
    if (parent && typeof parent.appendChild === 'function') {
      parent.appendChild(costsDiv);
    }
  }

  const costsHTML = buildBuildingCostsTableHTML({
    map: payload.map,
    ProvinceDefs: payload.provinceDefs,
    mapName: payload.mapName,
    BuildingDefs: payload.buildingDefs,
    helper,
  });

  return renderBuildingCostCard({
    costsDiv,
    costsHTML,
    collapse,
    buildingCostCopy,
    toolOptions,
    setBuildingCostSize,
    helper,
    element,
    ResizeObserverClass:
      typeof ResizeObserver !== 'undefined' ? ResizeObserver : null,
  });
}

function resolveTooltip() {
  try {
    return require('bootstrap').Tooltip;
  } catch {
    return null;
  }
}

function buildTargetParams(payload = {}) {
  return {
    targetsContainer: targets,
    showOptions,
    element,
    collapse,
    helper,
    url,
    post_webstore,
    targetCopy,
    targetPost: post_webstore?.postTargetGenToDiscord,
    Tooltip: resolveTooltip(),
    guildBattlegroundState,
    map: payload.map,
    signals: payload.signals,
    provinceDefs: payload.provinceDefs,
    volcanoProvinceDefs: payload.volcanoProvinceDefs,
    waterfallProvinceDefs: payload.waterfallProvinceDefs,
    currentParticipantId: payload.currentParticipantId,
    mapName: payload.mapName,
    epocTime: payload.epocTime,
    gameOrigin: payload.gameOrigin,
    targetText: payload.targetText,
    formatTime: payload.formatTime,
    signalChanged: payload.signalChanged,
  };
}

function buildResultOptions(payload = {}) {
  const targetEl =
    (typeof document !== 'undefined' &&
      document.getElementById('battleground')) ||
    battlegroundDIV ||
    donationDIV;

  return {
    targetEl,
    collapseState: collapse.collapseBattleground,
    helper,
    element,
    collapse,
    copy,
    url,
    post_webstore,
    onRow: payload.onRow,
  };
}

function bindGuildBattlegroundPanels(
  state = guildBattlegroundState,
  {
    renderTargets = renderTargetGeneratorPanel,
    renderResult = renderBattlegroundResultCard,
    renderLeaderboard = renderGbgLeaderboardPanel,
    renderCosts = renderProvinceCosts,
    renderPerformance = fshowBattleground,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'targets' || channel === 'all') {
      const payload = snapshot.getTargets();
      if (payload) {
        if (snapshot.isTargetMessageActive?.() && !payload.signalChanged) {
          return;
        }
        renderTargets(buildTargetParams(payload));
      }
    }
    if (channel === 'result' || channel === 'all') {
      const payload = snapshot.getResult();
      if (payload)
        renderResult(payload.responseData, buildResultOptions(payload));
    }
    if (channel === 'leaderboard' || channel === 'all') {
      const payload = snapshot.getLeaderboard();
      if (payload && typeof renderLeaderboard === 'function') {
        renderLeaderboard(payload.leaderboard, {
          translateContainer: helper?.translateContainer,
        });
      }
    }
    if (channel === 'province' || channel === 'all') {
      const payload = snapshot.getProvince();
      if (payload) renderCosts(payload);
    }
    if (channel === 'performance' || channel === 'all') {
      const payload = snapshot.getPerformance();
      if (payload && typeof renderPerformance === 'function') {
        renderPerformance(payload);
      }
    }
  });
}

// `targetCopy` previously closed over this module's copyToClipboard. Now that
// the generator is its own module, the clipboard helper is injected instead.
function targetCopy() {
  return targetGeneratorCopy(copyToClipboard);
}

module.exports = {
  copyToClipboard,
  buildingCostCopy,
  buildBuildingCostsTableHTML,
  buildProvinceTableHTML,
  buildBuildingCostCardHTML,
  renderBuildingCostCard,
  buildLeaderboardHTML,
  // Re-exported from ./gbgTargetGenerator.js so existing consumers and tests
  // keep a single import site.
  sortProvincesByLock,
  buildTargetGeneratorTargets,
  targetCopy,
  bindTargetGeneratorEvents,
  buildTargetGeneratorMarkup,
  renderTargetGeneratorCard,
  renderTargetGeneratorPanel,
  normalizeBattlegroundResultRows,
  buildBattlegroundResultCardHTML,
  renderBattlegroundResultCard,
  fshowBattlegroundChanges,
  fshowBattleground,
  renderBattlegroundsPanel: fshowBattleground,
  renderGbgLeaderboardPanel,
  renderProvinceCosts,
  bindGuildBattlegroundPanels,
  DEFAULT_RESTRICTED_GBG_HEIGHT: 480,
};
module.exports.default = module.exports;
