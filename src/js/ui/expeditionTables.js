/**
 * expeditionTables.js
 *
 * DOM table and card generation for Guild Expedition leaderboard
 * and International Guild Expedition rankings.
 */

const expeditionParser = require('../parsers/expeditionParser.js');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapChampionshipCard(tableHtml, collapse = false, size = 200) {
  return `<div id="geChampionshipCard" class="alert alert-info alert-dismissible show collapsed mb-2" role="status" aria-live="polite">
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
<p id="geChampionshipLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#geChampionshipText" aria-expanded="${!collapse}" aria-controls="geChampionshipText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
<span class="header-icon collapse-toggle fw-bold font-monospace" id="geChampionshipIcon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="geChampionshipText" data-bs-target="#geChampionshipText" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>
<strong><span data-i18n="ge_championship">GE Championship</span>:</strong></p>
<span id="geChampionshipCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" data-i18n="copy">Copy</span>
<div id="geChampionshipText" style="height: ${size}px" class="alert-info overflow resize collapse ${collapse ? '' : 'show'}">
${tableHtml}
</div></div>`;
}

function wrapContributionCard(tableHtml, collapse = false, size = 200) {
  return `<div id="geContributionCard" class="alert alert-info alert-dismissible show collapsed mb-2" role="status" aria-live="polite">
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
<p id="geContributionLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#geContributionText" aria-expanded="${!collapse}" aria-controls="geContributionText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
<span class="header-icon collapse-toggle fw-bold font-monospace" id="geContributionIcon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="geContributionText" data-bs-target="#geContributionText" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>
<strong><span data-i18n="ge_member_contributions">GE Leaderboard</span>:</strong></p>
<span id="geContributionCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" data-i18n="copy">Copy</span>
<div id="geContributionText" style="height: ${size}px" class="alert-info overflow resize collapse ${collapse ? '' : 'show'}">
${tableHtml}
</div></div>`;
}

function wrapExpeditionCard(tableHtml, collapse = false, size = 200) {
  if (
    tableHtml &&
    (tableHtml.includes('geChampionshipCard') ||
      tableHtml.includes('geContributionCard'))
  ) {
    return tableHtml;
  }
  return wrapContributionCard(tableHtml, collapse, size);
}

function buildSubpanel(prefix, titleKey, defaultTitle, tableHtml) {
  if (prefix === 'International') {
    return `<div id="geInternationalSection">${wrapChampionshipCard(tableHtml)}</div>`;
  }
  if (prefix === 'Contribution') {
    return `<div id="geContributionSection">${wrapContributionCard(tableHtml)}</div>`;
  }
  return `<div id="ge${prefix}Section" class="mb-2">
<p class="mb-1 fw-bold cursor-pointer user-select-none" id="ge${prefix}Toggle" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#ge${prefix}Collapse" aria-expanded="true" aria-controls="ge${prefix}Collapse" style="cursor: pointer; user-select: none;">
<span class="header-icon collapse-toggle fw-bold font-monospace" id="ge${prefix}Icon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="true" aria-controls="ge${prefix}Collapse" data-bs-target="#ge${prefix}Collapse" data-bs-toggle="collapse">[-]</span>
<span data-i18n="${titleKey}">${defaultTitle}</span>
</p>
<div id="ge${prefix}Collapse" class="collapse show resize">
${tableHtml}
</div></div>`;
}

function buildContributionTable(entries = [], extractTrialLevel) {
  const rows = entries
    .filter(Boolean)
    .map((e) => {
      const name = escapeHtml(e.player?.name || e.name || 'Unknown');
      const trial = extractTrialLevel ? extractTrialLevel(e) : 1;
      const solved = Number(e.solvedEncounters || 0).toLocaleString();
      const pts = Number(e.expeditionPoints || 0).toLocaleString();
      return `<tr style="background-color: transparent;"><td class="text-start" style="text-align: left; background-color: transparent;">${name}</td><td class="text-center" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;">${trial}</td><td class="text-center tabular-nums" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;">${pts}</td><td class="text-center tabular-nums" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;">${solved}</td></tr>`;
    })
    .join('');

  return `<table id="geContributionTable" class="goods-table table-sm table-borderless align-middle w-100 mb-0 bg-transparent" style="background-color: transparent; --bs-table-bg: transparent; --bs-table-color: inherit; color: inherit;"><caption class="visually-hidden"><span data-i18n="ge_member_contributions">GE Leaderboard</span></caption><thead><tr style="background-color: transparent;">
<th scope="col" class="text-start" style="text-align: left; background-color: transparent;"><span data-i18n="member">Member</span></th>
<th scope="col" class="text-center" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;"><span data-i18n="trial">Trial</span></th>
<th scope="col" class="text-center" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;"><span data-i18n="points">Points</span></th>
<th scope="col" class="text-center" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;"><span data-i18n="encounters">Encounters</span></th>
</tr></thead><tbody>${rows}</tbody></table>`;
}

