/**
 * applyForcedState.js (dev-only)
 *
 * Orchestrates the dev forced-state seeders from `fixtures/panels.json`.
 */

const { createLogger } = require('../utils/logger.js');
const { loadFixture } = require('./fixtureClient.js');
const { seedGalaxy } = require('./seeders/galaxySeeder.js');
const { seedRewards } = require('./seeders/rewardsSeeder.js');

const logger = createLogger('DevForcedState');

async function applyForcedState() {
  const config = (await loadFixture('panels.json')) || {};
  const result = { galaxy: 0, rewards: 0 };

  if (config.galaxy !== false) {
    result.galaxy = await seedGalaxy(
      config.galaxyFixture || 'rpc/CityMapService.getEntities.json',
      Number.isFinite(config.galaxyCharges) ? config.galaxyCharges : 10,
    );
  }

  if (config.rewards !== false) {
    result.rewards = await seedRewards(config.rewardsFixture || 'rewards.json');
  }

  logger.debug('Forced state applied', result);
  return result;
}

module.exports = { applyForcedState };
module.exports.default = module.exports;
