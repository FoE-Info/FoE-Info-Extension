/**
 * resourceRenderBinding.js
 *
 * Subscribes the goods inventory and resource panels to the reactive
 * ResourceState. Executes goods renders, the available-FP value, renderer
 * globals, and clear/dismiss signals. Loaded for its side effect by the panel
 * entry.
 */

const { resourceState } = require('../state/ResourceState.js');
const goodsRenderer = require('./renderGoodsPanel.js');
const {
  setAvailableForgePoints,
  clearGoodsPanel,
  goodsCopy,
} = require('./renderResourcePanel.js');

function bindResourcePanel(
  state = resourceState,
  {
    goods = goodsRenderer,
    setFP = setAvailableForgePoints,
    clearGoods = clearGoodsPanel,
    copy = goodsCopy,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'goods' || channel === 'all') {
      const payload = snapshot.getGoodsRender();
      if (!payload) return;
      goods.renderGoodsPanel(payload.resources, {
        ...payload.options,
        onCopy: copy,
      });
    }

    if (channel === 'fp' || channel === 'all') {
      const fp = snapshot.getAvailableForgePoints();
      if (fp !== null && fp !== undefined) setFP(fp);
    }

    if (channel === 'globals' || channel === 'all') {
      const globals = snapshot.getGlobals();
      if (globals) goods.setGlobals(globals);
    }

    if (channel === 'clear' || channel === 'all') {
      clearGoods();
    }
  });
}

bindResourcePanel();

module.exports = { bindResourcePanel };
module.exports.default = module.exports;
