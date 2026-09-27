/**
 * greatBuildingsPanel.js
 *
 * Unified Great Buildings panel controller:
 * - GB Overview & Donors/Contributors card renderer
 * - GB Info panel (current level, progress, transition times)
 * - Output container repair and DOM safeguarding (repairGbOutput / fCheckOutput)
 * - Reactive store subscription (bindGreatBuildingsPanels)
 */

const { escapeHTML } = require('../utils/escape.js');
const { createLogger } = require('../utils/logger.js');
const { greatBuildingsState } = require('../state/GreatBuildingDomainState.js');

const logger = createLogger('GreatBuildingsPanel');

let element = {};
try {
  element = require('./AddElement.js');
} catch {
  try {
    element = require('../fn/AddElement.js');
  } catch {}
}

let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}

let copy = {};
try {
  copy = require('../fn/copy.js');
} catch {}

let helper = {};
try {
  helper = require('../fn/helper.js');
} catch {}

let dateUtils = {};
try {
  dateUtils = require('../utils/date.js');
} catch {}

let BigNumber;
try {
  BigNumber = require('bignumber.js');
} catch {}

let GreatBuildingCalculator = {};
try {
  GreatBuildingCalculator = require('../calc/GreatBuildingCalculator.js');
} catch {}

let defaultShowOptions = {};
try {
  const showOptModule = require('../state/showOptions.js');
  defaultShowOptions = showOptModule.showOptions || showOptModule || {};
} catch {
  defaultShowOptions = {};
}

// ============================================================================
// 1. GB OUTPUT REPAIR & DOM SAFEGUARDING
// ============================================================================

function resolveElement(el, id, doc) {
  if (el) return el;
  if (!doc || typeof doc.getElementById !== 'function') return null;
  return doc.getElementById(id);
}

function repairGbOutput({
  contentEl = typeof document !== 'undefined' ?
    document.getElementById('content')
  : null,
  targetDocument = typeof document !== 'undefined' ? document : null,
  greatbuilding = null,
  gbInfoDIV = null,
  donation2DIV = null,
  donationDIV = null,
  cityrewards = null,
  showOptions = defaultShowOptions,
} = {}) {
  if (!contentEl || !targetDocument) return;
  logger.debug('Safeguarding GB output containers in #content');

  const resolvedGreatbuilding = resolveElement(
    greatbuilding,
    'greatbuilding',
    targetDocument,
  );
  const resolvedGbInfo = resolveElement(gbInfoDIV, 'gbInfo', targetDocument);
  const resolvedDonation2 = resolveElement(
    donation2DIV,
    'donation2',
    targetDocument,
  );
  const resolvedDonation = resolveElement(
    donationDIV,
    'donation',
    targetDocument,
  );
  const resolvedRewards = resolveElement(
    cityrewards,
    'cityrewards',
    targetDocument,
  );

  // Invariant order: 1. GB Donation panel, 2. GB Info, 3. GB contributors
  if (resolvedGreatbuilding) {
    resolvedGreatbuilding.id = 'greatbuilding';
    if (!targetDocument.body?.contains?.(resolvedGreatbuilding)) {
      contentEl.appendChild(resolvedGreatbuilding);
    }
    if (
      showOptions?.showGBDonors !== false &&
      resolvedGreatbuilding.style?.display === 'none'
    ) {
      resolvedGreatbuilding.style.display = '';
    }
    const parent = resolvedGreatbuilding.parentElement;
    if (
      parent &&
      parent.id === 'gbContributors' &&
      showOptions?.showGBDonors !== false &&
      parent.style?.display === 'none'
    ) {
      parent.style.display = '';
    }
  }

  if (resolvedGbInfo) {
    resolvedGbInfo.id = 'gbInfo';
    if (!targetDocument.body?.contains?.(resolvedGbInfo)) {
      contentEl.appendChild(resolvedGbInfo);
    }
    if (
      showOptions?.showGBInfo !== false &&
      resolvedGbInfo.style?.display === 'none'
    ) {
      resolvedGbInfo.style.display = '';
    }
  }

  if (resolvedDonation2) {
    resolvedDonation2.id = 'donation2';
    if (!targetDocument.body?.contains?.(resolvedDonation2)) {
      contentEl.appendChild(resolvedDonation2);
    }
    if (
      showOptions?.showDonation !== false &&
      resolvedDonation2.style?.display === 'none'
    ) {
      resolvedDonation2.style.display = '';
    }
    const parent = resolvedDonation2.parentElement;
    if (
      parent &&
      parent.id === 'gbDonation' &&
      showOptions?.showDonation !== false &&
      parent.style?.display === 'none'
    ) {
      parent.style.display = '';
    }
  }

  if (resolvedDonation) {
    resolvedDonation.id = 'donation';
    if (!targetDocument.body?.contains?.(resolvedDonation)) {
      contentEl.appendChild(resolvedDonation);
    }
    if (
      showOptions?.showDonation !== false &&
      resolvedDonation.style?.display === 'none'
    ) {
      resolvedDonation.style.display = '';
    }
  }

  if (resolvedRewards) {
    resolvedRewards.id = 'cityrewards';
    if (!targetDocument.body?.contains?.(resolvedRewards)) {
      contentEl.appendChild(resolvedRewards);
    }
  }
}

