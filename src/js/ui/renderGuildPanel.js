/**
 * renderGuildPanel.js
 *
 * Dedicated UI panel for Guild Profile and Member List.
 * Displays guild name, member count, and full member roster with:
 * Rank, Name, Title, Era, Battles (fights), and Score (points).
 * Supports clipboard copy and collapse toggling.
 */

let element = {};
let collapse = {};
let helper = {};

try {
  element = require('./AddElement.js');
} catch {
  try {
    element = require('../fn/AddElement.js');
  } catch {}
}
try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  helper = require('../fn/helper.js');
} catch {}

function unhideElement(container) {
  if (!container) return;
  if (container.classList?.contains('d-none')) {
    container.classList.remove('d-none');
  }
  if (container.style) {
    container.style.display = '';
  }
}

function resolveGuildOverviewWrapper(targetContainer, doc) {
  const byId =
    doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('guildOverview')
    : null;
  if (byId) return byId;
  return targetContainer?.parentElement || null;
}

function renderGuildPanel(clanData, deps = {}) {
  if (!clanData) return;
  const rawMembers =
    clanData.members || (Array.isArray(clanData) ? clanData : null);
  if (!Array.isArray(rawMembers) || rawMembers.length === 0) return;

  const doc =
    deps.document || (typeof document !== 'undefined' ? document : null);
  const targetContainer =
    deps.guild ||
    deps.containers?.guild ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('guild')
    : null);
  if (!targetContainer) return;

  const depElement = deps.element || element || {};
  const depCollapse = deps.collapse || collapse || {};
  const depHelper = deps.helper || helper || {};
  const escapeFn =
    typeof depHelper.escapeHTML === 'function' ?
      depHelper.escapeHTML
    : (s) => String(s ?? '');
  const eraFn =
    typeof depHelper.fGVGagesname === 'function' ?
      depHelper.fGVGagesname
    : (era) => era || '';

  const clanName = clanData.name || 'Guild';
  const isCollapsed = Boolean(depCollapse.collapseGuild);

  const closeBtn =
    typeof depElement.close === 'function' ? depElement.close() : '';
  const copyBtn =
    typeof depElement.copy === 'function' ?
      depElement.copy('guildCopyID', 'success', 'right', isCollapsed)
    : '';
  const iconHtml =
    typeof depElement.icon === 'function' ?
      depElement.icon('guildOverviewIcon', 'guildOverviewText', isCollapsed)
    : '';

  let rowsHtml = '';
  for (const entry of rawMembers) {
    if (!entry) continue;
    const rank = entry.rank ?? '';
    const name = escapeFn(entry.name || '');
    const title = escapeFn(entry.title || '');
    const era = escapeFn(eraFn(entry.era));
    const battles = Number(entry.won_battles || 0).toLocaleString();
    const score = Number(entry.score || 0).toLocaleString();

    rowsHtml += `<tr>
      <td class="text-start">${rank}</td>
      <td class="text-start fw-semibold">${name}</td>
      <td class="text-start text-muted">${title}</td>
      <td class="text-start">${era}</td>
      <td class="text-end">${battles}</td>
      <td class="text-end">${score}</td>
    </tr>`;
  }

  const html = `<div id="guildOverviewCard" class="alert alert-success alert-dismissible show collapsed" role="status" aria-live="polite">
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <p id="guildOverviewTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#guildOverviewText" aria-expanded="${!isCollapsed}" aria-controls="guildOverviewText" class="cursor-pointer user-select-none mb-0 d-flex align-items-center gap-1 flex-grow-1 text-truncate" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <strong class="text-dark text-truncate">
          <span id="guildOverviewCollapsedTitle" class="${isCollapsed ? '' : 'd-none'}"><span data-i18n="guild">Guild</span>: ${escapeFn(clanName)} <span class="small text-muted">(${rawMembers.length} <span data-i18n="members">members</span>)</span></span>
          <span id="guildOverviewExpandedTitle" class="${isCollapsed ? 'd-none' : ''}"><span data-i18n="guild_overview">Guild Overview</span></span>
        </strong>
      </p>
      <div class="d-flex align-items-center gap-1 flex-shrink-0">
        ${copyBtn}
        ${closeBtn}
      </div>
    </div>
    <div id="guildOverviewSubtitle" class="small text-muted mt-1 ${isCollapsed ? 'd-none' : ''}">
      ${escapeFn(clanName)} • ${rawMembers.length} <span data-i18n="members">members</span>
    </div>
    <div id="guildOverviewText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">
      <div class="table-responsive">
        <table id="guildMemberTable" class="goods-table table-sm w-100 align-middle">
          <caption class="visually-hidden"><span data-i18n="guild_overview">Guild Overview</span></caption>
          <thead>
            <tr>
              <th scope="col" class="text-start">#</th>
              <th scope="col" class="text-start"><span data-i18n="name">Name</span></th>
              <th scope="col" class="text-start"><span data-i18n="title">Title</span></th>
              <th scope="col" class="text-start"><span data-i18n="era">Era</span></th>
              <th scope="col" class="text-end"><span data-i18n="battles">Battles</span></th>
              <th scope="col" class="text-end"><span data-i18n="points">Points</span></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

  if (targetContainer.classList?.contains('d-none')) {
    targetContainer.classList.remove('d-none');
  }
  if (targetContainer.style) {
    targetContainer.style.display = '';
  }
  const wrapper = resolveGuildOverviewWrapper(targetContainer, doc);
  if (wrapper && wrapper !== targetContainer) {
    unhideElement(wrapper);
  }
  targetContainer.innerHTML = html;

  // Bind copy handler
  const copyEl =
    targetContainer.querySelector?.('#guildCopyID') ||
    doc?.getElementById?.('guildCopyID');
  if (copyEl) {
    copyEl.addEventListener('click', async () => {
      const lines = ['Rank\tName\tTitle\tEra\tBattles\tPoints'];
      for (const entry of rawMembers) {
        if (!entry) continue;
        lines.push(
          `${entry.rank ?? ''}\t${entry.name || ''}\t${entry.title || ''}\t${eraFn(entry.era)}\t${entry.won_battles || 0}\t${entry.score || 0}`,
        );
      }
      const tsv = lines.join('\n');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(tsv);
        } else if (doc) {
          const ta = doc.createElement('textarea');
          doc.body.appendChild(ta);
          ta.value = tsv;
          ta.select();
          doc.execCommand('copy');
          ta.remove();
        }
      } catch (err) {
        console.error(
          '[FoE-Info] Failed to copy guild members to clipboard:',
          err,
        );
      }
    });
  }

  const labelEl =
    targetContainer.querySelector?.('#guildOverviewTextLabel') ||
    doc?.getElementById?.('guildOverviewTextLabel');
  if (labelEl && typeof depCollapse.fCollapseGuild === 'function') {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#guildOverviewIcon')
      ) {
        return;
      }
      depCollapse.fCollapseGuild();
    });
  }
  const iconEl =
    targetContainer.querySelector?.('#guildOverviewIcon') ||
    doc?.getElementById?.('guildOverviewIcon');
  if (
    iconEl &&
    iconEl !== labelEl &&
    typeof depCollapse.fCollapseGuild === 'function'
  ) {
    iconEl.addEventListener('click', () => {
      depCollapse.fCollapseGuild();
    });
  }

  const guildCollapseEl =
    targetContainer.querySelector?.('#guildOverviewText') ||
    doc?.getElementById?.('guildOverviewText');
  if (
    guildCollapseEl &&
    typeof guildCollapseEl.addEventListener === 'function'
  ) {
    const applyHeaderState = (collapsed) => {
      const collapsedTitle =
        targetContainer.querySelector?.('#guildOverviewCollapsedTitle') ||
        doc?.getElementById?.('guildOverviewCollapsedTitle');
      const expandedTitle =
        targetContainer.querySelector?.('#guildOverviewExpandedTitle') ||
        doc?.getElementById?.('guildOverviewExpandedTitle');
      const subtitle =
        targetContainer.querySelector?.('#guildOverviewSubtitle') ||
        doc?.getElementById?.('guildOverviewSubtitle');
      if (collapsedTitle?.classList) {
        collapsedTitle.classList.toggle('d-none', !collapsed);
      }
      if (expandedTitle?.classList) {
        expandedTitle.classList.toggle('d-none', collapsed);
      }
      if (subtitle?.classList) {
        subtitle.classList.toggle('d-none', collapsed);
      }
    };
    guildCollapseEl.addEventListener('show.bs.collapse', () =>
      applyHeaderState(false),
    );
    guildCollapseEl.addEventListener('hide.bs.collapse', () =>
      applyHeaderState(true),
    );
  }

  if (typeof depHelper.translateContainer === 'function') {
    depHelper.translateContainer(targetContainer);
  }
}

module.exports = {
  renderGuildPanel,
  default: renderGuildPanel,
};
