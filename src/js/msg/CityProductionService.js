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
    var units = resp.militaryProducts;
    // var numUnits = msg.responseData.militaryProducts.length;
    // var unitsList = {};
    units.forEach((unit) => {
      var name = '';
      if (MilitaryDefs[unit.unitTypeId])
        name = MilitaryDefs[unit.unitTypeId].name;
      else name = unit.unitTypeId;
      logger.debug('Military unit pickup:', unit.unitTypeId, name);
      if (rewardsArmy[name]) rewardsArmy[name]++;
      else rewardsArmy[name] = 1;
    });
  }
  if (Array.isArray(resp.updatedEntities) && resp.updatedEntities.length) {
    var rewards = resp.updatedEntities;
    rewards.forEach((reward) => {
      updateGalaxy(reward);
      // console.debug(reward.state.current_product.hasOwnProperty('product') , reward.state.current_product.product.hasOwnProperty('resources'));
      if (
        reward.state.hasOwnProperty('current_product') &&
        reward.state.current_product.hasOwnProperty('product') &&
        reward.state.current_product.product.hasOwnProperty('resources')
      ) {
        // updateGalaxy(reward.cityentity_id);
        // var resources = reward.state.current_product.product.resources;
        // console.debug(resources);
        Object.keys(reward.state.current_product.product.resources).forEach(
          (resource) => {
            const name = helper.fResourceShortName(resource);
            // console.debug(name,resource)
            if (rewardsCity[name])
              rewardsCity[name] +=
                reward.state.current_product.product.resources[resource];
            else
              rewardsCity[name] =
                reward.state.current_product.product.resources[resource];
          },
        );
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