// ============================================================================
// 2. GB DONORS & OVERVIEW CARD RENDERER
// ============================================================================

function defaultCalculateArcReward(baseFp, arcBonusPercent = 90) {
  if (typeof GreatBuildingCalculator.calculateArcReward === 'function') {
    return GreatBuildingCalculator.calculateArcReward(baseFp, arcBonusPercent);
  }
  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
  if (BN) {
    const base = new BN(baseFp || 0);
    const bonus = new BN(arcBonusPercent ?? 90);
    const multiplier = new BN(1).plus(bonus.dividedBy(100));
    return base
      .multipliedBy(multiplier)
      .integerValue(BN.ROUND_HALF_UP)
      .toNumber();
  }
  return Math.round(
    Number(baseFp || 0) * (1 + Number(arcBonusPercent ?? 90) / 100),
  );
}

function renderGbDonorsCard(params = {}) {
  const {
    GBselected = {},
    rankings,
    showOptions = {},
    greatbuilding,
    Top,
    GBrewards,
    Reward,
    City,
    PlayerID,
    setPlayerName,
    helper: depHelper = helper,
    element: depElement = element,
    collapse: depCollapse = collapse,
    copy: depCopy = copy,
    calculateArcReward = defaultCalculateArcReward,
  } = params;

  if (Array.isArray(Top)) {
    for (let i = 0; i < Top.length; i++) Top[i] = 0;
  }
  if (Array.isArray(GBrewards)) {
    for (let i = 0; i < GBrewards.length; i++) GBrewards[i] = 0;
  }
  if (Array.isArray(Reward)) {
    for (let i = 0; i < Reward.length; i++) Reward[i] = 0;
  }

  if (!rankings || !Array.isArray(rankings)) {
    if (greatbuilding) {
      greatbuilding.innerHTML = '';
    }
    return { outputHTML: '', donorsHTML: '' };
  }

  const escapeFn =
    typeof depHelper?.escapeHTML === 'function' ?
      depHelper.escapeHTML
    : escapeHTML;
  const ownerName = escapeFn(
    GBselected.player_name || params.PlayerName || params.playerName || '',
  );
  const gbName = escapeFn(GBselected.name || '');
  const gbLevel = GBselected.level || 0;
  const gbMaxLevel = GBselected.max_level || gbLevel + 1;
  const gbCurrent = GBselected.current || 0;
  const gbTotal = GBselected.total || 0;

  const closeBtn =
    typeof depElement?.close === 'function' ? depElement.close() : '';
  const copyBtnHtml =
    typeof depElement?.copy === 'function' ?
      depElement.copy(
        'donorCopyID',
        'secondary',
        'right',
        depCollapse?.collapseGBDonors,
      )
    : '';
  const iconHtml =
    typeof depElement?.icon === 'function' ?
      depElement.icon(
        'gbinvesticon',
        'donorText',
        depCollapse?.collapseGBDonors,
      )
    : '';

  const outputHTML = `<div class="alert alert-secondary alert-dismissible show collapsed" role="status" aria-live="polite">
      ${closeBtn}
      <p id="donorTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donorText" aria-expanded="${!depCollapse?.collapseGBDonors}" aria-controls="donorText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
      <strong><span data-i18n="gb">GB</span> <span data-i18n="contributors">Contributors</span>:</strong>
      </p>
      ${copyBtnHtml}
      <div id="donorText" class="collapse ${depCollapse?.collapseGBDonors ? '' : 'show'}">
        ${ownerName ? `<div><span data-i18n="owner">Owner</span>: ${ownerName}</div>` : ''}
        <div><span data-i18n="building">Building</span>: ${gbName}</div>
        <div><span data-i18n="level">Level</span>: ${gbLevel} / ${gbMaxLevel}</div>
        <div><span data-i18n="invested">Invested</span>: ${gbCurrent} of ${gbTotal} FP</div>
        <div class="mt-2">`;

  let donorsHTML = '';
  let validDonorsCount = 0;

  for (const place of rankings) {
    if (!place) continue;
    const rank = place.rank;
    const fp = place.forge_points || 0;
    if (rank > 0 && rank <= 5) {
      if (Array.isArray(Top)) {
        Top[rank - 1] = fp;
      }
      if (place.reward?.strategy_point_amount) {
        if (Array.isArray(GBrewards)) {
          GBrewards[rank - 1] = place.reward.strategy_point_amount;
        }
        if (Array.isArray(Reward)) {
          Reward[rank - 1] = calculateArcReward(
            place.reward.strategy_point_amount,
            City?.ArcBonus ?? 90,
          );
        }
      }
    }
    if (rank > 0 && rank <= 10) {
      if (fp > 0 && place.player?.name) {
        validDonorsCount++;
        const safeDonorName = escapeFn(place.player.name);
        donorsHTML += `<div>${rank}. ${safeDonorName} (${fp} FP)</div>`;
        if (
          PlayerID != null &&
          place.player?.player_id != null &&
          PlayerID == place.player.player_id
        ) {
          if (typeof setPlayerName === 'function') {
            setPlayerName(place.player.name, PlayerID);
          }
        }
      }
    } else {
      if (
        PlayerID != null &&
        place.player?.player_id != null &&
        PlayerID == place.player.player_id
      ) {
        if (typeof setPlayerName === 'function') {
          setPlayerName(place.player.name, PlayerID);
        }
      }
    }
  }

  if (validDonorsCount === 0) {
    donorsHTML =
      '<span class="text-muted" data-i18n="no_contributors">No contributors yet</span>';
  }

  if (greatbuilding) {
    if (showOptions?.showGBDonors !== false) {
      const donorsBody = donorsHTML;
      greatbuilding.innerHTML = outputHTML + donorsBody + '</div></div></div>';

      const doc = typeof document !== 'undefined' ? document : null;
      const copyEl =
        greatbuilding.querySelector?.('#donorCopyID') ||
        doc?.getElementById?.('donorCopyID');
      if (copyEl && typeof depCopy?.DonorCopy === 'function') {
        copyEl.addEventListener('click', depCopy.DonorCopy);
      }

      const labelEl =
        greatbuilding.querySelector?.('#donorTextLabel') ||
        doc?.getElementById?.('donorTextLabel');
      if (labelEl && typeof depCollapse?.fCollapseGBDonors === 'function') {
        labelEl.addEventListener('click', (e) => {
          if (
            e?.target &&
            typeof e.target.closest === 'function' &&
            (e.target.closest('#gbinvesticon') ||
              e.target.closest('#donoricon'))
          ) {
            return;
          }
          depCollapse.fCollapseGBDonors();
        });
      }

      const iconEl =
        greatbuilding.querySelector?.('#gbinvesticon') ||
        doc?.getElementById?.('gbinvesticon');
      if (
        iconEl &&
        iconEl !== labelEl &&
        typeof depCollapse?.fCollapseGBDonors === 'function'
      ) {
        iconEl.addEventListener('click', () => {
          depCollapse.fCollapseGBDonors();
        });
      }

      if (typeof depHelper?.translateContainer === 'function') {
        depHelper.translateContainer(greatbuilding);
      }
    } else {
      greatbuilding.innerHTML = '';
    }
  }

  return { outputHTML, donorsHTML };
}

