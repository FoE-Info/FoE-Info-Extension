/**
 * UI orchestration registry for shared render bindings.
 *
 * Provides an explicit initialization function `initializeUIBindings(dependencies)`
 * instead of side-effect execution upon module load.
 */

const { bindArmyPanel } = require('./armyPanel.js');
const { bindBonusPanel } = require('./bonusPanel.js');
const { bindExpeditionPanel } = require('./expeditionPanel.js');
const { bindGalaxyRender } = require('./galaxyPanel.js');
const { bindGbDonationPanels } = require('./gbDonationPanel.js');
const { bindGuildBattlegroundPanels } = require('./gbgPanel.js');
const { bindGreatBuildingsPanels } = require('./greatBuildingsPanel.js');
const { bindIncidentPanels } = require('./incidentsPanel.js');
const { bindInvestedPanel } = require('./investedPanel.js');
const { bindOutpostPanel } = require('./outpostPanel.js');
const { bindQuantumPanels } = require('./quantumPanel.js');
const { bindResourcePanel } = require('./resourcePanel.js');
const { bindRewardPanel } = require('./rewardRenderBinding.js');
const { bindSocialLists } = require('./socialPanel.js');
const { bindStartupMetadataLoading } = require('./startupPanel.js');
const { bindStartupRenderState } = require('./startupPanel.js');
const { bindTreasuryPanel } = require('./treasuryPanel.js');
const { bindVisitedCityRender } = require('./socialPanel.js');

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
