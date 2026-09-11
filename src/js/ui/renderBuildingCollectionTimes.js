/**
 * renderBuildingCollectionTimes.js
 *
 * Renders the Building Collection Times alert panel in the DevTools UI.
 * Decoupled from StartupService monolith.
 * Dual CJS/ESM compatible.
 */

let defaultShowOptions = null;
try {
  defaultShowOptions = require('../vars/showOptions.js').showOptions;
} catch {}

let defaultCollapse = null;
try {
  defaultCollapse = require('../fn/collapse.js');
} catch {}

let defaultFormatDateTime = (ts) => (ts ? String(ts) : '');
try {
  ({ formatDateTime: defaultFormatDateTime } = require('../utils/date.js'));
} catch {}

let defaultElement = null;
try {
  defaultElement = require('./AddElement.js');
} catch {}

let defaultHelper = null;
try {
  defaultHelper = require('../fn/helper.js');
} catch {}

function renderBuildingCollectionTimes({
  buildingsReady = [],
  epocTime,
  showOptions = defaultShowOptions,
  helper = defaultHelper,
  element = defaultElement,
  collapse = defaultCollapse,
  formatDateTime = defaultFormatDateTime,
} = {}) {
  if (showOptions && showOptions.collectionTimes === false) return;
  if (!buildingsReady || !buildingsReady.length) return;
  const buildings =
    typeof document !== 'undefined' ?
      document.getElementById('buildings')
    : null;
  if (!buildings) return;

  const sortedReady = [...buildingsReady].sort((a, b) => a.ready - b.ready);

  const isCollapsed = collapse?.collapseBuildings ?? false;
  const iconHtml =
    element?.icon ? element.icon('buildingsicon', 'buildingsText', isCollapsed)
    : isCollapsed ? '[+]'
    : '[-]';
  const closeHtml = element?.close ? element.close() : '';

  let buildingsHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="buildingsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#buildingsText" aria-expanded="${!isCollapsed}" aria-controls="buildingsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
    ${iconHtml}
      <strong><span data-i18n="collection">Building Collection Times</span>:</strong></p>`;
  buildingsHTML += closeHtml;
  buildingsHTML += `<div id="buildingsText" class="resize collapse ${isCollapsed ? '' : 'show'}">`;

  const minValidEpoch = Math.max(
    1000000000,
    epocTime && epocTime > 1000000000 ?
      epocTime
    : Math.floor(Date.now() / 1000),
  );

  sortedReady.forEach((entry) => {
    if (entry.ready > minValidEpoch) {
      const displayName =
        (helper?.fEntityNameTrim &&
          helper.fEntityNameTrim(entry.id || entry.name)) ||
        entry.name ||
        entry.id;
      buildingsHTML += `${displayName}: ${formatDateTime(entry.ready)}<br>`;
    }
  });

  buildings.innerHTML = buildingsHTML + `</p></div></div>`;
  const labelEl = document.getElementById('buildingsTextLabel');
  if (labelEl && collapse?.fCollapseBuildings) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#buildingsicon')
      ) {
        return;
      }
      collapse.fCollapseBuildings();
    });
  }
  const iconEl = document.getElementById('buildingsicon');
  if (iconEl && iconEl !== labelEl && collapse?.fCollapseBuildings) {
    iconEl.addEventListener('click', () => {
      collapse.fCollapseBuildings();
    });
  }
}

module.exports = {
  renderBuildingCollectionTimes,
};
module.exports.default = module.exports;
module.exports.renderBuildingCollectionTimes = renderBuildingCollectionTimes;
