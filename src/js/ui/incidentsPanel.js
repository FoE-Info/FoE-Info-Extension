/**
 * incidentsPanel.js
 *
 * Renders the active incidents badge, countdown timers, and collapsible detail panel.
 * Modular UI component compatible with both Node test runners and Webpack extension builds.
 */

const INCIDENT_LOOKUP = {
  incident_fallen_tree_1x1: { type: 'r', text: 'Fallen Tree' },
  incident_fallen_tree_2x2: {
    type: '<strong>R</strong>',
    text: 'Fallen Tree 2x2',
  },
  incident_pothole_1x1: { type: 'r', text: 'Pothole' },
  incident_pothole_2x2: { type: '<strong>R</strong>', text: 'Pothole' },
  incident_blocked_road_1x1: { type: 'r', text: 'Road' },
  incident_blocked_road_2x2: {
    type: '<strong>R</strong>',
    text: 'Blocked Road',
  },
  incident_dinosaur_bones: {
    type: '<strong>N</strong>',
    text: 'Dinosaur Bones',
  },
  incident_statue: { type: '<strong>N</strong>', text: 'Statue' },
  incident_fruit_vendor: { type: 'n', text: 'Fruit Vendor' },
  incident_treasure_chest: { type: 'n', text: 'Treasure Chest' },
  incident_overgrowth: { type: 'n', text: 'Overgrowth' },
  incident_clothesline: { type: 'n', text: 'Clothesline' },
  incident_beehive: { type: 'n', text: 'Beehive' },
  incident_broken_cart: { type: 'n', text: 'Broken Cart' },
  incident_musician: { type: 'n', text: 'Musician' },
  incident_kite: { type: 'n', text: 'Kite' },
  incident_sculptor: { type: '<strong>N</strong>', text: 'Sculptor' },
  incident_stick_hut: { type: '<strong>N</strong>', text: 'Stick Hut' },
  incident_wine_cask: { type: '<strong>N</strong>', text: 'Wine Cask' },
  incident_mammoth_bones: { type: '<strong>N</strong>', text: 'Mammoth Bones' },
  incident_crates: { type: 'n', text: 'Crates' },
  incident_flotsam: { type: 's', text: 'Flotsam' },
  incident_shipwreck: { type: '<strong>S</strong>', text: 'Shipwreck' },
  incident_sos: { type: 's', text: 'SOS' },
  incident_fisherman: { type: 'w', text: 'Fisherman' },
  incident_castaway: { type: 'w', text: 'Castaway' },
  incident_rhino: { type: '<strong>W</strong>', text: 'Rhino' },
  spring_cherry_tree: {
    type: "<span class='green'>E</span>",
    text: 'Cherry Tree',
  },
  incident_car_accident: { type: '<strong>R</strong>', text: 'Car Accident' },
  fall_apple_tree: { type: "<span class='green'>E</span>", text: 'Apple Tree' },
  incident_quicksand: { type: 'n', text: 'Quicksand' },
  incident_beach_gear: { type: 's', text: 'Beach Gear' },
  incident_floating_chest: { type: 'w', text: 'Floating Chest' },
  incident_chest: { type: '<strong>N</strong>', text: 'Chest' },
  incident_hero: { type: '<strong>E</strong>', text: 'Travel Rations' },
};