function buildInternationalTable(entries = []) {
  const rows = entries
    .filter(Boolean)
    .map((e) => {
      const rank = e.rank ?? '';
      const name = escapeHtml(e.name || 'Unknown');
      const world = escapeHtml(e.server || e.worldName || '');
      let pts = e.points ?? e.progress ?? 0;
      if (typeof pts === 'number') pts = `${pts}%`;
      else if (typeof pts === 'string' && !pts.endsWith('%')) pts = `${pts}%`;
      return `<tr style="background-color: transparent;"><td class="text-center" style="text-align: center; background-color: transparent;">${rank}</td><td class="text-start" style="text-align: left; background-color: transparent;">${name}</td><td class="text-start" style="text-align: left; background-color: transparent;">${world}</td><td class="text-center tabular-nums" style="text-align: center; background-color: transparent;">${escapeHtml(pts)}</td></tr>`;
    })
    .join('');

  return `<table id="geChampionshipTable" class="goods-table table-sm table-borderless align-middle w-100 mb-0 bg-transparent" style="background-color: transparent; --bs-table-bg: transparent; --bs-table-color: inherit; color: inherit;"><caption class="visually-hidden"><span data-i18n="ge_championship">GE Championship</span></caption><thead><tr style="background-color: transparent;">
<th scope="col" class="text-center" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;"><span data-i18n="rank">Rank</span></th>
<th scope="col" class="text-start" style="text-align: left; background-color: transparent;"><span data-i18n="guild">Guild</span></th>
<th scope="col" class="text-start" style="text-align: left; white-space: nowrap; background-color: transparent;"><span data-i18n="server">Server</span></th>
<th scope="col" class="text-center" style="text-align: center; width: 1%; white-space: nowrap; background-color: transparent;"><span data-i18n="progress">Progress</span></th>
</tr></thead><tbody>${rows}</tbody></table>`;
}

function attachSubpanelToggle(toggleId, iconId, collapseId) {
  const toggleEl = toggleId ? document.getElementById(toggleId) : null;
  const iconEl = document.getElementById(iconId);
  const collapseEl = document.getElementById(collapseId);
  if (!iconEl || !collapseEl) return;

  iconEl.addEventListener('click', () => {
    const isShowing = collapseEl.classList.contains('show');
    const expanded = !isShowing;
    iconEl.textContent = isShowing ? '[+]' : '[-]';
    iconEl.setAttribute('aria-expanded', String(expanded));
    if (toggleEl && typeof toggleEl.setAttribute === 'function') {
      toggleEl.setAttribute('aria-expanded', String(expanded));
    }
  });
}

function buildExpeditionContentHtml(
  internationalEntries = [],
  contributionEntries = [],
  options = {},
) {
  const showInternational = options.showInternationalExpedition !== false;
  const showContribution = options.showExpedition !== false;

  const hasInternational =
    showInternational &&
    Array.isArray(internationalEntries) &&
    internationalEntries.length > 0;
  const hasContribution =
    showContribution &&
    Array.isArray(contributionEntries) &&
    contributionEntries.length > 0;

  let content = '';
  if (hasInternational) {
    content += buildSubpanel(
      'International',
      'ge_championship',
      'Championship',
      buildInternationalTable(internationalEntries),
    );
  }
  if (hasContribution) {
    content += buildSubpanel(
      'Contribution',
      'ge_member_contributions',
      'Member Contributions',
      buildContributionTable(
        contributionEntries,
        expeditionParser.extractTrialLevel,
      ),
    );
  }
  return content;
}

function extractTrialLevel(entry) {
  return expeditionParser.extractTrialLevel(entry);
}

function extractInternationalExpeditionEntries(data) {
  return expeditionParser.extractInternationalExpeditionEntries(data);
}

module.exports = {
  escapeHtml,
  wrapExpeditionCard,
  wrapChampionshipCard,
  wrapContributionCard,
  buildSubpanel,
  buildContributionTable,
  buildInternationalTable,
  buildExpeditionContentHtml,
  attachSubpanelToggle,
  extractTrialLevel,
  extractInternationalExpeditionEntries,
};
