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

import * as collapse from '../fn/collapse.js';
import { setRewardSize, toolOptions } from '../fn/globals.js';
import * as helper from '../fn/helper.js';
import {
  cityrewards,
  rewardsArmy,
  rewardsCity,
  rewardsGBG,
  rewardsGE,
  rewardsGeneric,
  rewardsOtherPlayer,
} from '../state/state.js';
import { translateContainer } from '../utils/i18n.js';
import * as element from './AddElement.js';

let rewardResizeObserver = null;
let heightRewards = toolOptions.rewardSize;

function setHeight() {
  console.debug('mouseup', heightRewards);
  setRewardSize(heightRewards);
}

export function rewardObserve() {
  const rewardsEl = document.getElementById('rewards');
  if (rewardsEl) translateContainer(rewardsEl);
  const rewardDiv = document.getElementById('rewardsText');
  if (rewardDiv) {
    rewardDiv.addEventListener('mouseup', setHeight);

    // Dispose previous observer to prevent memory leak
    if (rewardResizeObserver) {
      rewardResizeObserver.disconnect();
    }

    rewardResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.height) {
          heightRewards = entry.contentRect.height;
        }
      }
    });
    rewardResizeObserver.observe(rewardDiv);

    if (rewardDiv.clientHeight > toolOptions.rewardSize) {
      rewardDiv.style.height = `${toolOptions.rewardSize}px`;
    }
  }
}

