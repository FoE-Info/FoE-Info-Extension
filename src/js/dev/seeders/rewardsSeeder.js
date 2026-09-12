/**
 * rewardsSeeder.js (dev-only)
 *
 * Replays a saved reward template through the real reward pipeline so the
 * Rewards panel is populated without waiting for a live drop.
 */

const { createLogger } = require('../../utils/logger.js');
const { showReward } = require('../../ui/RewardRenderer.js');
const { loadFixture } = require('../fixtureClient.js');

const logger = createLogger('DevRewardsSeeder');

async function seedRewards(fixture = 'rewards.json') {
  const template = await loadFixture(fixture);
  if (!Array.isArray(template)) return 0;

  let applied = 0;
  for (const entry of template) {
    if (!entry || typeof entry.source !== 'string') continue;
    showReward(entry.source, entry.payload || {});
    applied++;
  }

  logger.debug('Seeded rewards', { applied });
  return applied;
}

module.exports = { seedRewards };
module.exports.default = module.exports;
