/**
 * visitedCityCard.js
 *
 * HTML template generator for visited player city cards.
 * Symmetrical with ownCityCard: identity, Daily Production, and Combat Boosts
 * sections with inline boosts and critical strike breakdown.
 */

const {
  formatStatNumber,
  formatPercent,
  formatEraName,
  escapeHtml,
  formatCritStrikeHTML,
  formatUnitsHTML,
} = require('../components/statFormatters.js');

let showOptions = {};
try {
  const showOptionsPkg = require('../../state/showOptions.js');
  if (showOptionsPkg?.showOptions) showOptions = showOptionsPkg.showOptions;
} catch {}

function buildVisitedCityCard({
  prefix,
  playerName,
  playerEra,
  playerScore,
  playerInfo,
  fpTooltipEscaped,
  fp,
  exact,
  coins,
  supplies,
  goodsDisplay,
  goodsBoostText,
  goodsHTML,
  clanGoodsHTML,
  spec,
  units,
  mil,
  isCollapsed = false,
  stats = {},
}) {
  const safePlayerName = escapeHtml(playerName);
  const safeGuild = playerInfo.guild ? escapeHtml(playerInfo.guild) : '';
  const safeShield =
    playerInfo.shieldTimeText ? escapeHtml(playerInfo.shieldTimeText) : '';

  let originPrefix = '';
  if (playerInfo.origin) {
    const raw = String(playerInfo.origin).trim();
    const urlMatch = raw.match(/https?:\/\/([a-z0-9]+)\.forgeofempires\.com/i);
    const bracketMatch = raw.match(/^\[([a-z0-9]+)\]$/i);
    const plainMatch = raw.match(/^([a-z0-9]+)$/i);
    const worldCode =
      urlMatch ? urlMatch[1]
      : bracketMatch ? bracketMatch[1]
      : plainMatch ? plainMatch[1]
      : raw.replace(/[\][]/g, '').trim();
    if (worldCode) {
      originPrefix = `[${escapeHtml(worldCode.toUpperCase())}] `;
    }
  }

  const userTooltip = (
    playerInfo.userTooltipHTML ||
    stats.userTooltipHTML ||
    ''
  ).replace(/"/g, '&quot;');
  const userTitle = escapeHtml(playerInfo.userTitle || 'Player Information');

  const arcBonusHTML =
    spec.arcPercent && !spec.arcPercent.isZero() ?
      `<div>Arc <span data-i18n="bonus">Bonus</span>: ${formatPercent(spec.arcPercent)}</div>`
    : '';
  const cfBonusHTML =
    spec.chatBonus && !spec.chatBonus.isZero() ?
      `<div>CF <span data-i18n="bonus">Bonus</span>: ${formatPercent(spec.chatBonus)} (${formatStatNumber(spec.goodsPerQuest)} <span data-i18n="goods">Goods</span>)</div>`
    : '';
  const critStrikeHTML = formatCritStrikeHTML(spec);
  const coinBoostVal = coins?.boostPercent ? Number(coins.boostPercent) : 0;
  const supplyBoostVal =
    supplies?.boostPercent ? Number(supplies.boostPercent) : 0;
  const showDailyCoins = showOptions.showDailyCoins !== false;
  const showDailySupplies = showOptions.showDailySupplies !== false;
  const showCoinBoost = showOptions.showCoinBoost !== false;
  const showSupplyBoost = showOptions.showSupplyBoost !== false;

  const dailyCoinsHTML =
    showDailyCoins ?
      `<div><span data-i18n="stat_daily_coins">Coins</span>: ${formatStatNumber(coins?.total ?? 0, { exact, comma: true })}${showCoinBoost && coinBoostVal > 0 ? ` (+${coins.boostPercent}%)` : ''}</div>`
    : '';
  const dailySuppliesHTML =
    showDailySupplies ?
      `<div><span data-i18n="stat_daily_supplies">Supplies</span>: ${formatStatNumber(supplies?.total ?? 0, { exact, comma: true })}${showSupplyBoost && supplyBoostVal > 0 ? ` (+${supplies.boostPercent}%)` : ''}</div>`
    : '';
  const specBonusesHTML = `${arcBonusHTML}${cfBonusHTML}${critStrikeHTML}`;
  const unitsHTML = formatUnitsHTML(
    { ...stats, units },
    playerInfo,
    prefix,
    exact,
  );
  const fpLine =
    fp ?
      `<div><span data-i18n="stat_daily_fp">Daily FP</span>: ${fpTooltipEscaped ? `<span id="${prefix}-fp" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily FP" data-bs-content='${fpTooltipEscaped}'>${formatStatNumber(fp.total, { exact })}</span>` : formatStatNumber(fp.total, { exact })}</div>`
    : '';

  return `
<div id="${prefix}-panel" class="foe-original-card">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <span role="button" tabindex="0" class="foe-collapse-icon header-icon collapse-toggle fw-bold font-monospace me-1 flex-shrink-0" id="${prefix}icon" data-bs-toggle="collapse" href="#${prefix}Text" data-bs-target="#${prefix}Text"
        aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" title="Toggle Stats" data-i18n-title="toggle_stats">${isCollapsed ? '[+]' : '[-]'}</span>
      <strong class="text-primary text-truncate cursor-pointer user-select-none" role="button" tabindex="0" data-bs-toggle="collapse" href="#${prefix}Text" data-bs-target="#${prefix}Text"
        aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" style="cursor: pointer; user-select: none;">${originPrefix}${safePlayerName}</strong>
      <span id="${prefix}-user" class="pop d-inline-flex align-items-center flex-shrink-0 ms-1" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true"
        data-bs-title="${userTitle}" data-bs-content='${userTooltip || '<p class="pop"><em>None</em></p>'}'>
        <span class="material-icons-outlined info-icon" id="${prefix}-info-icon" style="font-size: 14px; line-height: 1; vertical-align: middle; cursor: pointer; color: #6c757d;">info</span>
      </span>
    </div>
    <div class="d-flex align-items-center gap-1 flex-shrink-0">
      <span id="${prefix}-copy-btn" role="button" tabindex="0" class="badge rounded-pill bg-success foe-copy-btn flex-shrink-0"
        style="cursor: pointer;" data-i18n="copy" title="Copy Stats" data-i18n-title="copy_stats">Copy</span>
      <button type="button" class="btn-close btn-close-white flex-shrink-0" id="${prefix}-close-btn" aria-label="Close" title="Close" data-i18n-title="close" data-i18n-aria-label="close"></button>
    </div>
  </div>
  <div id="${prefix}Text" class="collapse ${isCollapsed ? '' : 'show'} mt-1 foe-panel-body">
      ${safeShield ? `<div><span class="badge bg-danger">🛡 ${safeShield}</span></div>` : ''}
      ${safeGuild ? `<div><span data-i18n="guild">Guild</span>: ${safeGuild}</div>` : ''}
      ${playerScore ? `<div><span data-i18n="score">Score</span>: ${playerScore}</div>` : ''}
      ${playerEra ? `<div><span data-i18n="age">Age</span>: ${formatEraName(playerEra)}</div>` : ''}
      ${specBonusesHTML}
      <div class="foe-section-header"><span data-i18n="daily_production">Daily Production</span></div>
      ${dailyCoinsHTML}
      ${dailySuppliesHTML}
      ${fpLine}
      ${
        goodsHTML ? `<div>${goodsHTML}</div>`
        : goodsDisplay ?
          `<div><span data-i18n="stat_daily_goods">Daily Goods</span>: ${goodsDisplay}${goodsBoostText}</div>`
        : ''
      }
      ${clanGoodsHTML ? `<div>${clanGoodsHTML}</div>` : ''}
      <div>${unitsHTML}</div>
      <div class="foe-section-header"><span data-i18n="combat_boosts">Combat Boosts</span></div>
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
