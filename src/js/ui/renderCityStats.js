/**
 * renderCityStats.js
 *
 * Renders modern, localized Bootstrap 5.3 dashboards for:
 * - #citystats (Player's own city)
 * - #visit (Visited player's city)
 *
 * Adheres to UI-DS-CITYSTATS-001 specification:
 * - Responsive container queries and compact DevTools docking down to 250px.
 * - Symmetrical layout between own and visited city.
 * - Strictly displays authentic, unblurred blue defense stats.
 */

const BigNumber = require('bignumber.js');
const { initPopovers } = require('./components/PopoverManager.js');
const { handleCopyStats } = require('./components/ClipboardFormatter.js');
const { buildVisitedCityCard } = require('./templates/visitedCityCard.js');
const { buildOwnCityCard } = require('./templates/ownCityCard.js');
const {
  formatStatNumber,
  formatPercent,
  formatEraName,
  extractPlayerIds,
  formatGoodsDisplay,
  formatGoodsHTML,
  formatClanGoodsHTML,
  formatFpHTML,
} = require('./components/statFormatters.js');

function renderCityStats(containerId, stats, playerInfo = {}, options = {}) {
  const isOwnCity = !!playerInfo.isOwnCity;
  const playerName =
    playerInfo.name || (isOwnCity ? 'My City' : 'Visited Player');
  const playerEra = playerInfo.era || 'Unknown';
  const isCollapsed = options.collapseStats === true;
  const exact = options.exactNumbers === true || stats.exactNumbers === true;
  const playerScore =
    playerInfo.score ?
      formatStatNumber(playerInfo.score, { exact, comma: true })
    : null;

  const targetId =
    containerId.startsWith('#') ? containerId.slice(1) : containerId;
  const prefix = targetId; // 'citystats' or 'visit'

  // Extract metrics safely
  const coins = stats.coins || { total: 0, boostPercent: 0 };
  const supplies = stats.supplies || { total: 0, boostPercent: 0 };
  const fp = stats.fp || {
    total: 0,
    boostPercent: 0,
    boostable: 0,
    unboostable: 0,
  };
  const units = stats.units || { daily: 0, traz: 0 };
  const mil = stats.military || {
    red: {
      base: { att: 0, def: 0 },
      gbg: { att: 0, def: 0 },
      ge: { att: 0, def: 0 },
      qi: { att: 0, def: 0 },
    },
    blue: {
      base: { att: 0, def: 0 },
      gbg: { att: 0, def: 0 },
      ge: { att: 0, def: 0 },
      qi: { att: 0, def: 0 },
    },
  };
  const spec = stats.special || {
    arcPercent: 0,
    chatBonus: 0,
    goodsPerQuest: 5,
    qiBoosts: {
      attack: 0,
      defense: 0,
      coins: 0,
      supplies: 0,
      goods: 0,
      actions: 0,
    },
    aoCriticalStrike: 0,
    krakenCriticalStrike: 0,
  };

  const goodsBoostPercent =
    stats.goods?.boostPercent ||
    playerInfo.goodsBoostPercent ||
    stats.goodsBoostPercent ||
    null;
  const goodsBoostText =
    (
      goodsBoostPercent &&
      (BigNumber.isBigNumber(goodsBoostPercent) ?
        !goodsBoostPercent.isZero()
      : goodsBoostPercent > 0)
    ) ?
      ` (+${goodsBoostPercent.toString()}%)`
    : '';

  const goodsDisplay = formatGoodsDisplay(stats, playerInfo);
  const goodsHTML = formatGoodsHTML(stats, playerInfo, prefix, exact);
  const clanGoodsHTML = formatClanGoodsHTML(stats, playerInfo, prefix);
  const { fpTooltipEscaped, fpHTML } = formatFpHTML(
    stats,
    playerInfo,
    prefix,
    exact,
  );

  const html =
    isOwnCity ?
      buildOwnCityCard({
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
      })
    : buildVisitedCityCard({
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
        isCollapsed,
      });

  if (typeof document !== 'undefined') {
    let container = document.getElementById(targetId);
    if (!container) {
      container = document.createElement('div');
      container.id = targetId;
      const content =
        document.getElementById('content') ||
        document.body ||
        document.documentElement;
      if (content) {
        content.insertBefore(container, content.firstChild);
      }
    }
    container.style.display = '';
    container.className =
      isOwnCity ?
        'alert alert-warning show collapsed mb-2'
      : 'alert alert-dismissible alert-dark show collapsed mb-2';
    container.innerHTML = html;

    const closeBtn = document.getElementById(`${prefix}-close-btn`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.innerHTML = '';
        container.style.display = 'none';
      });
    }

    const copyBtn = document.getElementById(`${prefix}-copy-btn`);
    if (copyBtn) {
      copyBtn.addEventListener('click', () =>
        handleCopyStats(targetId, prefix),
      );
    }

    try {
      if (typeof window !== 'undefined' && window.translateContainer) {
        window.translateContainer(container);
      }
    } catch (err) {
      console.warn('[CityStats] translateContainer error:', err);
    }

    initPopovers(container);
  }

  return html;
}

module.exports = {
  renderCityStats,
  formatStatNumber,
  formatPercent,
  formatEraName,
  extractPlayerIds,
};
module.exports.default = renderCityStats;
