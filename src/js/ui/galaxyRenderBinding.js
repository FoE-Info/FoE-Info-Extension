/**
 * galaxyRenderBinding.js
 *
 * Binds the Blue Galaxy store's render callback to the galaxy panel renderer.
 * Side-effect loads renderGalaxyPanel.js so the panel ships in the bundle.
 */

const { blueGalaxyState } = require('../state/BlueGalaxyState.js');
const { showGalaxy } = require('./renderGalaxyPanel.js');

function bindGalaxyRender(
  state = blueGalaxyState,
  { render = showGalaxy } = {},
) {
  if (!state || typeof state.setRenderCallback !== 'function') {
    return () => {};
  }
  state.setRenderCallback(() => render());
  return () => state.setRenderCallback(null);
}

bindGalaxyRender();

module.exports = { bindGalaxyRender };
module.exports.default = module.exports;
