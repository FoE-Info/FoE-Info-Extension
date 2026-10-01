/** Global runtime options and per-panel size accessors. */
import * as storage from './storage.js';

export let toolOptions = {
  armySize: 185,
  goodsSize: 290,
  friendsSize: 200,
  treasurySize: 200,
  logsSize: 200,
  battlegroundsSize: 480,
  expeditionSize: 200,
  visitSize: 200,
  rewardSize: 200,
  rewardSizeMode: 'auto',
  buildingCostSize: 200,
  minSize: 50,
};

export function setToolOptions(value) {
  if (value && typeof value === 'object') {
    const hasRewardMode = Object.hasOwn(value, 'rewardSizeMode');
    const hasLegacyRewardSize = Object.hasOwn(value, 'rewardSize');
    const legacyRewardSize = Number(value.rewardSize);
    toolOptions = Object.assign({}, toolOptions, value);
    if (!hasRewardMode && hasLegacyRewardSize) {
      // Earlier defaults used 200px. Preserve non-default custom sizes while
      // treating that legacy default as content-sized until explicitly resized.
      toolOptions.rewardSizeMode =
        (
          Number.isFinite(legacyRewardSize) &&
          legacyRewardSize > (toolOptions.minSize ?? 50) &&
          legacyRewardSize !== 200
        ) ?
          'fixed'
        : 'auto';
    }
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
  if (height > (toolOptions?.minSize ?? 50)) {
    toolOptions.rewardSizeMode = 'fixed';
  }
  saveSize('rewardSize', height);
}

export function setBuildingCostSize(height) {
  saveSize('buildingCostSize', height);
}

export function setPanelSize(id, height) {
  if (
    typeof id !== 'string' ||
    !id ||
    !Number.isFinite(height) ||
    height < (toolOptions.minSize ?? 50)
  )
    return;
  toolOptions.panelHeights = {
    ...toolOptions.panelHeights,
    [id]: Math.round(height),
  };
  storage.set('toolOptions', toolOptions);
}
