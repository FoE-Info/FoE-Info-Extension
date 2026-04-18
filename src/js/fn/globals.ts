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
import * as storage from './storage';

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

export function setToolOptions(value: typeof toolOptions) {
  toolOptions = value;
}

export function setFriendsSize(height: number) {
  if (height > toolOptions.minSize) {
    // console.debug('setFriendsSize',height,toolOptions);
    toolOptions.friendsSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setArmySize(height: number) {
  // 'armySize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.armySize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setGoodsSize(height: number) {
  // 'armySize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.goodsSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setTreasurySize(height: number) {
  // 'treasurySize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.treasurySize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setGVGSize(height: number) {
  // 'gvgSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.gvgSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setLogsSize(height: number) {
  // 'logsSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.logsSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setBattlegroundSize(height: number) {
  // 'battlegroundsSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.battlegroundsSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setExpeditionSize(height: number) {
  // 'expeditionSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.expeditionSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setVisitSize(height: number) {
  // 'visitSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.visitSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setRewardSize(height: number) {
  // 'rewardSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.rewardSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}

export function setBuildingCostSize(height: number) {
  // 'rewardSize': 200,
  if (height > toolOptions.minSize) {
    toolOptions.buildingCostSize = height > 500 ? 500 : height;
    storage.set('toolOptions', toolOptions);
  }
}
