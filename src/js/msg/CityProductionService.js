/**
 * CityProductionService.js
 *
 * City production RPC service rendering harvest rewards and units.
 * Handles CityProductionService.pickupProduction.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityProductionService');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

let blueGalaxyState = { updateEntity: () => {} };
try {
  ({ blueGalaxyState } = require('../state/BlueGalaxyState.js'));
} catch {}

let rewardStatePkg = {};
try {
  rewardStatePkg = require('../state/RewardState.js');
} catch {}
const rewardState =
  rewardStatePkg.rewardState || rewardStatePkg.default || rewardStatePkg;

let fTitleCase = (val) => val;
try {
  ({ fTitleCase } = require('../utils/formatters.js'));
} catch {}

let showOptions = {};
try {
  const showOpt = require('../vars/showOptions.js');
  showOptions = showOpt.showOptions || showOpt;
} catch {}

let MilitaryDefs = {};
try {
  const statePkg = require('../vars/state.js');
  MilitaryDefs = statePkg.MilitaryDefs || {};
} catch {}

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

function pickupProduction(msg) {
  const resp = msg?.responseData;
  if (!resp) return;

  const rewardsEnabled = showOptions.showRewards;

  if (Array.isArray(resp.militaryProducts) && resp.militaryProducts.length) {
    resp.militaryProducts.forEach((unit) => {
      if (!unit) return;
      const unitId = unit.unitTypeId;
      const name =
        (unitId && MilitaryDefs[unitId]?.name) ||
        (unitId ? fTitleCase(unitId) : '') ||
        'Unknown Unit';
      logger.debug('Military unit pickup:', unitId, name);
      if (rewardsEnabled && typeof rewardState?.setReward === 'function') {
        rewardState.setReward({
          source: 'cityProductionArmy',
          payload: { name, amount: 1, type: 'unit' },
        });
      }
    });
  }

  if (Array.isArray(resp.updatedEntities) && resp.updatedEntities.length) {
    resp.updatedEntities.forEach((reward) => {
      if (!reward) return;
      blueGalaxyState.updateEntity(reward);

      const resources = reward.state?.current_product?.product?.resources;
      if (resources && typeof resources === 'object') {
        Object.keys(resources).forEach((resource) => {
          const amt = Number(resources[resource]) || 0;
          if (
            amt &&
            rewardsEnabled &&
            typeof rewardState?.setReward === 'function'
          ) {
            rewardState.setReward({
              source: 'cityProductionCity',
              payload: { subType: resource, type: 'resource', amount: amt },
            });
          }
        });
      }

      if (reward.state?.productionOption?.products) {
        const prodList =
          Array.isArray(reward.state.productionOption.products) ?
            reward.state.productionOption.products
          : reward.state.productionOption.products.array || [];

        prodList.forEach((element) => {
          if (element?.playerResources?.resources) {
            Object.keys(element.playerResources.resources).forEach(
              (resource) => {
                const resQty =
                  element.playerResources.resources[resource] ??
                  reward.state?.current_product?.product?.resources?.[
                    resource
                  ] ??
                  0;
                if (
                  resQty &&
                  rewardsEnabled &&
                  typeof rewardState?.setReward === 'function'
                ) {
                  rewardState.setReward({
                    source: 'cityProductionCity',
                    payload: {
                      subType: resource,
                      type: 'resource',
                      amount: resQty,
                    },
                  });
                }
              },
            );
          }
        });
      }
    });
  }

  logger.debug('City production pickup routed through RewardState');
}

class CityProductionService {
  constructor() {
    this.pickupProduction = pickupProduction;
    this.register = this.register.bind(this);
  }

  register(dispatcher = messageDispatcher, options = {}) {
    if (!dispatcher || typeof dispatcher.register !== 'function') return this;
    const handler = options.pickupProduction || pickupProduction;
    dispatcher.register('CityProductionService', 'pickupProduction', handler);
    logger?.debug('CityProductionService registered pickupProduction');
    return this;
  }
}

const cityProductionService = new CityProductionService();

module.exports = {
  CityProductionService,
  cityProductionService,
  pickupProduction,
  register: (dispatcher, options) =>
    cityProductionService.register(dispatcher, options),
};
module.exports.default = cityProductionService;
