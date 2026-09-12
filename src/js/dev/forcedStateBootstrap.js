/**
 * forcedStateBootstrap.js (dev-only)
 *
 * Appends to the panel `app` entry in the dev target only (see
 * webpack.config.js). Seeds captured payload state so panels render without
 * waiting for live RPCs, and exposes a button to re-apply after a live
 * startup reset.
 */

const { createLogger } = require('../utils/logger.js');
const { applyForcedState } = require('./applyForcedState.js');
const { mountDevSeedButton } = require('./devSeedButton.js');

if (typeof FORCE_FIXTURES !== 'undefined' && FORCE_FIXTURES) {
  const logger = createLogger('DevForcedState');

  if (typeof window !== 'undefined') {
    window.foeDevSeed = applyForcedState;
  }

  const start = () => {
    mountDevSeedButton(() => applyForcedState());
    applyForcedState()
      .then((result) => logger.info('Forced-state seed applied', result))
      .catch((err) => logger.error('Forced-state seed failed', err));
  };

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
