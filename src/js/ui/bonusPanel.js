/**
 * bonusPanel.js
 *
 * Unified Bonus panel controller:
 * - renderBonusSummary, updateBonusAmount, updateDailyForgePoints
 * - bindBonusPanel (reactive BonusState subscription & DOM updates)
 */

const { createLogger } = require('../utils/logger.js');
const { bonusState } = require('../state/CityDomainState.js');

const logger = createLogger('BonusPanel');

const safeRequire = (loader) => {
  try {
    return loader();
  } catch {
    return null;
  }
};

const element = safeRequire(() => require('../fn/AddElement.js'));
const collapse = safeRequire(() => require('../fn/collapse.js'));

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

function renderBonusSummary(bonusHTML, state = {}) {
  if (typeof document === 'undefined') return;
  const bonus = document.getElementById('bonus');
  if (!bonus) return;

  const hasAny = state.aid || state.spoils || state.diplomatic || state.strike;
  const isCollapsed =
    collapse?.collapseBonus !== undefined ? !!collapse.collapseBonus : true;

  if (bonus.innerHTML === '' && hasAny) {
    const iconMarkup =
      element?.icon ? element.icon('bonusicon', 'bonusText', isCollapsed) : '';
    const closeMarkup = element?.close ? element.close() : '';
    bonus.innerHTML = `<div id="bonusTip" class="alert alert-light alert-dismissible" role="status" aria-live="polite">
            <p id="bonusTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#bonusText" aria-expanded="${!isCollapsed}" aria-controls="bonusText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconMarkup}
			<strong><span data-i18n="bonus">Bonus</span>:</strong> ${bonusHTML}</p>
            ${closeMarkup}
            <div id="bonusText" class="alert-light collapse"><p><strong><span data-i18n="legend">Legend</span>:</strong><br>First <em>Strike</em> - Kraken<br><em>Spoils</em> of War - Himeji Castle<br><em>Dip</em>lomatic Gifts - Space Carrier<br><em>Aid</em> Goods - Truce Tower</p></div></div>`;

    const labelEl = document.getElementById('bonusTextLabel');
    if (labelEl) {
      labelEl.addEventListener('click', (e) => {
        if (
          e?.target &&
          typeof e.target.closest === 'function' &&
          e.target.closest('#bonusicon')
        ) {
          return;
        }
        collapse?.fCollapseBonus?.();
      });
    }
    const iconEl = document.getElementById('bonusicon');
    if (iconEl && iconEl !== labelEl) {
      iconEl.addEventListener('click', () => collapse?.fCollapseBonus?.());
    }

    logger.debug('bonus panel rendered', { bonusHTMLLength: bonusHTML.length });
  } else if (!hasAny) {
    bonus.innerHTML = '';
  }
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

    renderSummary(snapshot.getBonusHTML(), snapshot.getSummary());
    updateAmount('spoilsID', snapshot.getSpoils());
    updateAmount('diplomaticID', snapshot.getDiplomatic());
    updateAmount('firststrikeID', snapshot.getStrike());
    updateAmount('aidID', snapshot.getAid());

    const dailyFp = snapshot.getDailyForgePoints();
    if (dailyFp != null) updateDailyFp(dailyFp);
  });
}

module.exports = {
  updateBonusAmount,
  updateDailyForgePoints,
  renderBonusSummary,
  bindBonusPanel,
};
module.exports.default = renderBonusSummary;
