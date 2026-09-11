/**
 * gbgProvinceView.js
 *
 * Presentation and DOM card rendering for Guild Battleground province
 * target generation, building costs table, and leaderboard views.
 */

async function copyToClipboard(element) {
  const el =
    typeof element === 'string' && typeof document !== 'undefined' ?
      document.querySelector(element)
    : element;
  if (!el) return;
  const clone = el.cloneNode(true);
  const spans = clone.querySelectorAll ? clone.querySelectorAll('span') : [];
  spans.forEach((span) => {
    while (span.firstChild) {
      span.parentNode.insertBefore(span.firstChild, span);
    }
    span.remove();
  });
  let html = clone.innerHTML || '';
  html = html.replace(/<\/?p[^>]*>/g, '').replace(/<br\s*\/?>/gi, '\r\n');

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(html);
    } else if (typeof document !== 'undefined') {
      const temp = document.createElement('textarea');
      document.body.appendChild(temp);
      temp.value = html;
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
  } catch (err) {
    console.error('GBG copy failed:', err);
  }
}

function buildingCostCopy() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      const copytext = document.getElementById('buildingCostText');
      if (copytext) {
        range.selectNode(copytext);
        selection.addRange(range);
        document.execCommand('copy');
      }
    }
  } catch (err) {
    console.error('Building cost copy failed:', err);
  }
}

function targetCopy() {
  copyToClipboard('#targetGenText');
  if (typeof document !== 'undefined') {
    const el = document.getElementById('targetGenText');
    if (el) console.debug(el.innerHTML);
  }
}

function buildTargetGeneratorMarkup({
  targetsHTML = '',
  textProvinceUnlocked = '',
  textProvinceLocked = '',
  collapse = {},
} = {}) {
  const isShow = collapse?.collapseTargetGen === false ? 'show' : '';
  const separator = textProvinceUnlocked !== '' ? '<br>' : '';
  return (
    targetsHTML +
    `<div id="targetGenCollapse" class="collapse ${isShow}"><p id="targetGenText">` +
    textProvinceUnlocked +
    separator +
    textProvinceLocked +
    `</p></div>`
  );
}

function renderTargetGeneratorCard({
  targetGenerator,
  targetsHTML = '',
  textProvinceUnlocked = '',
  textProvinceLocked = '',
  collapse = {},
  targetCopy: onTargetCopy = targetCopy,
  targetPost: onTargetPost = null,
  Tooltip = null,
  helper = {},
  url = {},
  post_webstore = {},
} = {}) {
  if (textProvinceUnlocked || textProvinceLocked) {
    const markup = buildTargetGeneratorMarkup({
      targetsHTML,
      textProvinceUnlocked,
      textProvinceLocked,
      collapse,
    });

    if (targetGenerator) {
      targetGenerator.innerHTML = markup;
    }

    if (typeof document !== 'undefined') {
      const copyBtn = document.getElementById('targetCopyID');
      if (copyBtn && typeof onTargetCopy === 'function') {
        copyBtn.addEventListener('click', onTargetCopy);
      }

      const postBtn = document.getElementById('targetGenPostID');
      const postHandler =
        typeof onTargetPost === 'function' ? onTargetPost
        : typeof post_webstore?.postTargetGenToDiscord === 'function' ?
          post_webstore.postTargetGenToDiscord
        : typeof post_webstore?.postTargetsToDiscord === 'function' ?
          post_webstore.postTargetsToDiscord
        : null;
      if (postBtn && postHandler) {
        postBtn.addEventListener('click', postHandler);
      }

      const labelEl = document.getElementById('targetGenLabel');
      if (labelEl && typeof collapse?.fCollapseTargetGen === 'function') {
        labelEl.addEventListener('click', (e) => {
          if (
            e?.target &&
            typeof e.target.closest === 'function' &&
            e.target.closest('#targetGenicon')
          ) {
            return;
          }
          collapse.fCollapseTargetGen();
        });
      }
      const iconEl = document.getElementById('targetGenicon');
      if (
        iconEl &&
        iconEl !== labelEl &&
        typeof collapse?.fCollapseTargetGen === 'function'
      ) {
        iconEl.addEventListener('click', () => {
          collapse.fCollapseTargetGen();
        });
      }

      const siegecamp_tooltip = document.getElementById('siegecamp_tooltip');
      if (siegecamp_tooltip && typeof Tooltip === 'function') {
        try {
          new Tooltip(siegecamp_tooltip, {
            html: true,
            delay: { show: 200, hide: 500 },
          });
        } catch (e) {}
      }
    }

    return markup;
  } else {
    if (targetGenerator) {
      targetGenerator.innerHTML = '';
    }
    return '';
  }
}

function buildBuildingCostsTableHTML({
  map = [],
  ProvinceDefs = [],
  mapName = '',
  BuildingDefs = {},
  helper = {},
} = {}) {
  let costsHTML = '';
  const activeProvinces = (map || []).filter(
    (p) => p && p.availableBuildings != null,
  );
  activeProvinces.forEach((province) => {
    const costs = province.availableBuildings || [];
    const slots = province.totalBuildingSlots;
    const def = (ProvinceDefs || []).find((d) => d.id == province.id);
    const rawName = ((def && def.name) || '').split(' ');
    let name0 = rawName[0] || '';
    let name1 = rawName[1] || '';

    if (mapName === 'waterfall') {
      name1 = '';
      name0 = name0.substr(0, 3);
    } else {
      name1 = name1.charAt(0);
      name0 = name0.substr(0, 2);
    }

    costsHTML += `<tr><th>${name0 + name1}${
      slots ? ' [' + slots + ']' : ''
    }</th><th>Resource 1</th><th>Qty</th><th>Resource 2</th><th>Qty</th><th>Resource 3</th><th>Qty</th></tr>`;
    costs.forEach((building) => {
      const bName =
        BuildingDefs && BuildingDefs[building.buildingId]?.name ?
          BuildingDefs[building.buildingId].name
        : building.buildingId;
      costsHTML += `<tr><td>${bName}</td>`;
      const resources = building.costs?.resources || {};
      Object.keys(resources).forEach((resource) => {
        const resLabel =
          typeof helper?.fResourceShortName === 'function' ?
            helper.fResourceShortName(resource)
          : resource;
        costsHTML += `<td>${resLabel}</td><td>${resources[resource]}</td>`;
      });
      costsHTML += `</tr>`;
    });
  });
  return costsHTML;
}

