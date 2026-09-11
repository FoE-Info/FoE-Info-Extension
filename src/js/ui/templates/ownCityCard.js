/**
 * ownCityCard.js
 *
 * HTML template generator for player's own city card.
 */

const BigNumber = require('bignumber.js');
const {
  formatStatNumber,
  formatPercent,
  formatEraName,
  escapeHtml,
} = require('../components/statFormatters.js');

function buildOwnCityCard({
  prefix,
  playerName,
  playerInfo,
  stats,
  isCollapsed,
  fpHTML,
  coins,
  supplies,
  goodsDisplay,
  goodsBoostText,
  goodsHTML,
  clanGoodsHTML,
  spec,
  units,
  mil,
  exact,
}) {
  const safePlayerName = escapeHtml(playerName);
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
  const safeGuild = playerInfo.guild ? escapeHtml(playerInfo.guild) : '';
  const playerEra = playerInfo.era || '';
  const playerScore =
    playerInfo.score !== undefined && playerInfo.score !== null ?
      formatStatNumber(playerInfo.score, { exact, comma: true })
    : '';
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
  const coinBoostVal = coins?.boostPercent ? Number(coins.boostPercent) : 0;
  const supplyBoostVal =
    supplies?.boostPercent ? Number(supplies.boostPercent) : 0;
  const coinBonusHTML =
    coinBoostVal > 0 ?
      `<div><span data-i18n="stat_coins">Coins</span> <span data-i18n="bonus">Bonus</span>: ${formatPercent(coins.boostPercent)}</div>`
    : '';
  const supplyBonusHTML =
    supplyBoostVal > 0 ?
      `<div><span data-i18n="stat_supplies">Supplies</span> <span data-i18n="bonus">Bonus</span>: ${formatPercent(supplies.boostPercent)}</div>`
    : '';
  const specBonusesHTML = `${arcBonusHTML}${cfBonusHTML}${coinBonusHTML}${supplyBonusHTML}`;

  return `
<div id="${prefix}-panel" class="foe-original-card">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <span role="button" tabindex="0" class="foe-collapse-icon header-icon collapse-toggle fw-bold font-monospace me-1 flex-shrink-0" id="${prefix}icon" data-bs-toggle="collapse" href="#${prefix}Text" data-bs-target="#${prefix}Text"
        aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" title="Toggle Stats" data-i18n-title="toggle_stats">${isCollapsed ? '[+]' : '[-]'}</span>
      <strong class="text-dark text-truncate cursor-pointer user-select-none" role="button" tabindex="0" data-bs-toggle="collapse" href="#${prefix}Text" data-bs-target="#${prefix}Text" aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" style="cursor: pointer; user-select: none;">${originPrefix}${safePlayerName}</strong>
      <span id="user" class="pop d-inline-flex align-items-center flex-shrink-0 ms-1" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true"
        data-bs-title="${userTitle}" data-bs-content='${userTooltip || '<p class="pop"><em>None</em></p>'}'>
        <span class="material-icons-outlined info-icon" id="infoIcon" style="font-size: 14px; line-height: 1; vertical-align: middle; cursor: pointer; color: #6c757d;">info</span>
      </span>
    </div>
    <div class="d-flex align-items-center gap-1 flex-shrink-0">
      <span id="${prefix}-copy-btn" role="button" tabindex="0" class="badge rounded-pill bg-success foe-copy-btn flex-shrink-0"
        style="cursor: pointer;" data-i18n="copy" title="Copy Stats" data-i18n-title="copy_stats">Copy</span>
    </div>
  </div>
  <div id="${prefix}Text" class="collapse ${isCollapsed ? '' : 'show'}">
    <div class="foe-panel-body">
      ${safeGuild ? `<div><span data-i18n="guild">Guild</span>: ${safeGuild}</div>` : ''}
      ${playerEra ? `<div><span data-i18n="age">Age</span>: ${formatEraName(playerEra)}</div>` : ''}
      ${playerScore ? `<div><span data-i18n="score">Score</span>: ${playerScore}</div>` : ''}
      ${specBonusesHTML}
      <div>${fpHTML}</div>
      ${goodsHTML ? `<div>${goodsHTML}</div>` : `<div><span data-i18n="stat_daily_goods">Daily Goods</span>: ${goodsDisplay || '0'}${goodsBoostText}</div>`}
      ${clanGoodsHTML ? `<div>${clanGoodsHTML}</div>` : ''}
      <div><span data-i18n="stat_daily_units">Daily Units</span>: ${formatStatNumber(units.daily || units.traz, { exact })}</div>
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

module.exports = { buildOwnCityCard };
module.exports.default = buildOwnCityCard;