const renderGbOverviewCard = renderGbDonorsCard;

// ============================================================================
// 3. GB INFO PANEL RENDERER
// ============================================================================

function safeEscape(val) {
  if (typeof helper.escapeHTML === 'function') {
    return helper.escapeHTML(val);
  }
  return escapeHTML(val);
}

function renderGbInfoPanel(
  targetEl,
  gbData = {},
  playerName = '',
  showOptions = {},
) {
  if (!targetEl) return;

  const isEnabled = showOptions.showGBInfo !== false;
  if (
    !isEnabled ||
    !gbData ||
    (!gbData.name && !gbData.level && !gbData.id && !gbData.cityentity_id)
  ) {
    targetEl.innerHTML = '';
    return;
  }

  if (targetEl.style && targetEl.style.display === 'none') {
    targetEl.style.display = '';
  }

  const isCollapsed = !!collapse.collapseGBInfo;
  const level = gbData.level || 0;
  const maxLevel = gbData.max_level || level + 1;
  const currentFp = gbData.current || 0;
  const totalFp = gbData.total || 0;
  const remainingFp = totalFp - currentFp;

  const readyAt =
    gbData.readyAt ??
    gbData.next_state_transition_at ??
    gbData.state?.next_state_transition_at;

  const gbName = safeEscape(gbData.name || 'Great Building');

  const closeBtnHtml =
    typeof element.close === 'function' ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';

  const iconHtml =
    typeof element.icon === 'function' ?
      element.icon('gbinfoicon', 'gbInfoCollapse', isCollapsed)
    : `<span id="gbinfoicon" class="header-icon collapse-toggle fw-bold font-monospace align-middle" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="gbInfoCollapse" data-bs-target="#gbInfoCollapse" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;

  let html = `<div class="alert alert-purple alert-dismissible show" role="status" aria-live="polite">`;
  html += closeBtnHtml;
  html += `<p id="gbInfoTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#gbInfoCollapse" aria-expanded="${!isCollapsed}" aria-controls="gbInfoCollapse" class="pe-4 mb-0 cursor-pointer user-select-none" style="cursor: pointer; user-select: none;">`;
  html += iconHtml;
  html += ` <strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong></p>`;

  html += `<div id="gbInfoCollapse" class="collapse ${isCollapsed ? '' : 'show'}">`;
  if (playerName) {
    html += `<div><span data-i18n="owner">Owner</span>: ${safeEscape(playerName)}</div>`;
  }
  html += `<div><span data-i18n="building">Building</span>: ${gbName}</div>`;
  html += `<div><span data-i18n="level">Level</span>: ${level} / ${maxLevel}</div>`;
  html += `<div><span data-i18n="invested">Invested</span>: ${currentFp} of ${totalFp} FP</div>`;
  html += `<div><span data-i18n="total_remaining">Total Remaining</span>: ${remainingFp} FP</div>`;

  if (typeof readyAt === 'number' && readyAt > 0 && !Number.isNaN(readyAt)) {
    const formattedReady =
      typeof dateUtils.formatDateTime === 'function' ?
        dateUtils.formatDateTime(readyAt)
      : '';
    if (formattedReady) {
      html += `<div><span data-i18n="ready">Ready</span>: ${formattedReady}</div>`;
    }
  }

  html += `</div></div>`;

  targetEl.innerHTML = html;

  const labelEl =
    targetEl.querySelector ? targetEl.querySelector('#gbInfoTextLabel')
    : typeof document !== 'undefined' ?
      document.getElementById('gbInfoTextLabel')
    : null;
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#gbinfoicon')
      ) {
        return;
      }
      if (typeof collapse.fCollapseGBInfo === 'function') {
        collapse.fCollapseGBInfo();
      }
    });
  }
}

// ============================================================================
// 4. REACTIVE STORE BINDING
// ============================================================================

function bindGreatBuildingsPanels(
  state = greatBuildingsState,
  {
    renderDonors = renderGbDonorsCard,
    renderInfo = renderGbInfoPanel,
    renderDonation = null,
    repairOutput = repairGbOutput,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (typeof repairOutput === 'function') {
      repairOutput();
    }

    if (channel === 'donors' || channel === 'all') {
      const payload = snapshot.getDonors();
      if (payload && typeof renderDonors === 'function') renderDonors(payload);
    }

    if (channel === 'info' || channel === 'all') {
      const payload = snapshot.getInfo();
      if (payload && typeof renderInfo === 'function') {
        renderInfo(
          payload.targetEl,
          payload.gbData,
          payload.playerName,
          payload.showOptions,
        );
      }
    }

    if (channel === 'donation' || channel === 'all') {
      const payload = snapshot.getDonation();
      if (payload && typeof renderDonation === 'function') {
        renderDonation(payload);
      }
    }
  });
}

module.exports = {
  repairGbOutput,
  fCheckOutput: repairGbOutput,
  renderGbDonorsCard,
  renderGbOverviewCard,
  defaultCalculateArcReward,
  renderGbInfoPanel,
  bindGreatBuildingsPanels,
  default: {
    repairGbOutput,
    fCheckOutput: repairGbOutput,
    renderGbDonorsCard,
    renderGbOverviewCard,
    renderGbInfoPanel,
    bindGreatBuildingsPanels,
  },
};