const buildProvinceTableHTML = buildBuildingCostsTableHTML;

function buildBuildingCostCardHTML({
  costsHTML = '',
  collapse = {},
  toolOptions = {},
  element = {},
} = {}) {
  const closeBtn = typeof element?.close === 'function' ? element.close() : '';
  const iconMarkup =
    typeof element?.icon === 'function' ?
      element.icon(
        'buildingCosticon',
        'buildingCostText',
        collapse?.collapseBuildingCost,
      )
    : '';
  const copyBtn =
    typeof element?.copy === 'function' ?
      element.copy(
        'buildingCostID',
        'primary',
        'right',
        collapse?.collapseBuildingCost,
      )
    : '';
  const isShow = collapse?.collapseBuildingCost === false ? 'show' : '';
  const height = toolOptions?.buildingCostSize || 100;

  return (
    `<div class="alert alert-info alert-dismissible  show collapsed" role="alert">
    ${closeBtn}
    <p id="buildingCostTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#buildingCostText" aria-expanded="${!collapse?.collapseBuildingCost}" aria-controls="buildingCostText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconMarkup}
    <strong>GBG Building Costs:</strong></p>` +
    copyBtn +
    `<table style="height: ${height}px"  id="buildingCostText" class="overflow-y table collapse ${isShow}">` +
    costsHTML +
    `</table></div>`
  );
}

function renderBuildingCostCard({
  costsDiv,
  costsHTML = '',
  collapse = {},
  buildingCostCopy: onBuildingCostCopy = buildingCostCopy,
  toolOptions = {},
  setBuildingCostSize = null,
  helper = {},
  element = {},
  ResizeObserverClass = null,
} = {}) {
  const cardHTML = buildBuildingCostCardHTML({
    costsHTML,
    collapse,
    toolOptions,
    element,
  });

  if (costsDiv) {
    costsDiv.innerHTML = cardHTML;
  }

  if (typeof document !== 'undefined') {
    const copyBtn = document.getElementById('buildingCostID');
    if (copyBtn && typeof onBuildingCostCopy === 'function') {
      copyBtn.addEventListener('click', onBuildingCostCopy);
    }

    const labelEl = document.getElementById('buildingCostTextLabel');
    if (labelEl && typeof collapse?.fCollapseBuildingCost === 'function') {
      labelEl.addEventListener('click', (e) => {
        if (
          e?.target &&
          typeof e.target.closest === 'function' &&
          (e.target.closest('#buildingCosticon') ||
            e.target.closest('#buildingCostIcon'))
        ) {
          return;
        }
        collapse.fCollapseBuildingCost();
      });
    }
    const icon1 = document.getElementById('buildingCostIcon');
    if (
      icon1 &&
      icon1 !== labelEl &&
      typeof collapse?.fCollapseBuildingCost === 'function'
    ) {
      icon1.addEventListener('click', () => {
        collapse.fCollapseBuildingCost();
      });
    }
    const icon2 = document.getElementById('buildingCosticon');
    if (
      icon2 &&
      icon2 !== labelEl &&
      icon2 !== icon1 &&
      typeof collapse?.fCollapseBuildingCost === 'function'
    ) {
      icon2.addEventListener('click', () => {
        collapse.fCollapseBuildingCost();
      });
    }
  }

  const RO =
    ResizeObserverClass ||
    (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);
  if (RO && costsDiv) {
    try {
      const resizeObserver = new RO((entries) => {
        for (const entry of entries) {
          if (
            entry?.contentRect?.height &&
            typeof setBuildingCostSize === 'function'
          ) {
            setBuildingCostSize(entry.contentRect.height);
          }
        }
      });
      resizeObserver.observe(costsDiv);
    } catch (e) {}
  }

  if (costsDiv && typeof helper?.translateContainer === 'function') {
    helper.translateContainer(costsDiv);
  }

  return cardHTML;
}

function buildLeaderboardHTML(leaderboard = []) {
  let leaderboardHTML = `<tr><th class="text-start">Guild</th><th class="text-center">VP/hr</th><th class="text-center">Total VP</th></tr>`;
  (leaderboard || []).forEach((guild) => {
    const name = guild?.clan?.name || '';
    const vpHourly = Number(guild?.victoryPointsHourly || 0).toLocaleString();
    const vpTotal = Number(guild?.victoryPointsTotal || 0).toLocaleString();
    leaderboardHTML += `<tr><td class="text-start">${name}</td><td class="text-center tabular-nums">${vpHourly}</td><td class="text-center tabular-nums">${vpTotal}</td></tr>`;
  });
  return leaderboardHTML;
}

module.exports = {
  renderTargetGeneratorCard,
  renderBuildingCostCard,
  buildProvinceTableHTML,
  buildBuildingCostsTableHTML,
  buildLeaderboardHTML,
  buildTargetGeneratorMarkup,
  buildBuildingCostCardHTML,
  copyToClipboard,
  buildingCostCopy,
  targetCopy,
};
module.exports.default = module.exports;
