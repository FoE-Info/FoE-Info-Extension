/** Global runtime options and per-panel size accessors. */
import * as storage from './storage.js';

export var toolOptions = {
  armySize: 185,
  goodsSize: 200,
  friendsSize: 200,
  treasurySize: 200,
  logsSize: 200,
  battlegroundsSize: 480,
  expeditionSize: 200,
  visitSize: 200,
  rewardSize: 200,
  buildingCostSize: 200,
  minSize: 50,
};

export function setToolOptions(value) {
  if (value && typeof value === 'object') {
    toolOptions = Object.assign({}, toolOptions, value);
  }
}

function saveSize(key, height) {
  const min = toolOptions?.minSize ?? 50;
  if (height > min) {
    if (!toolOptions) toolOptions = {};
    toolOptions[key] = Math.round(height);
    storage.set('toolOptions', toolOptions);
  }
}

export function setFriendsSize(height) {
  saveSize('friendsSize', height);
}

export function setArmySize(height) {
  saveSize('armySize', height);
}

export function setGoodsSize(height) {
  saveSize('goodsSize', height);
}

export function setTreasurySize(height) {
  saveSize('treasurySize', height);
}

export function setLogsSize(height) {
  saveSize('logsSize', height);
}

export function setBattlegroundSize(height) {
  saveSize('battlegroundsSize', height);
}

export function setExpeditionSize(height) {
  saveSize('expeditionSize', height);
}

export function setVisitSize(height) {
  saveSize('visitSize', height);
}

export function setRewardSize(height) {
  saveSize('rewardSize', height);
}

export function setBuildingCostSize(height) {
  saveSize('buildingCostSize', height);
}
