/**
 * bonusPanel.js
 *
 * Unified Bonus panel controller:
 * - renderBonusSummary, updateBonusAmount, updateDailyForgePoints
 * - bindBonusPanel (reactive BonusState subscription & DOM updates)
 */

const { createLogger } = require('../utils/logger.js');
const { bonusState } = require('../state/CityDomainState.js');

const { metadataStore } = require('../state/MetadataStore.js');
const { escapeHTML } = require('../utils/escape.js');
const { t, translateContainer } = require('../utils/i18n.js');

const logger = createLogger('BonusPanel');

const safeRequire = (loader) => {
  try {
    return loader();
  } catch {
    return null;
  }
};

const element = safeRequire(() => require('../fn/AddElement.mjs'));
const collapse = safeRequire(() => require('../fn/collapse.mjs'));

function updateBonusAmount(id, amount) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el) el.textContent = amount;
}

function updateDailyForgePoints(total) {
  if (typeof document === 'undefined') return;
  const fpSpan = document.getElementById('fp');
  if (fpSpan)
    fpSpan.innerHTML = `<span data-i18n="daily">Daily</span>: ${total}FP`;
}

function formatLimitedBonuses(entries, store = metadataStore) {
  return entries
    .map((entry) => {
      const buildings = [...store.entities.values()].filter(
        (entity) =>
          entity.type === 'greatbuilding' &&
          (entity.passive_bonus?.type === entry.type ||
            entity.bonuses?.some?.((bonus) => bonus.type === entry.type)),
      );
      const buildingName =
        entry.buildingName ||
        buildings
          .map((entity) => entity.name)
          .filter(Boolean)
          .join(' / ');
      const key = 'limited_bonus_' + entry.type;
      const translated = t(key);
      const label =
        translated && translated !== key ?
          translated
        : entry.type.replaceAll('_', ' ');
      if (entry.kind === 'passive') {
        const chance =
          entry.type === 'mysterious_shards' ? entry.amount : entry.value;
        return `<div>${escapeHTML(buildingName || label)}${buildingName ? ' — ' + escapeHTML(label) : ''}${chance != null && Number.isFinite(Number(chance)) ? ': ' + escapeHTML(chance) + '%' : ''}</div>`;
      }
      const remaining = entry.remaining == null ? '—' : String(entry.remaining);
      return `<div>${escapeHTML(buildingName || label)}${buildingName ? ' — ' + escapeHTML(label) : ''}: <strong>${escapeHTML(remaining)}</strong> <span data-i18n="remaining">Remaining</span></div>`;
    })
    .join('');
}

function renderBonusSummary(bonusHTML, state = {}, entries = []) {
  if (typeof document === 'undefined') return;
  const bonus = document.getElementById('bonus');
  if (!bonus) return;
  const hasAny =
    entries.length ||
    state.aid ||
    state.spoils ||
    state.diplomatic ||
    state.strike;
  if (!hasAny) {
    bonus.innerHTML = '';
    return;
  }
  const isCollapsed =
    collapse?.collapseBonus !== undefined ? !!collapse.collapseBonus : true;
  if (bonus.innerHTML === '') {
    const iconMarkup =
      element?.icon ? element.icon('bonusicon', 'bonusText', isCollapsed) : '';
    const closeMarkup = element?.close ? element.close() : '';
    bonus.innerHTML = `<div id="bonusTip" class="alert alert-light alert-dismissible" role="status" aria-live="polite">
      <p id="bonusTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#bonusText" aria-expanded="${!isCollapsed}" aria-controls="bonusText" class="cursor-pointer user-select-none mb-0">
      ${iconMarkup}<strong><span data-i18n="bonus">Bonus</span></strong></p>${closeMarkup}
      <div id="bonusText" class="alert-light collapse${isCollapsed ? '' : ' show'}"></div></div>`;
    const label = document.getElementById('bonusTextLabel');
    label?.addEventListener('click', (e) => {
      if (e?.target?.closest?.('#bonusicon')) return;
      collapse?.fCollapseBonus?.();
    });
    document
      .getElementById('bonusicon')
      ?.addEventListener('click', () => collapse?.fCollapseBonus?.());
  }
  const body = document.getElementById('bonusText');
  if (body)
    body.innerHTML = entries.length ? formatLimitedBonuses(entries) : bonusHTML;
  translateContainer(bonus);
  logger.debug('bonus panel rendered', { count: entries.length });
}

function bindBonusPanel(
  state = bonusState,
  {
    renderSummary = renderBonusSummary,
    updateAmount = updateBonusAmount,
    updateDailyFp = updateDailyForgePoints,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'bonus' && channel !== 'all') return;

    renderSummary(
      snapshot.getBonusHTML(),
      snapshot.getSummary(),
      snapshot.getLimitedBonuses(),
    );
    updateAmount('spoilsID', snapshot.getSpoils());
    updateAmount('diplomaticID', snapshot.getDiplomatic());
    updateAmount('firststrikeID', snapshot.getStrike());
    updateAmount('aidID', snapshot.getAid());

    const dailyFp = snapshot.getDailyForgePoints();
    if (dailyFp != null) updateDailyFp(dailyFp);
  });
}

module.exports = {
  formatLimitedBonuses,
  updateBonusAmount,
  updateDailyForgePoints,
  renderBonusSummary,
  bindBonusPanel,
};
module.exports.default = renderBonusSummary;
