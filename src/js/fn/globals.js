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
import * as storage from './storage.js';

export var toolOptions = {
  armySize: 200,
  goodsSize: 200,
  friendsSize: 200,
  treasurySize: 200,
  gvgSize: 200,
  logsSize: 200,
  battlegroundsSize: 200,
  expeditionSize: 200,
  visitSize: 200,
  rewardSize: 200,
  buildingCostSize: 200,
  minSize: 50,
};

export function setToolOptions(value) {
  toolOptions = value;
}

export function setFriendsSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.friendsSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setArmySize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.armySize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setGoodsSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.goodsSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setTreasurySize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.treasurySize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setGVGSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.gvgSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setLogsSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.logsSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setBattlegroundSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.battlegroundsSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setExpeditionSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.expeditionSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setVisitSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.visitSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setRewardSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.rewardSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setBuildingCostSize(height) {
  if (height > toolOptions.minSize) {
    toolOptions.buildingCostSize = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}
