/**
 * Legacy container-based Great Building donation renderer, extracted from
 * GbDonationService.js. The primary donation UI lives in renderGbDonationPanel.js;
 * this variant is retained for the container-argument call sites and tests.
 */
const BigNumber = require('bignumber.js');
const { createLogger } = require('../utils/logger.js');
const {
  calculateDonorOutcome,
  calculateSafeSpots,
} = require('../calc/GreatBuildingCalculator.js');

const logger = createLogger('GbDonationLegacy');

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
      donationHtml += `</div></div>`;
      donation2DIV.innerHTML = donationHtml;
    } else {
      donation2DIV.innerHTML = '';
    }
  }

  logger.debug('legacy GB donation panel rendered', {
    hasInfo: !!gbInfoEl,
    donors: rankings.length,
    hasDonation: !!donation2DIV,
  });
}

module.exports = { renderGbDonationPanel };
module.exports.default = renderGbDonationPanel;
