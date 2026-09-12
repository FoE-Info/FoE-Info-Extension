/**
 * gbOutputRepair.js
 *
 * Safeguards and restores Great Buildings output containers in #content
 * (donation panel, info panel, contributors list, rewards), ensuring proper
 * DOM attachment, invariant display order, and unhiding according to user options.
 */

const { createLogger } = require('../utils/logger.js');

const logger = createLogger('GbOutputRepair');

let defaultShowOptions = {};
try {
  const showOptModule = require('../state/showOptions.js');
  defaultShowOptions = showOptModule.showOptions || showOptModule || {};
} catch {
  defaultShowOptions = {};
}

function resolveElement(el, id, doc) {
  if (el) return el;
  if (!doc || typeof doc.getElementById !== 'function') return null;
  return doc.getElementById(id);
}

/**
 * Ensures Great Buildings containers are properly mounted in #content and unhidden.
 *
 * @param {Object} [options]
 * @param {HTMLElement|null} [options.contentEl]
 * @param {Document|null} [options.targetDocument]
 * @param {HTMLElement|null} [options.greatbuilding]
 * @param {HTMLElement|null} [options.gbInfoDIV]
 * @param {HTMLElement|null} [options.donation2DIV]
 * @param {HTMLElement|null} [options.donationDIV]
 * @param {HTMLElement|null} [options.cityrewards]
 * @param {Object} [options.showOptions]
 */
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

module.exports = {
  repairGbOutput,
  fCheckOutput: repairGbOutput,
};
module.exports.default = module.exports;
