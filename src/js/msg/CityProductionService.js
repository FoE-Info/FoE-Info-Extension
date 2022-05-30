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
import {showRewards,rewardsCity,MilitaryDefs} from "../index.js";
import { updateGalaxy } from "./StartupService.js";
import {showOptions} from '../vars/showOptions.js';
import * as helper from '../fn/helper.js';

export function pickupProduction(msg){

    if(msg.responseData.militaryProducts.length){
        var units = msg.responseData.militaryProducts;
        // var numUnits = msg.responseData.militaryProducts.length;
        // var unitsList = {};
        units.forEach(unit => {
            var name = "";
            if(MilitaryDefs[unit.unitTypeId])
                name = MilitaryDefs[unit.unitTypeId].name;
            else
                name = unit.unitTypeId;
            console.debug(unit.unitTypeId,name)
            if(rewardsArmy[name])
                rewardsArmy[name]++;
            else
                rewardsArmy[name] = 1;
        });
    }
    if(msg.responseData.updatedEntities.length){
        var rewards = msg.responseData.updatedEntities;
        rewards.forEach(reward => {
            // console.debug(reward.state.current_product.hasOwnProperty('product') , reward.state.current_product.product.hasOwnProperty('resources'));
            if(reward.state.hasOwnProperty('current_product') && reward.state.current_product.hasOwnProperty('product') && reward.state.current_product.product.hasOwnProperty('resources')){
                updateGalaxy(reward.cityentity_id);
                // var resources = reward.state.current_product.product.resources;
                // console.debug(resources);
                Object.keys(reward.state.current_product.product.resources).forEach(resource => {
                    const name = helper.fResourceShortName(resource);
                    // console.debug(name,resource)
                    if(rewardsCity[name])
                        rewardsCity[name] += reward.state.current_product.product.resources[resource];
                    else
                        rewardsCity[name] = reward.state.current_product.product.resources[resource];
                });
            }
        });
    }
    console.debug(rewardsCity);
    var reward = [];
    reward.source = 'pickupProduction';
    reward.name = '';
    reward.amount = 0;

    if(showOptions.showRewards){
        showRewards(reward);
    }					

}