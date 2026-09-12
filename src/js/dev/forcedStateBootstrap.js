/**
 * forcedStateBootstrap.js (dev-only)
 *
 * Appends to the panel `app` entry in the dev target only (see
 * webpack.config.js). Seeds captured payload state so panels render without
 * waiting for live RPCs, and exposes a button to re-apply after a live
 * startup reset. Activation is gated on debug mode; toggling the header bug
 * icon mounts or tears the seeder down live.
 */

const {
  createLogger,
  isDebugEnabled,
  onDebugToggle,
} = require('../utils/logger.js');

function createForcedStateController({
  isEnabled,
  subscribe,
  mount,
  unmount,
  apply,
  logger = createLogger('DevForcedState'),
}) {
  let active = false;

  const activate = () => {
    if (active) return;
    active = true;
    mount(() => apply());
    Promise.resolve()
      .then(() => apply())
      .then((result) => logger.info('Forced-state seed applied', result))
      .catch((err) => logger.error('Forced-state seed failed', err));
  };

  const deactivate = () => {
    if (!active) return;
    active = false;
    unmount();
  };

  const sync = (enabled) => {
    if (enabled) activate();
    else deactivate();
  };

  return {
    start() {
      if (typeof subscribe === 'function') subscribe(sync);
      sync(isEnabled());
    },
    sync,
    isActive: () => active,
  };
}

if (typeof FORCE_FIXTURES !== 'undefined' && FORCE_FIXTURES) {
  const { applyForcedState } = require('./applyForcedState.js');
  const {
    mountDevSeedButton,
    unmountDevSeedButton,
  } = require('./devSeedButton.js');

  const controller = createForcedStateController({
    isEnabled: isDebugEnabled,
    subscribe: onDebugToggle,
    mount: mountDevSeedButton,
    unmount: unmountDevSeedButton,
    apply: applyForcedState,
  });

  const start = () => {
    if (typeof window !== 'undefined') {
      window.foeDevSeed = applyForcedState;
    }
    controller.start();
  };

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

module.exports = { createForcedStateController };
module.exports.default = module.exports;
