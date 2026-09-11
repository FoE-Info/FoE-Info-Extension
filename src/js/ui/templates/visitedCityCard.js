/**
 * visitedCityCard.js
 *
 * HTML template generator for visited player city cards.
 */

const {
  formatStatNumber,
  formatPercent,
  formatEraName,
  escapeHtml,
} = require('../components/statFormatters.js');

function buildVisitedCityCard({
  prefix,
  playerName,
  playerEra,
  playerScore,
  playerInfo,
  fpTooltipEscaped,
  fp,
  exact,
  goodsDisplay,
  goodsBoostText,
  goodsHTML,
  clanGoodsHTML,
  spec,
  units,
  mil,
}) {
  const safePlayerName = escapeHtml(playerName);
  const safeGuild = playerInfo.guild ? escapeHtml(playerInfo.guild) : '';
  const safeShield =
    playerInfo.shieldTimeText ? escapeHtml(playerInfo.shieldTimeText) : '';

  return `
<div id="${prefix}-panel" class="foe-original-card">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <strong class="text-primary text-decoration-underline text-truncate">${safePlayerName}</strong>
      ${safeGuild ? `<span class="text-secondary">(${safeGuild})</span>` : ''}
      ${safeShield ? `<span class="badge bg-danger ms-1">🛡 ${safeShield}</span>` : ''}
    </div>
    <button type="button" class="btn-close btn-close-white flex-shrink-0" id="${prefix}-close-btn" aria-label="Close" title="Close" data-i18n-title="close" data-i18n-aria-label="close"></button>
  </div>
  <div id="${prefix}Text" class="mt-1 small" style="line-height: 1.45;">
    <div><span data-i18n="age">Age</span>: ${formatEraName(playerEra)}</div>
    <div><span data-i18n="score">Score</span>: ${playerScore || '0'}</div>
    <div><span data-i18n="stat_daily_fp">Daily FP</span>: ${fpTooltipEscaped ? `<span id="${prefix}-fp" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily FP" data-bs-content='${fpTooltipEscaped}'>${formatStatNumber(fp.total, { exact })}</span>` : formatStatNumber(fp.total, { exact })}</div>
    ${
      goodsHTML ? `<div>${goodsHTML}</div>`
      : goodsDisplay ?
        `<div><span data-i18n="stat_daily_goods">Daily Goods</span>: ${goodsDisplay}${goodsBoostText}</div>`
      : ''
    }
    ${clanGoodsHTML ? `<div>${clanGoodsHTML}</div>` : ''}
    ${spec.arcPercent && !spec.arcPercent.isZero() ? `<div>Arc <span data-i18n="bonus">Bonus</span>: ${formatPercent(spec.arcPercent)}</div>` : ''}
    ${(units.total && !units.total.isZero()) || units.daily || units.traz ? `<div><span data-i18n="stat_daily_units">Daily Units</span>: ${formatStatNumber(units.total || units.daily || units.traz, { exact })}</div>` : ''}
    <div><span data-i18n="attackers">Attackers</span>: ${formatPercent(mil.red.base.att, true)} Att, ${formatPercent(mil.red.base.def, true)} Def</div>
    <div><span data-i18n="defenders">Defenders</span>: ${formatPercent(mil.blue.base.att, true)} Att, ${formatPercent(mil.blue.base.def, true)} Def</div>
    <div><span data-i18n="gbg-attackers">GBG Attackers</span>: ${formatPercent(mil.red.gbg.att, true)} Att, ${formatPercent(mil.red.gbg.def, true)} Def</div>
    <div><span data-i18n="gbg-defenders">GBG Defenders</span>: ${formatPercent(mil.blue.gbg.att, true)} Att, ${formatPercent(mil.blue.gbg.def, true)} Def</div>
    <div><span data-i18n="ge-attackers">GE Attackers</span>: ${formatPercent(mil.red.ge.att, true)} Att, ${formatPercent(mil.red.ge.def, true)} Def</div>
    <div><span data-i18n="ge-defenders">GE Defenders</span>: ${formatPercent(mil.blue.ge.att, true)} Att, ${formatPercent(mil.blue.ge.def, true)} Def</div>
    <div><span data-i18n="qi-attackers">QI Attackers</span>: ${formatPercent(mil.red.qi.att, true)} Att, ${formatPercent(mil.red.qi.def, true)} Def</div>
    <div><span data-i18n="qi-defenders">QI Defenders</span>: ${formatPercent(mil.blue.qi.att, true)} Att, ${formatPercent(mil.blue.qi.def, true)} Def</div>
  </div>
</div>`;
}

module.exports = { buildVisitedCityCard };
module.exports.default = buildVisitedCityCard;
