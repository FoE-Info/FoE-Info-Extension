/**
 * targetGeneratorEvents.js
 *
 * DOM event listener binding and tooltip lifecycle for the GBG Target Generator card.
 * Extracted from renderTargetGeneratorCard.js to isolate DOM event wiring from templating.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('TargetGenEvents');
} catch {
  logger = { debug() {}, info() {}, warn() {}, error() {} };
}

/**
 * Attaches event listeners for clipboard copying, Discord posting, collapse toggling,
 * and tooltip instantiation on the target generator card.
 *
 * @param {Object} options Binding options
 */
function bindTargetGeneratorEvents({
  onTargetCopy = null,
  onTargetPost = null,
  post_webstore = {},
  collapse = {},
  Tooltip = null,
} = {}) {
  if (typeof document === 'undefined') return;

  const copyBtn = document.getElementById('targetCopyID');
  if (copyBtn && typeof onTargetCopy === 'function') {
    copyBtn.addEventListener('click', onTargetCopy);
  }

  const postBtn = document.getElementById('targetGenPostID');
  const postHandler =
    typeof onTargetPost === 'function' ? onTargetPost
    : typeof post_webstore?.postTargetGenToDiscord === 'function' ?
      post_webstore.postTargetGenToDiscord
    : typeof post_webstore?.postTargetsToDiscord === 'function' ?
      post_webstore.postTargetsToDiscord
    : null;
  if (postBtn && postHandler) {
    postBtn.addEventListener('click', postHandler);
  }

  const labelEl = document.getElementById('targetGenLabel');
  if (labelEl && typeof collapse?.fCollapseTargetGen === 'function') {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#targetGenicon')
      ) {
        return;
      }
      collapse.fCollapseTargetGen();
    });
  }

  const iconEl = document.getElementById('targetGenicon');
  if (
    iconEl &&
    iconEl !== labelEl &&
    typeof collapse?.fCollapseTargetGen === 'function'
  ) {
    iconEl.addEventListener('click', () => {
      collapse.fCollapseTargetGen();
    });
  }

  const siegecamp_tooltip = document.getElementById('siegecamp_tooltip');
  if (siegecamp_tooltip && typeof Tooltip === 'function') {
    try {
      new Tooltip(siegecamp_tooltip, {
        html: true,
        delay: { show: 200, hide: 500 },
      });
    } catch (e) {
      logger?.warn('Failed to initialize siegecamp_tooltip:', e);
    }
  }

  logger?.debug('bindTargetGeneratorEvents attached successfully');
}

module.exports = {
  bindTargetGeneratorEvents,
};
module.exports.default = module.exports;
