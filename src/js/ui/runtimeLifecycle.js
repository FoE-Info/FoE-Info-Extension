/**
 * runtimeLifecycle.js
 *
 * Extension runtime lifecycle bindings: install/update notices,
 * update-available reload prompts, and update-check status logging.
 * Dual CJS/ESM compatible.
 */

const { createLogger } = require('../utils/logger.js');

const logger = createLogger('RuntimeLifecycle');

function bindRuntimeLifecycle(config = {}) {
  const browserObj = config.browser;
  const tool = config.tool || { name: 'FoE-Info', version: '' };
  const alertFn =
    typeof config.alertFn === 'function' ? config.alertFn : globalThis.alert;

  if (browserObj?.runtime?.onInstalled?.addListener) {
    browserObj.runtime.onInstalled.addListener((details) => {
      if (details.reason == 'install') {
        logger.debug(`${tool.name} installed!`);
      } else if (details.reason == 'update') {
        logger.debug(
          `${tool.name} updated from ${details.previousVersion} to ${tool.version}!`,
        );
        if (typeof alertFn === 'function') {
          alertFn(
            `${tool.name} updated from ${details.previousVersion} to ${tool.version}!`,
          );
        }
      }
    });
  }

  if (browserObj?.runtime?.onUpdateAvailable?.addListener) {
    browserObj.runtime.onUpdateAvailable.addListener((details) => {
      logger.debug('updating to version ' + details.version);
      if (typeof alertFn === 'function') {
        alertFn('updating to version ' + details.version);
      }
      browserObj.runtime.reload();
    });
  }

  if (typeof browserObj?.runtime?.requestUpdateCheck === 'function') {
    let requestingCheck;
    try {
      requestingCheck = browserObj.runtime.requestUpdateCheck();
    } catch (err) {
      logger.warn('requestUpdateCheck failed:', err);
      return;
    }
    if (requestingCheck && typeof requestingCheck.then === 'function') {
      requestingCheck.then(onRequested, onError);
    }
  }
}

function onRequested(status, details) {
  if (status == 'update_available') {
    logger.debug('update pending...', details?.version);
  } else if (status == 'no_update') {
    logger.debug('no update found');
  } else if (status == 'throttled') {
    logger.debug("Oops, I'm asking too frequently - I need to back off.");
  }
}

function onError(error) {
  logger.warn(`Error: ${error}`);
}

module.exports = {
  bindRuntimeLifecycle,
  onRequested,
  onError,
};
module.exports.default = module.exports;
