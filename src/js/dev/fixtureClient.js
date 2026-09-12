/**
 * fixtureClient.js (dev-only)
 *
 * Loads captured game payload fixtures packaged under `fixtures/` in the dev
 * build only. Never compiled into beta/prod bundles (see webpack.config.js).
 */

const { createLogger } = require('../utils/logger.js');

const logger = createLogger('DevFixtures');

async function loadFixture(relPath) {
  if (typeof FORCE_FIXTURES === 'undefined' || !FORCE_FIXTURES) return null;
  if (typeof browser === 'undefined' || !browser?.runtime?.getURL) {
    logger.warn('browser.runtime unavailable; cannot load fixture', relPath);
    return null;
  }

  const url = browser.runtime.getURL(`fixtures/${relPath}`);
  const res = await fetch(url);
  if (!res.ok) {
    logger.warn('Fixture missing', relPath, res.status);
    return null;
  }
  try {
    return await res.json();
  } catch (err) {
    logger.error('Fixture parse failed', relPath, err);
    return null;
  }
}

module.exports = { loadFixture };
module.exports.default = module.exports;