export function showReward(reward) {
  if (!reward || typeof reward !== 'object') return;

  const rawName =
    reward.name ||
    reward.blueprint?.name ||
    reward.subType ||
    (reward.type === 'blueprint' ? 'Blueprint' : 'Reward');
  let name =
    typeof rawName === 'string' ? helper.fRewardShortName(rawName) : 'Reward';
  const qty = Number(reward.amount) || Number(reward.totalAmount) || 1;

  if (reward.source === 'guildExpedition') {
    if (!rewardsGE[name]) rewardsGE[name] = 0;
    rewardsGE[name] += qty;
    console.debug('rewardsGE:', rewardsGE, reward);
  } else if (reward.source === 'battlegrounds_conquest') {
    if (!rewardsGBG[name]) rewardsGBG[name] = 0;
    rewardsGBG[name] += qty;
    console.debug('rewardsGBG:', rewardsGBG, reward);
  } else if (
    reward.source === 'otherPlayer' ||
    reward.source === 'pickupProduction'
  ) {
    // reward already stored. so just show it
  } else {
    if (reward.type === 'resource') {
      name = helper.fResourceShortName(reward.subType) || name;
    } else if (
      reward.type === 'blueprint' ||
      reward.source === 'greatBuilding'
    ) {
      const gbKey =
        reward.subType ?
          typeof helper.fGBsname === 'function' ?
            helper.fGBsname(reward.subType)
          : reward.subType
        : '';
      if (gbKey && name && !name.toLowerCase().includes(gbKey.toLowerCase())) {
        name = `${gbKey} ${name}`;
      } else if (!name || name === 'Reward') {
        name = gbKey ? `${gbKey} BP` : 'Blueprint';
      }
      if (
        (reward.type === 'blueprint' ||
          (reward.source === 'greatBuilding' &&
            (reward.name || '').toLowerCase().includes('blueprint'))) &&
        !name.toLowerCase().includes('bp') &&
        !name.toLowerCase().includes('blueprint')
      ) {
        name = `${name} BP`;
      }
    }
    if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
    rewardsGeneric[name] += qty;
    console.debug('rewardsGeneric:', rewardsGeneric, reward);
  }

  var text = '';
  if (Object.keys(rewardsGE).length) {
    text += '<p><em>GE</em><br>';
    Object.keys(rewardsGE).forEach((item) => {
      text += `${rewardsGE[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGBG).length) {
    text += '<p><em>GBG</em><br>';
    Object.keys(rewardsGBG).forEach((item) => {
      text += `${rewardsGBG[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGeneric).length) {
    text += '<p><em>Event/City</em><br>';
    Object.keys(rewardsGeneric).forEach((item) => {
      text += `${rewardsGeneric[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsOtherPlayer).length) {
    text += '<p><em>Aid/Plunder</em><br>';
    Object.keys(rewardsOtherPlayer).forEach((item) => {
      text += `${rewardsOtherPlayer[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsCity).length) {
    text += '<p><em>City</em><br>';
    Object.keys(rewardsCity).forEach((item) => {
      text += `${rewardsCity[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsArmy).length) {
    text += '<p><em>Army</em><br>';
    Object.keys(rewardsArmy).forEach((item) => {
      text += `${rewardsArmy[item]} ${item}<br>`;
    });
    text += '</p>';
  }

  const container =
    (typeof document !== 'undefined' ?
      document.getElementById('cityrewards') ||
      document.getElementById('rewards')
    : null) || cityrewards;

  if (container) {
    container.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#rewardsText" aria-expanded="${!collapse.collapseRewards}" aria-controls="rewardsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	${element.close()}
	<div id="rewardsText" style="height: 400px" class="overflow resize collapse ${
    collapse.collapseRewards ? '' : 'show'
  }">${text}</div></div>`;
    rewardObserve();
    const rewardsLabel =
      document.getElementById('rewardsicon') ||
      document.getElementById('rewardsTextLabel');
    if (rewardsLabel) {
      rewardsLabel.addEventListener('click', collapse.fCollapseRewards);
    }
  }
}

export function showRewards(rewards) {
  var text = '';

  rewards.forEach((reward) => {
    var name = helper.fRewardShortName(reward.name);
    var qty = reward.amount;
    if (reward.source === 'autoAid') {
      if (reward.type === 'resource') {
        console.debug('autoAid:resource', reward.subType, qty, reward);
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      } else if (reward.type === 'blueprint') {
        console.debug(
          'autoAid:resource',
          helper.fGBsname(reward.subType) + ' ' + name,
          qty,
          reward,
        );
        const bpKey = helper.fGBsname(reward.subType) + ' ' + name;
        if (rewardsCity[bpKey]) rewardsCity[bpKey] += qty;
        else rewardsCity[bpKey] = qty;
      } else {
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      }
      console.debug('autoAid:', rewardsCity, reward);
    } else {
      if (reward.type === 'resource')
        name = helper.fResourceShortName(reward.subType);
      if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
      rewardsGeneric[name] += qty;
      console.debug('rewardsGeneric:', rewardsGeneric, reward);
    }
  });

  if (Object.keys(rewardsGE).length) {
    text += '<p><em>GE</em><br>';
    Object.keys(rewardsGE).forEach((item) => {
      text += `${rewardsGE[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGBG).length) {
    text += '<p><em>GBG</em><br>';
    Object.keys(rewardsGBG).forEach((item) => {
      text += `${rewardsGBG[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGeneric).length) {
    text += '<p><em>Event/City</em><br>';
    Object.keys(rewardsGeneric).forEach((item) => {
      text += `${rewardsGeneric[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsOtherPlayer).length) {
    text += '<p><em>Aid/Plunder</em><br>';
    Object.keys(rewardsOtherPlayer).forEach((item) => {
      text += `${rewardsOtherPlayer[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsCity).length) {
    text += '<p><em>City</em><br>';
    Object.keys(rewardsCity).forEach((item) => {
      text += `${rewardsCity[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsArmy).length) {
    text += '<p><em>Army</em><br>';
    Object.keys(rewardsArmy).forEach((item) => {
      text += `${rewardsArmy[item]} ${item}<br>`;
    });
    text += '</p>';
  }

  if (cityrewards) {
    cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<span data-i18n="reward"><strong>REWARDS:</strong></span></p>
	${element.close()}
	<div id="rewardsText" class="overflow resize collapse ${
    collapse.collapseRewards ? '' : 'show'
  }">${text}</div></div>`;
    rewardObserve();
    const rewardsLabel =
      document.getElementById('rewardsicon') ||
      document.getElementById('rewardsTextLabel');
    if (rewardsLabel) {
      rewardsLabel.addEventListener('click', collapse.fCollapseRewards);
    }
  }
}
