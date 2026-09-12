/** Generic reward fallback card renderer, extracted from GbDonationService.js. */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('RewardsPanel');

function buildGenericRewardHtml(amount, formattedName) {
  return `<div class="alert alert-danger alert-dismissible show collapsed" role="alert">
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

function renderGenericReward(container, amount, formattedName) {
  if (!container) return null;
  container.innerHTML = buildGenericRewardHtml(amount, formattedName);
  logger.debug('generic reward rendered', { amount, formattedName });
  return container;
}

module.exports = { renderGenericReward, buildGenericRewardHtml };
module.exports.default = renderGenericReward;
