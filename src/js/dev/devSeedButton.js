/**
 * devSeedButton.js (dev-only)
 *
 * Floating control that re-applies the dev forced state after a live startup
 * resets panel state. Only compiled into the dev bundle.
 */

const { createLogger } = require('../utils/logger.js');
const i18n = require('../utils/i18n.js');

const logger = createLogger('DevSeedButton');

let mounted = null;

function label(key, fallback) {
  try {
    const value = i18n.t(key);
    return value && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

function mountDevSeedButton(onClick, targetDocument = document) {
  if (!targetDocument?.createElement) return null;
  if (mounted && targetDocument.contains(mounted)) return mounted;

  const host = targetDocument.getElementById('content') || targetDocument.body;
  if (!host) return null;

  const wrapper = targetDocument.createElement('div');
  wrapper.id = 'devSeed';
  wrapper.className = 'mb-2';

  const button = targetDocument.createElement('button');
  button.type = 'button';
  button.id = 'devSeedButton';
  button.className = 'btn btn-sm btn-outline-warning w-100';
  button.setAttribute('data-i18n', 'dev_seed');
  button.textContent = label('dev_seed', 'Load Dev Fixtures');

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const result = await onClick();
      button.textContent = label('dev_seed_done', 'Dev fixtures loaded');
      logger.info('Dev seed applied via button', result);
    } catch (err) {
      logger.error('Dev seed failed via button', err);
      button.textContent = label('dev_seed_failed', 'Dev seed failed');
    } finally {
      button.disabled = false;
    }
  });

  wrapper.appendChild(button);
  host.insertBefore(wrapper, host.firstChild);
  mounted = wrapper;
  logger.debug('Mounted dev seed button');
  return wrapper;
}

function unmountDevSeedButton() {
  if (mounted && mounted.parentNode) {
    mounted.parentNode.removeChild(mounted);
  }
  mounted = null;
  logger.debug('Unmounted dev seed button');
}

module.exports = { mountDevSeedButton, unmountDevSeedButton };
module.exports.default = module.exports;
