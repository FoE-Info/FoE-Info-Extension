/**
 * galaxyBuildingGrouper.js
 *
 * Grouping and building list HTML formatting for the Blue Galaxy panel.
 * Dual CJS/ESM compatible.
 */

const { formatTime } = require('../utils/date.js');

/**
 * Groups buildings by name, FP amount, ready status, and debug timer.
 *
 * @param {Array<Object>} buildings - Array of candidate building objects.
 * @param {boolean} [isDebug=false] - Whether debug mode is active.
 * @returns {Array<Object>} Array of grouped building descriptors.
 */
function groupGalaxyBuildings(buildings, isDebug = false) {
  if (!Array.isArray(buildings) || buildings.length === 0) return [];

  const groups = [];
  for (const item of buildings) {
    const timerStr =
      isDebug ?
        item.transition && item.transition <= 2000000000 ?
          formatTime(item.transition)
        : 'READY'
      : '';
    const isReady = Boolean(item.isReady);
    const key = `${item.name}|${item.fp}|${isReady}|${timerStr}`;

    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({
        key,
        count: 1,
        name: item.name,
        fp: item.fp,
        isReady,
        timerStr,
      });
    }
  }
  return groups;
}

/**
 * Renders HTML markup for the grouped Galaxy buildings.
 *
 * @param {Array<Object>} groupedBuildings - Grouped buildings from groupGalaxyBuildings.
 * @param {boolean} [isDebug=false] - Whether debug mode is active.
 * @returns {string} HTML markup string.
 */
function renderGalaxyBuildingList(groupedBuildings, isDebug = false) {
  if (!Array.isArray(groupedBuildings) || groupedBuildings.length === 0) {
    return '<p class="text-muted mb-0">No ready buildings with FP production</p>';
  }

  let buildingsHtml = '<p class="mb-0">';
  for (const group of groupedBuildings) {
    if (isDebug) {
      buildingsHtml += `${group.count}x ${group.fp}FP ${group.name} [${group.isReady ? 'READY' : group.timerStr}]<br>`;
    } else {
      buildingsHtml += `${group.count}x ${group.fp}FP ${group.name}<br>`;
    }
  }
  buildingsHtml += '</p>';
  return buildingsHtml;
}

module.exports = {
  groupGalaxyBuildings,
  renderGalaxyBuildingList,
};
module.exports.default = module.exports;
