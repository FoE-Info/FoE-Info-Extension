/**
 * UI orchestration registry for shared render bindings.
 *
 * Provides an explicit initialization function `initializeUIBindings(dependencies)`
 * instead of side-effect execution upon module load.
 */

const { bindArmyPanel } = require('./armyRenderBinding.js');
const { bindBonusPanel } = require('./bonusRenderBinding.js');
const { bindExpeditionPanel } = require('./expeditionRenderBinding.js');
const { bindGalaxyRender } = require('./galaxyRenderBinding.js');
const { bindGbDonationPanels } = require('./gbDonationRenderBinding.js');
const { bindGuildBattlegroundPanels } = require('./gbgRenderBinding.js');
const {
  bindGreatBuildingsPanels,
} = require('./greatBuildingsRenderBinding.js');
const { bindIncidentPanels } = require('./incidentRenderBinding.js');
const { bindInvestedPanel } = require('./investedRenderBinding.js');
const { bindOutpostPanel } = require('./outpostRenderBinding.js');
const { bindQuantumPanels } = require('./quantumRenderBinding.js');
const { bindResourcePanel } = require('./resourceRenderBinding.js');
const { bindRewardPanel } = require('./rewardRenderBinding.js');
const { bindSocialLists } = require('./socialRenderBinding.js');
const {
  bindStartupMetadataLoading,
} = require('./startupMetadataLoadingBinding.js');
const { bindStartupRenderState } = require('./startupRenderBinding.js');
const { bindTreasuryPanel } = require('./treasuryRenderBinding.js');
const { bindVisitedCityRender } = require('./visitedCityRenderBinding.js');

/**
 * Initializes all UI render bindings with explicit dependency injection.
 *
 * @param {Object} [dependencies={}] Optional state and collaborator overrides
 * @returns {() => void} Cleanup function that unsubscribes all registered bindings
 */
function initializeUIBindings(dependencies = {}) {
  const unbinders = [
    bindArmyPanel(dependencies.armyState, dependencies.armyDeps),
    bindBonusPanel(dependencies.bonusState, dependencies.bonusDeps),
    bindExpeditionPanel(
      dependencies.expeditionState,
      dependencies.expeditionDeps,
    ),
    bindGalaxyRender(dependencies.blueGalaxyState, dependencies.galaxyDeps),
    bindGbDonationPanels(
      dependencies.gbDonationState,
      dependencies.gbDonationDeps,
    ),
    bindGuildBattlegroundPanels(
      dependencies.guildBattlegroundState,
      dependencies.gbgDeps,
    ),
    bindGreatBuildingsPanels(
      dependencies.greatBuildingsState,
      dependencies.greatBuildingsDeps,
    ),
    bindIncidentPanels(dependencies.incidentState, dependencies.incidentDeps),
    bindInvestedPanel(dependencies.investedState, dependencies.investedDeps),
    bindOutpostPanel(dependencies.outpostState, dependencies.outpostDeps),
    bindQuantumPanels(dependencies.quantumState, dependencies.quantumDeps),
    bindResourcePanel(dependencies.resourceState, dependencies.resourceDeps),
    bindRewardPanel(dependencies.rewardState, dependencies.rewardDeps),
    bindSocialLists(dependencies.socialState, dependencies.socialDeps),
    bindStartupMetadataLoading(
      dependencies.startupRenderState,
      dependencies.startupMetadataDeps,
    ),
    bindStartupRenderState(
      dependencies.startupRenderState,
      dependencies.startupDeps,
    ),
    bindTreasuryPanel(dependencies.treasuryState, dependencies.treasuryDeps),
    bindVisitedCityRender(
      dependencies.visitedCityState,
      dependencies.visitedCityDeps,
    ),
  ];

  return function unbindUIBindings() {
    for (const unbind of unbinders) {
      if (typeof unbind === 'function') {
        try {
          unbind();
        } catch {
          // ignore teardown errors
        }
      }
    }
  };
}

module.exports = {
  initializeUIBindings,
};
module.exports.default = module.exports;
