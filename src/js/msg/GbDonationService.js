/**
 * GbDonationService.js
 *
 * Domain engine for Great Buildings donation helper, safe spot math,
 * options filtering (showGBInfo, showGBDonors, showDonation, showGBRewards),
 * and dynamic level extraction across RPC payloads.
 */

const BigNumber = require('bignumber.js');
const {
  calculateDonorOutcome,
  calculateSafeSpots,
} = require('../calc/GreatBuildingCalculator.js');

function extractRankingParams(msg, data, context) {
  const tryExtract = (target) => {
    if (!target) return null;
    if (Array.isArray(target)) {
      if (
        target.length > 0 &&
        typeof target[0] !== 'object' &&
        target[0] !== null &&
        target[0] !== undefined
      ) {
        if (target.length >= 3) {
          const res = {
            entityId: target[0],
            playerId: target[1],
            level:
              typeof target[2] === 'number' ? target[2] : Number(target[2]),
          };
          if (target.length >= 4 && target[3] !== undefined) {
            res.contribution =
              typeof target[3] === 'number' ?
                target[3]
              : Number(target[3]) || 0;
          }
          return res;
        }
        if (target.length === 2) {
          return { entityId: target[0], playerId: target[1], level: undefined };
        }
        if (target.length === 1) {
          return { entityId: target[0], playerId: undefined, level: undefined };
        }
      }
    } else if (typeof target === 'object') {
      const entityId = target.entity_id || target.entityId || target.id;
      const playerId = target.player_id || target.playerId;
      const level =
        target.level !== undefined ? Number(target.level) : undefined;
      const contribution =
        target.contribution !== undefined ?
          Number(target.contribution)
        : undefined;
      if (
        entityId !== undefined ||
        playerId !== undefined ||
        level !== undefined ||
        contribution !== undefined
      ) {
        const res = { entityId, playerId, level };
        if (contribution !== undefined) res.contribution = contribution;
        return res;
      }
    }
    return null;
  };

  const sources = [
    msg?.requestData,
    context?.requestData,
    data,
    context?.request?.requestData,
  ];

  for (const src of sources) {
    const res = tryExtract(src);
    if (res) return res;
    if (Array.isArray(src)) {
      for (const item of src) {
        const sub = tryExtract(item?.requestData || item);
        if (sub) return sub;
      }
    }
  }

  if (context?.request?.postData) {
    let post = context.request.postData;
    if (typeof post === 'string') {
      try {
        post = JSON.parse(post);
      } catch (e) {
        post = null;
      }
    }
    if (Array.isArray(post)) {
      for (const item of post) {
        const res = tryExtract(item?.requestData || item);
        if (res) return res;
      }
    } else if (post && typeof post === 'object') {
      const res = tryExtract(post?.requestData || post);
      if (res) return res;
    }
  }

  if (msg?.responseData?.level !== undefined) {
    return { level: Number(msg.responseData.level) };
  }
  if (msg?.level !== undefined) {
    return { level: Number(msg.level) };
  }

  return null;
}

function extractRankingLevel(msg, data, context) {
  const params = extractRankingParams(msg, data, context);
  return params?.level;
}

function getSelfContribution(rankings = [], viewerId) {
  if (!Array.isArray(rankings) || rankings.length === 0) return 0;
  const selfRow = rankings.find(
    (r) =>
      r?.player?.is_self === true ||
      (viewerId !== undefined &&
        viewerId !== null &&
        r?.player?.player_id === viewerId),
  );
  const fp = Number(selfRow?.forge_points);
  return Number.isFinite(fp) && fp > 0 ? fp : 0;
}

function syncGbSelected(gbSelected, data) {
  if (!gbSelected || !data || typeof data !== 'object') return;
  if (data.id !== undefined) gbSelected.id = data.id;
  if (data.entity_id !== undefined) gbSelected.entity_id = data.entity_id;
  if (data.cityentity_id !== undefined)
    gbSelected.cityentity_id = data.cityentity_id;
  if (data.player !== undefined && data.player !== null)
    gbSelected.player = data.player;
  else if (data.player_id !== undefined && data.player_id !== null)
    gbSelected.player = data.player_id;
  if (data.level !== undefined) gbSelected.level = Number(data.level);
  if (data.max_level !== undefined)
    gbSelected.max_level = Number(data.max_level);
  if (data.current_progress !== undefined)
    gbSelected.current = Number(data.current_progress);
  else if (data.current !== undefined)
    gbSelected.current = Number(data.current);
  else if (data.state?.invested_forge_points !== undefined)
    gbSelected.current = Number(data.state.invested_forge_points);
  if (data.max_progress !== undefined)
    gbSelected.total = Number(data.max_progress);
  else if (data.total !== undefined) gbSelected.total = Number(data.total);
  else if (data.state?.forge_points_for_level_up !== undefined)
    gbSelected.total = Number(data.state.forge_points_for_level_up);
  if (data.name) gbSelected.name = String(data.name);
  if (data.player_name) gbSelected.player_name = String(data.player_name);
  if (data.connected !== undefined)
    gbSelected.connected = Boolean(data.connected);
}

