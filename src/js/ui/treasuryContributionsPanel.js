const BigNumber = require('bignumber.js');
const { escapeHTML } = require('../utils/escape.js');
const { fEraAbbreviation, fLevelfromAge } = require('../calc/eraMapping.js');
const {
  calculateTreasuryContributions,
} = require('../calc/TreasuryContributionsCalculator.js');
const { socialState } = require('../state/SocialDomainState.js');
const { ResourceDefs } = require('../msg/ResourceService.js');
const { applyCardVisibility, getCurrentView } = require('./cardVisibility.js');
let defaults = {};
let translateContainer;
let collapse = {};
let element = {};
let copyUtils = {};
try {
  collapse = require('../fn/collapse.mjs');
  element = require('./AddElement.js');
  copyUtils = require('../utils/copy.js');
} catch {}
try {
  defaults = require('../state/showOptions.mjs').showOptions;
  ({ translateContainer } = require('../fn/i18n.js'));
} catch {}

const HEADERS = [
  ['medalsSpent', 'medals_spent'],
  ['medalsReturned', 'medals_returned'],
  ['medalsDonated', 'medals_donated'],
  ['medalsNet', 'medals_net'],
  ['goodsSpentGvg', 'goods_spent_gvg'],
  ['goodsReturnedGvg', 'goods_returned_gvg'],
  ['goodsSpentGbg', 'goods_spent_gbg'],
  ['goodsSpentGe', 'goods_spent_ge'],
  ['goodsBuilding', 'goods_building'],
  ['goodsManual', 'goods_manual'],
];
const label = (key, fallback = key) =>
  `<span data-i18n="${key}">${escapeHTML(fallback)}</span>`;
const format = (value) =>
  new BigNumber(value || 0).toFormat(0, BigNumber.ROUND_DOWN);
const cell = (value) => `<td class="text-end">${format(value)}</td>`;

function renderTreasuryContributionsPanel(contributions, context = {}) {
  if (typeof document === 'undefined') return;
  const target =
    context.targetEl || document.getElementById('treasuryContributions');
  if (!target) return;
  const enabled =
    context.showTreasury !== false &&
    (context.showContributions ?? defaults.showContributions) !== false;
  target.style.display = enabled ? '' : 'none';
  if (!enabled) {
    target.innerHTML = '';
    return;
  }
  const caption = label('treasury_contributions', 'Treasury Contributions');
  let html;
  if (context.logs) {
    const result = calculateTreasuryContributions(
      context.logs,
      context.reserves,
      context.resourceDefs || ResourceDefs,
      context.roster || socialState.getGuildMembers(),
    );
    const header = HEADERS.map(
      ([, key]) => `<th scope="col" class="text-end">${label(key)}</th>`,
    ).join('');
    result.eras.sort((a, b) => fLevelfromAge(b) - fLevelfromAge(a));
    const eraHeaders = result.eras
      .map(
        (era) =>
          `<th scope="col" class="text-end">${escapeHTML(fEraAbbreviation(era))}</th>`,
      )
      .join('');
    const rows = [...result.members]
      .map(([name, totals]) => {
        const medalsNet = totals.medalsDonated
          .plus(totals.medalsReturned)
          .minus(totals.medalsSpent);
        return `<tr><th scope="row">${escapeHTML(name)}</th>${HEADERS.map(([key]) => cell(key === 'medalsNet' ? medalsNet : totals[key])).join('')}${result.eras.map((era) => cell(totals.eras.get(era))).join('')}</tr>`;
      })
      .join('');
    const resourceRows = [...result.resources.values()]
      .sort(
        (a, b) =>
          fLevelfromAge(b.definition?.era) - fLevelfromAge(a.definition?.era),
      )
      .map(
        (row) =>
          `<tr><th scope="row">${escapeHTML(fEraAbbreviation(row.definition?.era || ''))}: ${escapeHTML(row.definition?.name || row.id)}</th>${['balance', 'donations', 'ge', 'gvg', 'gbg', 'net'].map((key) => cell(row[key])).join('')}</tr>`,
      )
      .join('');
    const numericColumns = HEADERS.length + result.eras.length;
    html = `<table class="goods-table treasury-history-table treasury-members-table" style="width: ${160 + numericColumns * 88}px"><colgroup><col style="width: 160px"><col span="${numericColumns}" style="width: 88px"></colgroup><caption class="visually-hidden">${caption}</caption><thead><tr><th scope="col">${label('player', 'Player')}</th>${header}${eraHeaders}</tr></thead><tbody>${rows}</tbody></table><table class="goods-table treasury-history-table mt-3"><caption>${label('treasury_resource_flows', 'Treasury resource flows')}</caption><thead><tr><th scope="col">${label('resource', 'Resource')}</th>${['treasury', 'treasury_donations', 'goods_spent_ge', 'goods_spent_gvg', 'goods_spent_gbg', 'treasury_net_change'].map((key) => `<th scope="col" class="text-end">${label(key)}</th>`).join('')}</tr></thead><tbody>${resourceRows}</tbody></table>`;
  } else {
    const rows = [...contributions]
      .map(
        ([name, totals]) =>
          `<tr><td>${escapeHTML(name)}</td>${cell(totals.goodsDonated)}${cell(totals.medalsDonated)}</tr>`,
      )
      .join('');
    html = `<table class="goods-table treasury-history-table"><caption class="visually-hidden">${caption}</caption><thead><tr><th scope="col">${label('player', 'Player')}</th><th scope="col">${label('goods_donated', 'Goods Donated')}</th><th scope="col">${label('medals_donated', 'Medals Donated')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  const col = context.collapse || collapse;
  const factory = context.element || element;
  const collapsed = Boolean(col.collapseTreasuryContributions);
  target.innerHTML = `<div class="alert alert-success alert-dismissible" role="status" aria-live="polite">${factory.close?.() || ''}${factory.copy?.('treasuryContributionsCopyID', 'success', 'right', collapsed) || ''}<p id="treasuryContributionsLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#treasuryContributionsText" aria-expanded="${!collapsed}" aria-controls="treasuryContributionsText" class="cursor-pointer mb-0">${factory.icon?.('treasuryContributionsicon', 'treasuryContributionsText', collapsed) || ''}<strong>${caption}</strong></p><div id="treasuryContributionsText" class="collapse ${collapsed ? '' : 'show'}"><div style="overflow: hidden; min-height: 0"><div class="treasury-contributions-scroll">${html}</div></div></div></div>`;
  document
    .getElementById('treasuryContributionsLabel')
    ?.addEventListener('click', (event) => {
      if (!event.target?.closest?.('#treasuryContributionsicon'))
        col.fCollapseTreasuryContributions?.();
    });
  document
    .getElementById('treasuryContributionsicon')
    ?.addEventListener('click', () => col.fCollapseTreasuryContributions?.());
  document
    .getElementById('treasuryContributionsCopyID')
    ?.addEventListener('click', () =>
      copyUtils.copyToClipboard?.('#treasuryContributionsText'),
    );
  translateContainer?.(target);
  if (getCurrentView()) applyCardVisibility();
}
module.exports = { renderTreasuryContributionsPanel };
