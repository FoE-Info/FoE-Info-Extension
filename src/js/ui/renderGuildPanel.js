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
      depElement.icon('guildicon', 'guildText', isCollapsed)
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
      <td class="text-end font-monospace">${battles}</td>
      <td class="text-end font-monospace">${score}</td>
    </tr>`;
  }

  const html = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
    ${closeBtn}
    <p id="guildTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#guildText" aria-expanded="${!isCollapsed}" aria-controls="guildText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
      <strong><span data-i18n="guild">Guild</span>: ${escapeFn(clanName)}</strong>
      <span class="small text-muted">(${rawMembers.length} <span data-i18n="members">members</span>)</span>
    </p>
    ${copyBtn}
    <div id="guildText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">
      <table id="guildMemberTable" class="goods-table w-100">
        <thead>
          <tr>
            <th class="text-start">#</th>
            <th class="text-start"><span data-i18n="name">Name</span></th>
            <th class="text-start"><span data-i18n="title">Title</span></th>
            <th class="text-start"><span data-i18n="era">Era</span></th>
            <th class="text-end"><span data-i18n="battles">Battles</span></th>
            <th class="text-end"><span data-i18n="points">Points</span></th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>`;

  if (targetContainer.classList?.contains('d-none')) {
    targetContainer.classList.remove('d-none');
  }
  if (targetContainer.style) {
    targetContainer.style.display = '';
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
    targetContainer.querySelector?.('#guildTextLabel') ||
    doc?.getElementById?.('guildTextLabel');
  if (labelEl && typeof depCollapse.fCollapseGuild === 'function') {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#guildicon')
      ) {
        return;
      }
      depCollapse.fCollapseGuild();
    });
  }
  const iconEl =
    targetContainer.querySelector?.('#guildicon') ||
    doc?.getElementById?.('guildicon');
  if (
    iconEl &&
    iconEl !== labelEl &&
    typeof depCollapse.fCollapseGuild === 'function'
  ) {
    iconEl.addEventListener('click', () => {
      depCollapse.fCollapseGuild();
    });
  }

  if (typeof depHelper.translateContainer === 'function') {
    depHelper.translateContainer(targetContainer);
  }
}

module.exports = {
  renderGuildPanel,
  default: renderGuildPanel,
};