function updateContributionProgress(
  gbSelected,
  rankings = [],
  rankingParams = {},
  viewerPlayerId = 0,
) {
  if (!gbSelected || typeof gbSelected !== 'object') return 0;

  if (Array.isArray(rankings) && rankings.length > 0) {
    const rankingsSum = rankings.reduce(
      (sum, r) => sum + (Number(r?.forge_points) || 0),
      0,
    );

    const isOwnerBuilding =
      (viewerPlayerId &&
        (gbSelected.player === viewerPlayerId ||
          gbSelected.player_id === viewerPlayerId)) ||
      (rankingParams?.playerId &&
        (gbSelected.player === rankingParams.playerId ||
          gbSelected.player_id === rankingParams.playerId));

    const hasSelfRow = rankings.some(
      (r) =>
        r?.player?.is_self === true ||
        (viewerPlayerId && r?.player?.player_id === viewerPlayerId),
    );

    if (
      rankingsSum > 0 &&
      (isOwnerBuilding || hasSelfRow || rankingsSum > (gbSelected.current || 0))
    ) {
      gbSelected.current = rankingsSum;
    } else if (rankingParams?.contribution) {
      gbSelected.current =
        (gbSelected.current || 0) + Number(rankingParams.contribution);
    }
  } else if (rankingParams?.contribution) {
    gbSelected.current =
      (gbSelected.current || 0) + Number(rankingParams.contribution);
  }

  return gbSelected.current || 0;
}

function renderGbDonationPanel(
  containers = {},
  gbData = {},
  rankings = [],
  showOptions = {},
  renderGbInfoFn = null,
) {
  const { greatbuilding, donation2DIV } = containers;
  const gbInfoEl = containers.gbInfo || containers.gbInfoDIV;
  const isShowGbInfo = showOptions.showGBInfo !== false;
  const isShowGbDonors = showOptions.showGBDonors !== false;
  const isShowDonation = showOptions.showDonation !== false;

  if (gbInfoEl) {
    if (typeof renderGbInfoFn === 'function') {
      renderGbInfoFn(gbInfoEl, gbData, gbData.player_name || '', showOptions);
    } else if (isShowGbInfo && (gbData.name || gbData.level !== undefined)) {
      const level = gbData.level || 0;
      const maxLevel = gbData.max_level || level + 1;
      const currentFp = gbData.current || 0;
      const totalFp = gbData.total || 0;
      const remainingFp = totalFp - currentFp;
      const playerPrefix = gbData.player_name ? `${gbData.player_name} | ` : '';
      gbInfoEl.innerHTML = `<div class="alert alert-dark alert-dismissible show" role="alert"><p id="gbInfoTextLabel" class="pe-4 mb-0"><strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong> ${playerPrefix}${gbData.name || 'Great Building'} [${level}/${maxLevel}]</p><div id="gbInfoCollapse" class="collapse show"><table class="w-100 gb-info-table"><tbody><tr><td colspan="2">Level ${level} (Max ${maxLevel})</td></tr><tr><td>${currentFp} of ${totalFp} FP <span data-i18n="total">total</span></td><td><span data-i18n="remaining">remaining</span>: ${remainingFp}FP</td></tr></tbody></table></div></div>`;
    } else {
      gbInfoEl.innerHTML = '';
    }
  }

  if (greatbuilding) {
    if (isShowGbDonors && Array.isArray(rankings) && rankings.length > 0) {
      let donorsHtml =
        '<div class="gb-donors-list alert alert-success p-2 mb-1">';
      donorsHtml += `<strong data-i18n="gb">GB</strong> Donors:<br>`;
      for (const place of rankings) {
        if (place.rank > 0 && place.player?.name) {
          donorsHtml += `<span>${place.player.name} ${place.forge_points || 0}FP</span><br>`;
        }
      }
      donorsHtml += '</div>';
      greatbuilding.innerHTML = donorsHtml;
    } else {
      greatbuilding.innerHTML = '';
    }
  }

  if (donation2DIV) {
    if (isShowDonation) {
      const spots = calculateSafeSpots(gbData, rankings, 90, 190);
      let donationHtml =
        '<div class="card bg-light p-2 mb-2"><div class="card-header font-weight-bold">';
      donationHtml += `<span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span>`;
      donationHtml += `</div><div class="card-body p-2">`;
      const donorArcBonus = showOptions.arcBonusPercent ?? 90;
      const standardPercent = showOptions.donationPercent ?? 190;
      let remaining = BigNumber.maximum(
        0,
        new BigNumber(gbData.total || 0).minus(gbData.current || 0),
      );
      for (const s of spots) {
        const outcome = calculateDonorOutcome(
          remaining,
          s.currentInvested,
          s.baseReward,
          donorArcBonus,
          standardPercent,
        );
        const outcomeLabel =
          outcome.donorProfit > 0 ? '[Profitable]'
          : outcome.donorProfit === 0 ? '[Break-even]'
          : '[Loss]';
        donationHtml += `<div>P${s.place}: Lock ${outcome.spotLock}FP (Costs: ${outcome.costs}FP, Reward: ${outcome.donorReward}FP, Profit/Loss: ${outcome.donorProfit}FP) ${outcomeLabel}</div>`;
        remaining = BigNumber.maximum(0, remaining.minus(outcome.spotLock));
      }
      donationHtml += '</div></div>';
      donation2DIV.innerHTML = donationHtml;
    } else {
      donation2DIV.innerHTML = '';
    }
  }
}

