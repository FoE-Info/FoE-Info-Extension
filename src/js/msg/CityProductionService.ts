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
import { showReward, rewardsArmy, rewardsCity, MilitaryDefs } from '../index';
const _MilitaryDefs = MilitaryDefs as unknown as Record<
  string,
  Record<string, string>
>;
const _rewardsArmy = rewardsArmy as unknown as Record<string, number>;
const _rewardsCity = rewardsCity as unknown as Record<string, unknown>;
import { updateGalaxy } from './StartupService';
import { showOptions } from '../vars/showOptions';
import * as helper from '../fn/helper';

export function pickupProduction(msg: Record<string, unknown>) {
  const responseData = msg.responseData as Record<string, unknown>;
  if ((responseData.militaryProducts as unknown[]).length) {
    var units = responseData.militaryProducts as Array<Record<string, unknown>>;
    units.forEach((unit) => {
      var name = '';
      if (_MilitaryDefs[unit.unitTypeId as string])
        name = _MilitaryDefs[unit.unitTypeId as string].name;
      else name = unit.unitTypeId as string;
      console.debug(unit.unitTypeId, name);
      if (_rewardsArmy[name]) _rewardsArmy[name]++;
      else _rewardsArmy[name] = 1;
    });
  }
  if ((responseData.updatedEntities as unknown[]).length) {
    var rewards = responseData.updatedEntities as Array<
      Record<string, unknown>
    >;
    rewards.forEach((reward) => {
      updateGalaxy(reward);
      const state = reward.state as Record<string, unknown>;
      if (
        Object.prototype.hasOwnProperty.call(state, 'current_product') &&
        Object.prototype.hasOwnProperty.call(
          state.current_product as object,
          'product',
        ) &&
        Object.prototype.hasOwnProperty.call(
          (state.current_product as Record<string, unknown>).product as object,
          'resources',
        )
      ) {
        const resources = (
          (state.current_product as Record<string, unknown>).product as Record<
            string,
            unknown
          >
        ).resources as Record<string, unknown>;
        Object.keys(resources).forEach((resource) => {
          const name = helper.fResourceShortName(resource);
          if (_rewardsCity[name])
            (_rewardsCity as Record<string, number>)[name] += resources[
              resource
            ] as number;
          else
            (_rewardsCity as Record<string, number>)[name] = resources[
              resource
            ] as number;
        });
      }
      if (
        Object.prototype.hasOwnProperty.call(state, 'productionOption') &&
        Object.prototype.hasOwnProperty.call(
          state.productionOption as object,
          'products',
        )
      ) {
        const products = (
          (state.productionOption as Record<string, unknown>)
            .products as Record<string, unknown>
        ).array as Array<Record<string, unknown>>;
        products.forEach((element) => {
          if (
            Object.prototype.hasOwnProperty.call(element, 'playerResources') &&
            Object.prototype.hasOwnProperty.call(
              element.playerResources as object,
              'resources',
            )
          ) {
            const pRes = (element.playerResources as Record<string, unknown>)
              .resources as Record<string, unknown>;
            const cpRes = (
              (state.current_product as Record<string, unknown>)
                .product as Record<string, unknown>
            ).resources as Record<string, unknown>;
            Object.keys(pRes).forEach((resource) => {
              const name = helper.fResourceShortName(resource);
              if (_rewardsCity[name])
                (_rewardsCity as Record<string, number>)[name] += cpRes[
                  resource
                ] as number;
              else
                (_rewardsCity as Record<string, number>)[name] = cpRes[
                  resource
                ] as number;
            });
          }
        });
      }
    });
  }
  console.debug(_rewardsCity);
  var reward: Record<string, unknown> = {};
  reward.source = 'pickupProduction';
  reward.name = '';
  reward.amount = 0;

  if (showOptions.showRewards) {
    showReward(reward);
  }
}
