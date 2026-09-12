/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import { showReward } from '../fn/RewardRenderer.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import { MilitaryDefs } from '../vars/state.js';
import { updateGalaxy } from './StartupService.js';

const logger = createLogger('CityProductionService');

export function pickupProduction(msg) {
  const resp = msg?.responseData;
  if (!resp) return;

  const rewardsEnabled = showOptions.showRewards;

  if (Array.isArray(resp.militaryProducts) && resp.militaryProducts.length) {
    resp.militaryProducts.forEach((unit) => {
      if (!unit) return;
      const unitId = unit.unitTypeId;
      const name =
        (unitId && MilitaryDefs[unitId]?.name) || unitId || 'Unknown Unit';
      logger.debug('Military unit pickup:', unitId, name);
      if (rewardsEnabled) {
        showReward('cityProductionArmy', { name, amount: 1, type: 'unit' });
      }
    });
  }

  if (Array.isArray(resp.updatedEntities) && resp.updatedEntities.length) {
    resp.updatedEntities.forEach((reward) => {
      if (!reward) return;
      updateGalaxy(reward);

      const resources = reward.state?.current_product?.product?.resources;
      if (resources && typeof resources === 'object') {
        Object.keys(resources).forEach((resource) => {
          const amt = Number(resources[resource]) || 0;
          if (amt && rewardsEnabled) {
            showReward('cityProductionCity', {
              subType: resource,
              type: 'resource',
              amount: amt,
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
                if (resQty && rewardsEnabled) {
                  showReward('cityProductionCity', {
                    subType: resource,
                    type: 'resource',
                    amount: resQty,
                  });
                }
              },
            );
          }
        });
      }
    });
  }

  logger.debug('City production pickup routed through showReward');
}
