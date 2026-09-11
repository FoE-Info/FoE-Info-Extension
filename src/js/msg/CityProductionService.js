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
import * as helper from '../fn/helper.js';
import { showReward } from '../fn/RewardRenderer.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import { MilitaryDefs, rewardsArmy, rewardsCity } from '../vars/state.js';
import { updateGalaxy } from './StartupService.js';

const logger = createLogger('CityProductionService');

export function pickupProduction(msg) {
  const resp = msg?.responseData;
  if (!resp) return;

  if (Array.isArray(resp.militaryProducts) && resp.militaryProducts.length) {
    const units = resp.militaryProducts;
    units.forEach((unit) => {
      if (!unit) return;
      const unitId = unit.unitTypeId;
      const name =
        (unitId && MilitaryDefs[unitId]?.name) || unitId || 'Unknown Unit';
      logger.debug('Military unit pickup:', unitId, name);
      if (rewardsArmy[name]) rewardsArmy[name]++;
      else rewardsArmy[name] = 1;
    });
  }
  if (Array.isArray(resp.updatedEntities) && resp.updatedEntities.length) {
    const rewards = resp.updatedEntities;
    rewards.forEach((reward) => {
      if (!reward) return;
      updateGalaxy(reward);
      const resources = reward.state?.current_product?.product?.resources;
      if (resources && typeof resources === 'object') {
        Object.keys(resources).forEach((resource) => {
          const name = helper.fResourceShortName(resource);
          const amt = Number(resources[resource]) || 0;
          if (rewardsCity[name]) rewardsCity[name] += amt;
          else rewardsCity[name] = amt;
        });
      }
      if (
        reward.state &&
        reward.state.productionOption &&
        reward.state.productionOption.products
      ) {
        const prodList =
          Array.isArray(reward.state.productionOption.products) ?
            reward.state.productionOption.products
          : reward.state.productionOption.products.array || [];

        prodList.forEach((element) => {
          if (
            element &&
            element.playerResources &&
            element.playerResources.resources
          ) {
            Object.keys(element.playerResources.resources).forEach(
              (resource) => {
                const name = helper.fResourceShortName(resource);
                const resQty =
                  element.playerResources.resources[resource] ??
                  reward.state?.current_product?.product?.resources?.[
                    resource
                  ] ??
                  0;
                if (rewardsCity[name]) rewardsCity[name] += resQty;
                else rewardsCity[name] = resQty;
              },
            );
          }
        });
      }
    });
  }
  logger.debug('Rewards city updated:', rewardsCity);
  var reward = {
    source: 'pickupProduction',
    name: '',
    amount: 0,
  };

  if (showOptions.showRewards) {
    showReward(reward);
  }
}
