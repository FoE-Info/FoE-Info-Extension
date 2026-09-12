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
  rewardsGeneric,
} from '../state/state.js';
import { translateContainer } from '../utils/i18n.js';
import { createLogger } from '../utils/logger.js';
import * as element from './AddElement.js';
import { addToBucket } from './rewardCategories.js';

const logger = createLogger('RewardRenderer');

let rewardResizeObserver = null;
let heightRewards = toolOptions.rewardSize;

function setHeight() {
  logger.debug('mouseup', heightRewards);
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

function buildRewardsText() {
  let text = '';
  if (Object.keys(rewardsGeneric).length) {
    text += '<p><em>Event/City</em><br>';
    Object.keys(rewardsGeneric).forEach((item) => {
      text += `${rewardsGeneric[item]} ${item}<br>`;
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
  return text;
}

function renderRewards() {
  const container =
    (typeof document !== 'undefined' ?
      document.getElementById('cityrewards') ||
      document.getElementById('rewards')
    : null) || cityrewards;

  if (!container) return;

  const text = buildRewardsText();
  container.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#rewardsText" aria-expanded="${!collapse.collapseRewards}" aria-controls="rewardsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	${element.close()}
	<div id="rewardsText" style="height: 400px" class="overflow resize collapse ${
    collapse.collapseRewards ? '' : 'show'
  }">${text}</div></div>`;
  rewardObserve();
  const labelEl = document.getElementById('rewardsTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#rewardsicon')
      ) {
        return;
      }
      collapse.fCollapseRewards();
    });
  }
  const iconEl = document.getElementById('rewardsicon');
  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      collapse.fCollapseRewards();
    });
  }
}

/**
 * Single authority for reward categorization and rendering.
 *
 * @param {string} source Explicit reward source, e.g. 'greatBuilding',
 *   'quest', 'cityProductionArmy', or 'cityProductionCity'.
 * @param {object} payload Reward item carrying name/subType/amount/type.
 */
export function showReward(source, payload) {
  if (!payload || typeof payload !== 'object') {
    logger.debug('showReward ignored invalid payload', source);
    return;
  }

  const rawName =
    payload.name ||
    payload.blueprint?.name ||
    payload.subType ||
    (payload.type === 'blueprint' ? 'Blueprint' : 'Reward');
  let name =
    typeof rawName === 'string' ? helper.fRewardShortName(rawName) : 'Reward';
  const qty = Number(payload.amount) || Number(payload.totalAmount) || 1;

  if (payload.type === 'resource') {
    name = helper.fResourceShortName(payload.subType) || name;
  } else if (payload.type === 'blueprint' || source === 'greatBuilding') {
    const gbKey =
      payload.subType ?
        typeof helper.fGBsname === 'function' ?
          helper.fGBsname(payload.subType)
        : payload.subType
      : '';
    if (gbKey && name && !name.toLowerCase().includes(gbKey.toLowerCase())) {
      name = `${gbKey} ${name}`;
    } else if (!name || name === 'Reward') {
      name = gbKey ? `${gbKey} BP` : 'Blueprint';
    }
    if (
      (payload.type === 'blueprint' ||
        (source === 'greatBuilding' &&
          (payload.name || '').toLowerCase().includes('blueprint'))) &&
      !name.toLowerCase().includes('bp') &&
      !name.toLowerCase().includes('blueprint')
    ) {
      name = `${name} BP`;
    }
  }

  const bucketKey = addToBucket(
    { rewardsGeneric, rewardsCity, rewardsArmy },
    source,
    name,
    qty,
  );
  if (!bucketKey) {
    logger.warn('showReward unknown reward source', source);
    return;
  }

  logger.debug('reward routed', source, '->', bucketKey, name, qty);
  renderRewards();
}
