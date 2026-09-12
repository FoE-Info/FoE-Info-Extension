/**
 * visitedCityCard.js
 *
 * HTML template generator for visited player city cards.
 * Mirrors ownCityCard's header/section layout. Deliberately renders plain text
 * only — no tooltips, popovers, or interactive breakdowns.
 */

const {
  formatStatNumber,
  formatPercent,
  formatEraName,
  escapeHtml,
  formatCritStrikeHTML,
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
  fp,
  exact,
  coins,
  supplies,
  goodsDisplay,
  goodsBoostText,
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

  const headerTitle =
    isCollapsed ?
      `${originPrefix}${safePlayerName}`
    : `<span data-i18n="city_overview">City Overview</span>`;

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
      `<div><span data-i18n="stat_coins">Coins</span>: ${formatStatNumber(coins?.total ?? 0, { exact, comma: true })}${showCoinBoost && coinBoostVal > 0 ? ` (+${coins.boostPercent}%)` : ''}</div>`
    : '';
  const dailySuppliesHTML =
    showDailySupplies ?
      `<div><span data-i18n="stat_supplies">Supplies</span>: ${formatStatNumber(supplies?.total ?? 0, { exact, comma: true })}${showSupplyBoost && supplyBoostVal > 0 ? ` (+${supplies.boostPercent}%)` : ''}</div>`
    : '';
  const specBonusesHTML = `${arcBonusHTML}${cfBonusHTML}${critStrikeHTML}`;

  const fpBoost = fp?.boostPercent ? ` (+${fp.boostPercent}%)` : '';
  const fpLine =
    fp ?
      `<div><span data-i18n="stat_daily_fp">Daily FP</span>: ${formatStatNumber(fp.total, { exact })}${fpBoost}</div>`
    : '';

  const goodsLine =
    goodsDisplay ?
      `<div><span data-i18n="stat_daily_goods">Daily Goods</span>: ${goodsDisplay}${goodsBoostText}</div>`
    : '';

  const clanGoods =
    stats.clanGoods ?? stats.goods?.treasury ?? playerInfo.clanGoods ?? null;
  const clanGoodsLine =
    clanGoods !== null && clanGoods !== undefined && clanGoods !== '' ?
      `<div><span data-i18n="guildgoods">Guild Goods</span>: ${formatStatNumber(clanGoods, { exact: true, comma: true })}</div>`
    : '';

  const unitsTotal = units?.total || units?.daily || units?.traz || 0;
  const unitsLine = `<div><span data-i18n="stat_daily_units">Daily Units</span>: ${formatStatNumber(unitsTotal, { exact, comma: true })}</div>`;

  return `
<div id="${prefix}-panel" class="foe-original-card">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <span role="button" tabindex="0" class="foe-collapse-icon header-icon collapse-toggle fw-bold font-monospace me-1 flex-shrink-0" id="${prefix}icon" data-bs-toggle="collapse" href="#${prefix}Text" data-bs-target="#${prefix}Text"
        aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" title="Toggle Stats" data-i18n-title="toggle_stats">${isCollapsed ? '[+]' : '[-]'}</span>
      <strong class="text-primary text-truncate cursor-pointer user-select-none" role="button" tabindex="0" data-bs-toggle="collapse" href="#${prefix}Text" data-bs-target="#${prefix}Text" aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" style="cursor: pointer; user-select: none;">${headerTitle}</strong>
    </div>
    <div class="d-flex align-items-center gap-1 flex-shrink-0">
      <span id="${prefix}-copy-btn" role="button" tabindex="0" class="foe-copy-btn flex-shrink-0"
        data-i18n="copy" title="Copy Stats" data-i18n-title="copy_stats">Copy</span>
      <button type="button" class="btn-close btn-close-white flex-shrink-0" id="${prefix}-close-btn" aria-label="Close" title="Close" data-i18n-title="close" data-i18n-aria-label="close"></button>
    </div>
  </div>
  <hr class="foe-card-divider my-1">
  <div id="${prefix}Text" class="collapse ${isCollapsed ? '' : 'show'}">
    <div class="foe-panel-body">
      ${
        !isCollapsed ?
          `<div class="d-flex align-items-center gap-1 text-truncate mb-1">
        <strong class="text-primary text-truncate">${originPrefix}${safePlayerName}</strong>
      </div>`
        : ''
      }
      ${safeShield ? `<div>🛡 ${safeShield}</div>` : ''}
      ${safeGuild ? `<div><span data-i18n="guild">Guild</span>: ${safeGuild}</div>` : ''}
      ${playerEra ? `<div><span data-i18n="age">Age</span>: ${formatEraName(playerEra)}</div>` : ''}
      ${playerScore ? `<div><span data-i18n="score">Score</span>: ${playerScore}</div>` : ''}
      ${specBonusesHTML}
      <div class="foe-section-header"><span data-i18n="daily_production">Daily Production</span></div>
      ${dailyCoinsHTML}
      ${dailySuppliesHTML}
      ${fpLine}
      ${goodsLine}
      ${clanGoodsLine}
      ${unitsLine}
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
  </div>
</div>`;
}

module.exports = { buildVisitedCityCard };
module.exports.default = buildVisitedCityCard;
