/**
 * expeditionTables.js
 *
 * DOM table and card generation for Guild Expedition leaderboard
 * and International Guild Expedition rankings.
 */

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
  return `<div id="geChampionshipCard" class="alert alert-info alert-dismissible show collapsed mb-2" role="alert">
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
<p id="geChampionshipLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#geChampionshipText" aria-expanded="${!collapse}" aria-controls="geChampionshipText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
<span class="header-icon collapse-toggle fw-bold font-monospace" id="geChampionshipIcon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="geChampionshipText" data-bs-target="#geChampionshipText" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>
<strong><span data-i18n="ge_championship">GE Championship</span>:</strong></p>
<span id="geChampionshipCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" data-i18n="copy">Copy</span>
<div id="geChampionshipText" style="height: ${size}px" class="alert-info overflow resize-both collapse ${collapse ? '' : 'show'}">
${tableHtml}
</div></div>`;
}

function wrapContributionCard(tableHtml, collapse = false, size = 200) {
  return `<div id="geContributionCard" class="alert alert-info alert-dismissible show collapsed mb-2" role="alert">
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
<p id="geContributionLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#geContributionText" aria-expanded="${!collapse}" aria-controls="geContributionText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
<span class="header-icon collapse-toggle fw-bold font-monospace" id="geContributionIcon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="geContributionText" data-bs-target="#geContributionText" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>
<strong><span data-i18n="ge_member_contributions">GE Leaderboard</span>:</strong></p>
<span id="geContributionCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" data-i18n="copy">Copy</span>
<div id="geContributionText" style="height: ${size}px" class="alert-info overflow resize-both collapse ${collapse ? '' : 'show'}">
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
<span class="header-icon collapse-toggle fw-bold font-monospace" id="ge${prefix}Icon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="true" aria-controls="ge${prefix}Collapse" data-bs-target="#ge${prefix}Collapse" data-bs-toggle="collapse">[-]</span>
<span data-i18n="${titleKey}">${defaultTitle}</span>
</p>
<div id="ge${prefix}Collapse" class="collapse show resize-both">
${tableHtml}
</div></div>`;
}

function buildContributionTable(entries = [], extractTrialLevel) {
  const rows = entries
    .filter(Boolean)
    .map((e) => {
      const name = escapeHtml(e.player?.name || e.name || 'Unknown');
      const trial = extractTrialLevel ? extractTrialLevel(e) : 1;
      const solved = Number(e.solvedEncounters || 0);
      const pts = Number(e.expeditionPoints || 0);
      return `<tr style="background-color: transparent;"><td class="text-start" style="text-align: left; background-color: transparent;">${name}</td><td class="text-center" style="text-align: center; background-color: transparent;">${trial}</td><td class="text-center" style="text-align: center; background-color: transparent;">${pts}</td><td class="text-center" style="text-align: center; background-color: transparent;">${solved}</td></tr>`;
    })
    .join('');

  return `<table class="table table-sm table-borderless align-middle w-100 mb-0 bg-transparent" style="background-color: transparent; --bs-table-bg: transparent; --bs-table-color: inherit; color: inherit;"><thead><tr style="background-color: transparent;">
<th class="text-start" style="text-align: left; background-color: transparent;"><span data-i18n="member">Member</span></th>
<th class="text-center" style="text-align: center; background-color: transparent;"><span data-i18n="trial">Trial</span></th>
<th class="text-center" style="text-align: center; background-color: transparent;"><span data-i18n="points">Points</span></th>
<th class="text-center" style="text-align: center; background-color: transparent;"><span data-i18n="encounters">Encounters</span></th>
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
      return `<tr style="background-color: transparent;"><td class="text-center" style="text-align: center; background-color: transparent;">${rank}</td><td class="text-start" style="text-align: left; background-color: transparent;">${name}</td><td class="text-center" style="text-align: center; background-color: transparent;">${world}</td><td class="text-center" style="text-align: center; background-color: transparent;">${escapeHtml(pts)}</td></tr>`;
    })
    .join('');

  return `<table class="table table-sm table-borderless align-middle w-100 mb-0 bg-transparent" style="background-color: transparent; --bs-table-bg: transparent; --bs-table-color: inherit; color: inherit;"><thead><tr style="background-color: transparent;">
<th class="text-center" style="text-align: center; width: 15%; background-color: transparent;"><span data-i18n="rank">Rank</span></th>
<th class="text-start" style="text-align: left; width: 45%; background-color: transparent;"><span data-i18n="guild">Guild</span></th>
<th class="text-center" style="text-align: center; width: 20%; background-color: transparent;"><span data-i18n="server">Server</span></th>
<th class="text-center" style="text-align: center; width: 20%; background-color: transparent;"><span data-i18n="progress">Progress</span></th>
</tr></thead><tbody>${rows}</tbody></table>`;
}

function attachSubpanelToggle(toggleId, iconId, collapseId) {
  const iconEl = document.getElementById(iconId);
  const collapseEl = document.getElementById(collapseId);
  if (!iconEl || !collapseEl) return;

  iconEl.addEventListener('click', () => {
    const isShowing = collapseEl.classList.contains('show');
    iconEl.textContent = isShowing ? '[+]' : '[-]';
    iconEl.setAttribute('aria-expanded', String(!isShowing));
  });
}

function extractTrialLevel(entry) {
  if (!entry || typeof entry !== 'object') return 1;
  const val =
    entry.currentTrial ??
    entry.trial ??
    entry.trialLevel ??
    entry.state?.currentTrial ??
    entry.state?.trial ??
    1;
  const num = Number(val);
  return Number.isNaN(num) || num <= 0 ? 1 : num;
}

function extractInternationalExpeditionEntries(data) {
  if (!data) return [];
  const payload = data.responseData || data;

  if (payload.ranking && payload.participants) {
    const rankMap = new Map();
    const rankingArr = Array.isArray(payload.ranking) ? payload.ranking : [];
    for (const r of rankingArr) {
      const id = r?.participantId ?? r?.guildId ?? r?.id;
      if (id !== undefined) rankMap.set(String(id), r);
    }

    const participants =
      Array.isArray(payload.participants) ? payload.participants : [];
    return participants
      .map((p, idx) => {
        const id = p.id ?? p.guildId ?? p.participantId;
        const info = rankMap.get(String(id)) || {};
        return {
          rank: info.rank ?? p.rank ?? idx + 1,
          name: p.name || info.name || 'Unknown',
          server:
            p.worldName || p.worldId || info.worldName || info.worldId || '',
          points: info.points ?? p.points ?? info.progress ?? p.progress ?? 0,
        };
      })
      .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
  }

  const list =
    Array.isArray(payload) ? payload
    : Array.isArray(payload.participants) ? payload.participants
    : Array.isArray(payload.ranking) ? payload.ranking
    : [];

  return list
    .map((item, idx) => ({
      rank: item.rank ?? idx + 1,
      name: item.name || item.guildName || 'Unknown',
      server: item.worldName || item.server || item.worldId || '',
      points: item.points ?? item.progress ?? 0,
    }))
    .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
}

module.exports = {
  escapeHtml,
  wrapExpeditionCard,
  wrapChampionshipCard,
  wrapContributionCard,
  buildSubpanel,
  buildContributionTable,
  buildInternationalTable,
  attachSubpanelToggle,
  extractTrialLevel,
  extractInternationalExpeditionEntries,
};
