/**
 * cityStatsHtmlBuilder.js
 *
 * Generates the legacy #citystats HTML overview string for the DevTools panel.
 * Decoupled from StartupService.js.
 */

const BigNumber = require('bignumber.js');
const element = require('./AddElement.js');
const { fArcname, fCFname } = require('../calc/gbNaming.js');
const { formatDate } = require('../utils/date.js');
const { getScoreDBOrigin } = require('./playerTooltip.js');

/**
 * Builds the HTML string for the citystats panel.
 *
 * @param {Object} params
 * @param {Object} params.City - City state object
 * @param {Object} params.MyInfo - Player info object
 * @param {Object} params.tooltipHTML - Tooltip content dictionary
 * @param {string} [params.goodsHTML=''] - Accumulated goods HTML string
 * @param {string} [params.userTooltipHTML=''] - Escaped user tooltip HTML string
 * @param {number} [params.clanGoods=0] - Tally of clan goods
 * @param {number} [params.clanPower=0] - Tally of clan power
 * @param {number} [params.diamonds=0] - Diamond balance
 * @param {string} [params.gameOrigin=''] - Game world origin identifier
 * @param {boolean} [params.collapseStats=false] - Whether stats section is collapsed
 * @returns {string} Generated citystats inner HTML
 */
function buildCityStatsHTML({
  City,
  MyInfo,
  tooltipHTML,
  goodsHTML = '',
  userTooltipHTML = '',
  clanGoods = 0,
  clanPower = 0,
  diamonds = 0,
  gameOrigin = '',
  collapseStats = false,
}) {
  const userTooltipHTMLEscaped = userTooltipHTML
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');

  const fpHTML = `<span id="fp" class="pop" data-bs-container="#fp" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily FP" data-bs-content="${
    tooltipHTML.fp
  }"><span data-i18n="daily">Daily</span>: ${City.ForgePoints ? City.ForgePoints : 0}FP</span>`;

  const worldBadge = `[${getScoreDBOrigin(gameOrigin).toUpperCase()}]`;

  const userHTML = `<strong>${worldBadge} ${
    MyInfo.name
  }</strong><span id="user" class="pop" data-bs-container="#user" data-bs-toggle="popover" data-bs-placement="bottom"
        title="Playing <strong>FoE</strong> since<br>${formatDate(MyInfo.createdAt)}"
        data-bs-content='${userTooltipHTMLEscaped}'>
        <span class="material-icons-outlined md-12 info-icon" id="infoIcon">info</span></span>`;

  const clanGoodsHTML = `<span id="clanGoods" class="pop" data-bs-container="#clanGoods" data-bs-toggle="popover" data-bs-placement="bottom" title="Guild Goods" data-bs-content="${tooltipHTML.clanGoods}"><span data-i18n="guildgoods">Guild Goods</span>: ${clanGoods}</span>`;

  const totalGoodsHTML = `<span id="citystats_goods" class="pop" data-bs-container="#citystats_goods" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily Goods" data-bs-content="${tooltipHTML.totalGoods}"><span data-i18n="goods">Goods</span>:</span> ${goodsHTML}`;

  let html = `<p>`;
  html += element.icon('citystatsicon', 'citystatsText', collapseStats);
  html += element.copy(
    'citystatsCopyID',
    'warning stats-copy',
    'right',
    collapseStats,
  );
  html += `<span id="citystatsLabel">${userHTML}</span></p>`;
  html += `<div id="citystatsText" class="collapse ${collapseStats ? '' : 'show'}"><div>`;

  if (City.ForgePoints) {
    const coinStr =
      City.Coins > 1000000 ?
        Math.floor((City.Coins * (1 + City.CoinBoost / 100)) / 1000000) + 'M'
      : Math.floor(City.Coins * (1 + City.CoinBoost / 100));
    html += `<p>${fpHTML}, ${coinStr} <span data-i18n="coins">Coins</span><br>`;
  }

  html += `${totalGoodsHTML}<br>`;

  if (diamonds) {
    html += `<span class='green'><span data-i18n="diamonds">Diamonds</span>: ${diamonds}</span><br>`;
  }

  if (City.ArcBonus) {
    html += `${fArcname()} <span data-i18n="bonus">Bonus</span>: ${City.ArcBonus}%<br>`;
  }

  if (City.ChatBonus) {
    html += `${fCFname()} <span data-i18n="bonus">Bonus</span>: ${City.ChatBonus}% / ${BigNumber(
      City.ChatBonus,
    )
      .div(20)
      .plus(5)
      .toFormat(0)} <span data-i18n="goods">Goods</span><br>`;
  }

  if (clanGoods) html += `${clanGoodsHTML}<br>`;
  if (clanPower)
    html += `<span data-i18n="guildpower">Guild Power</span>: ${clanPower}<br>`;
  if (City.TrazUnits)
    html += `<span data-i18n="army">Army Units</span>: ${City.TrazUnits}<br>`;

  html += `<span data-i18n="attackers">Attackers</span>: ${City.Attack}% Att, ${City.Defense}% Def<br>`;
  html += `<span data-i18n="defenders">Defenders</span>: ${City.CityAttack}% Att, ${City.CityDefense}% Def<br>`;
  html += `<span data-i18n="gbg-attackers">GBG Attackers</span>: ${
    (City.GBGAttackingAttack || 0) + (City.Attack || 0)
  }% Att, ${(City.GBGAttackingDefense || 0) + (City.Defense || 0)}% Def<br>`;
  html += `<span data-i18n="gbg-defenders">GBG Defenders</span>: ${
    (City.GBGDefendingAttack || 0) + (City.CityAttack || 0)
  }% Att, ${(City.GBGDefendingDefense || 0) + (City.CityDefense || 0)}% Def<br>`;
  html += `<span data-i18n="ge-attackers">GE Attackers</span>: ${
    (City.GEAttackingAttack || 0) + (City.Attack || 0)
  }% Att, ${(City.GEAttackingDefense || 0) + (City.Defense || 0)}% Def<br>`;
  html += `<span data-i18n="ge-defenders">GE Defenders</span>: ${
    (City.GEDefendingAttack || 0) + (City.CityAttack || 0)
  }% Att, ${(City.GEDefendingDefense || 0) + (City.CityDefense || 0)}% Def<br>`;
  html += `<span data-i18n="qi-attackers">QI Attackers</span>: ${City.QIAttackingAttack || 0}% Att, ${City.QIAttackingDefense || 0}% Def<br>`;
  html += `<span data-i18n="qi-defenders">QI Defenders</span>: ${City.QIDefendingAttack || 0}% Att, ${City.QIDefendingDefense || 0}% Def</p>`;
  html += `</div></div>`;

  return html;
}

module.exports = {
  buildCityStatsHTML,
};
module.exports.default = module.exports;