function handleNewReward(msg, showOptions = {}, cityrewards = null, deps = {}) {
  if (showOptions && showOptions.showGBRewards === false) {
    return { success: false, reason: 'option_disabled' };
  }

  let container = cityrewards;
  if (!container && typeof document !== 'undefined') {
    container =
      document.getElementById('cityrewards') ||
      document.getElementById('rewards');
  }
  if (!container) {
    try {
      const statePkg = require('../state/state.js');
      container = statePkg.cityrewards;
    } catch {}
  }

  const data = msg?.responseData || msg;
  let rewardName = '';
  let subType = '';
  let rewardType = 'blueprint';
  let amount = 1;

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    subType =
      first.subType ||
      first.blueprint?.city_entity_id ||
      first.city_entity_id ||
      first.entity_id ||
      '';
    rewardName =
      first.name ||
      first.blueprint?.name ||
      subType ||
      first.type ||
      'Blueprint';
    amount = first.amount || first.totalAmount || 1;
    if (first.type) rewardType = first.type;
  } else if (data && typeof data === 'object') {
    subType =
      data.subType ||
      data.blueprint?.city_entity_id ||
      data.city_entity_id ||
      data.entity_id ||
      '';
    rewardName =
      data.name || data.blueprint?.name || subType || data.type || 'Blueprint';
    amount = data.amount || data.totalAmount || 1;
    if (data.type) rewardType = data.type;
  } else {
    rewardName = String(data);
  }

  let renderer =
    deps.RewardRenderer || deps.rewardRenderer || deps.renderer || null;
  if (!renderer && typeof __webpack_require__ !== 'undefined') {
    try {
      renderer = require('../ui/RewardRenderer.js');
    } catch {
      try {
        renderer = require('../fn/RewardRenderer.js');
      } catch {}
    }
  }

  const showRewardFn =
    (renderer &&
      typeof renderer.showReward === 'function' &&
      renderer.showReward) ||
    (renderer?.default &&
      typeof renderer.default.showReward === 'function' &&
      renderer.default.showReward) ||
    null;

  if (showRewardFn) {
    showRewardFn('greatBuilding', {
      name: rewardName,
      subType: subType || rewardName,
      amount,
      totalAmount: amount,
      type: rewardType,
    });
  } else {
    if (!container) {
      return { success: false, reason: 'no_container' };
    }

    let formattedName = rewardName;
    if (
      rewardType === 'blueprint' ||
      !formattedName.toLowerCase().includes('blueprint')
    ) {
      if (
        !formattedName.toLowerCase().includes('bp') &&
        !formattedName.toLowerCase().includes('blueprint')
      ) {
        formattedName = `${formattedName} BP`;
      }
    }

    if (deps.state && deps.state.rewardsGeneric) {
      deps.state.rewardsGeneric[formattedName] =
        (deps.state.rewardsGeneric[formattedName] || 0) + amount;
    } else if (typeof __webpack_require__ !== 'undefined') {
      try {
        const statePkg = require('../state/state.js');
        if (statePkg && statePkg.rewardsGeneric) {
          statePkg.rewardsGeneric[formattedName] =
            (statePkg.rewardsGeneric[formattedName] || 0) + amount;
        }
      } catch {}
    }

    container.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed" role="alert">
  <p id="rewardsTextLabel">
    <span id="rewardsicon" class="header-icon collapse-toggle fw-bold font-monospace me-1" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="false" data-bs-target="#rewardsText" data-bs-toggle="collapse">[+]</span>
    <strong><span data-i18n="reward">REWARDS:</span></strong>
  </p>
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  <div id="rewardsText" class="overflow resize collapse">
    <p><em>Event/City</em><br>${amount} ${formattedName}<br></p>
  </div>
</div>`;
  }

  return { success: true, rewardName, amount };
}

module.exports = {
  calculateSafeSpots,
  extractRankingLevel,
  extractRankingParams,
  getSelfContribution,
  handleNewReward,
  renderGbDonationPanel,
  syncGbSelected,
  updateContributionProgress,
};
module.exports.default = module.exports;