function renderCollapseIcon(id, target, isCollapsed) {
  return `<span class="header-icon collapse-toggle fw-bold font-monospace" id="${id}" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="${target}" data-bs-target="#${target}" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;
}

function renderCloseButton() {
  return '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
}

/**
 * Maps an incident type string to its symbol and human-readable label.
 * @param {string} incidentName - Raw incident type ID from game RPC.
 * @returns {{ type: string, text: string }} Incident display descriptor.
 */
function fIncidentName(incidentName) {
  if (!incidentName) return { type: '?', text: '' };
  if (INCIDENT_LOOKUP[incidentName]) {
    return { ...INCIDENT_LOOKUP[incidentName] };
  }
  if (
    typeof incidentName === 'string' &&
    incidentName.includes('ages_birthday_gift')
  ) {
    return { type: "<span class='green'>E</span>", text: 'Paper Money' };
  }
  return { type: '?', text: incidentName };
}

/**
 * Builds the inner tooltip/collapse body HTML for active and coming incidents.
 * @param {string} textCurrent - HTML string for active incidents.
 * @param {string} [textComing=''] - HTML string for coming incidents.
 * @returns {string} Formatted HTML string.
 */
function buildIncidentTooltip(textCurrent, textComing = '') {
  let tooltipHTML = `<div><p>${textCurrent}</p>${
    textComing !== '' ?
      '<p><strong>Coming Soon:</strong><br>' + textComing + '</p>'
    : ''
  }`;
  tooltipHTML +=
    '<p><strong>Legend:</strong><br>n/N - Nature<br>s/S - Shore<br>w/W - Water<br>r/R - Road<br> E - Event<br>Capitals = Uncommon/Rare Reward</p></div>';
  return tooltipHTML;
}

/**
 * Builds the complete alert and collapse container HTML for the incidents panel.
 * @param {object} params
 * @param {string} params.type - Incident type abbreviation badges.
 * @param {string} params.tooltipHTML - Formatted tooltip content.
 * @param {boolean} [params.isCollapsed=true] - Whether section is collapsed.
 * @returns {string} Rendered markup.
 */
function buildIncidentMarkup({ type, tooltipHTML, isCollapsed = true }) {
  return `<div id="incidentsTip" class="alert alert-light alert-dismissible show collapsed" role="alert">
            <p id="incidentsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#incidentsText" aria-expanded="${!isCollapsed}" aria-controls="incidentsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
			${renderCollapseIcon('incidentsicon', 'incidentsText', isCollapsed)}
			<strong><span data-i18n="incident">Incidents</span>:</strong> ${type}</p>
            ${renderCloseButton()}
            <div id="incidentsText" class="collapse ${isCollapsed ? '' : 'show'} alert-light">
            ${tooltipHTML}</div></div>`;
}

/**
 * Renders the incidents panel badge and collapse dropdown into the DOM.
 * @param {HTMLElement|null} [incidentsTarget=null] - Optional target container.
 * @param {object} [context={}] - Optional injected runtime state and callbacks.
 */
function fShowIncidents(incidentsTarget = null, context = {}) {
  const targetIncidents =
    incidentsTarget ||
    (typeof document !== 'undefined' ?
      document.getElementById('incidents')
    : null);

  const opts =
    context.showOptions ||
    (typeof window !== 'undefined' ? window.showOptions : null);
  const rewardsList =
    context.hiddenRewards ||
    (typeof window !== 'undefined' ? window.hiddenRewards : []);
  const isCollapsed =
    context.collapseIncidents ??
    (typeof window !== 'undefined' ? window.collapseIncidents : true);
  const onToggleCollapse =
    context.fCollapseIncidents ||
    (typeof window !== 'undefined' ? window.fCollapseIncidents : null);

  let rewards = 0;
  let type = '';
  let textCurrent = '';
  let textComing = '';

  if (opts && opts.showIncidents && rewardsList && rewardsList.length) {
    const nowSec = Date.now() / 1000;
    for (let j = 0; j < rewardsList.length; j++) {
      const incident = rewardsList[j];
      if (!incident || !incident.position) continue;
      if (incident.position.context === 'guildExpedition') continue;

      const incidentName = fIncidentName(incident.type);
      if (incidentName.type === '?') {
        console.debug(incident);
      }

      const start = new Date(incident.startTime).getTime() / 1000 - nowSec;
      const finish = new Date(incident.expireTime).getTime() / 1000 - nowSec;
      const diff = Math.abs(start < 0 ? start : finish);

      const hours = Math.floor(diff / 3600) % 24;
      const minutes = Math.floor(diff / 60) % 60;
      const seconds = Math.floor(diff) % 60;
      const diffText = `${hours}:${minutes}:${seconds}`;

      if (start < 0) {
        rewards++;
        type += incidentName.type;
        textCurrent += `${incidentName.text} for ${diffText}<br>`;
      } else {
        textComing += `${incidentName.text} in ${diffText}<br>`;
      }
    }

    if (!targetIncidents) return;

    if (rewards) {
      const tooltipHTML = buildIncidentTooltip(textCurrent, textComing);
      targetIncidents.innerHTML = buildIncidentMarkup({
        type,
        tooltipHTML,
        isCollapsed,
      });

      if (typeof document !== 'undefined') {
        const iconEl = document.getElementById('incidentsicon');
        if (
          iconEl &&
          onToggleCollapse &&
          typeof iconEl.addEventListener === 'function'
        ) {
          iconEl.addEventListener('click', onToggleCollapse);
        }
      }
    } else {
      targetIncidents.innerHTML = '';
    }
  }
}

module.exports = {
  INCIDENT_LOOKUP,
  fIncidentName,
  buildIncidentTooltip,
  buildIncidentMarkup,
  fShowIncidents,
  renderIncidentsPanel: fShowIncidents,
};
