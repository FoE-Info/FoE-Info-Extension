/**
 * startupMetadataLoadingBinding.js
 *
 * Subscribes the startup metadata loading placeholder to the reactive
 * StartupRenderState `metadata-loading` channel. Loaded for its side effect by
 * the panel entry.
 */

const { startupRenderState } = require('../state/StartupRenderState.js');
const {
  renderMetadataLoadingPlaceholder,
} = require('./startupMetadataLoading.js');

function bindStartupMetadataLoading(
  state = startupRenderState,
  { renderPlaceholder = renderMetadataLoadingPlaceholder } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'metadata-loading' && channel !== 'all') return;
    const payload = snapshot.getMetadataLoading();
    if (!payload) return;
    renderPlaceholder(payload.container, payload.options);
  });
}

bindStartupMetadataLoading();

module.exports = { bindStartupMetadataLoading };
module.exports.default = module.exports;
