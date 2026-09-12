/**
 * galaxySeeder.js (dev-only)
 *
 * Seeds the Blue Galaxy state from a captured city-entity fixture so the panel
 * renders as if the live city were harvested. Requires renderGalaxyPanel to
 * register the render callback.
 */

const { createLogger } = require('../../utils/logger.js');
const { blueGalaxyState } = require('../../state/BlueGalaxyState.js');
const { createGalaxyCandidate } = require('../../calc/BlueGalaxyCalculator.js');
const { loadFixture } = require('../fixtureClient.js');

const logger = createLogger('DevGalaxySeeder');

async function seedGalaxy(
  fixture = 'rpc/CityMapService.getEntities.json',
  charges = 10,
) {
  const entities = await loadFixture(fixture);
  if (!Array.isArray(entities)) return 0;

  require('../../ui/renderGalaxyPanel.js');

  const candidates = [];
  for (const entity of entities) {
    const candidate = createGalaxyCandidate(entity);
    if (candidate) candidates.push(candidate);
  }

  blueGalaxyState.setCandidates(candidates);
  blueGalaxyState.setCharges(charges);
  logger.debug('Seeded Blue Galaxy', {
    candidates: candidates.length,
    charges,
  });
  return candidates.length;
}

module.exports = { seedGalaxy };
module.exports.default = module.exports;
