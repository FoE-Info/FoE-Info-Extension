/**
 * statFormatters.js
 *
 * Number, percentage, era, and player ID formatters for city stats UI.
 */

const BigNumber = require('bignumber.js');
const { getEraAcronym, ERA_ORDER } = require('../../calc/utils/eraUtils.js');

function formatStatNumber(val, options = {}) {
  if (val === null || val === undefined) return '0';
  const bn = BigNumber.isBigNumber(val) ? val : new BigNumber(val);
  if (bn.isNaN() || !bn.isFinite()) return '0';

  if (options.exact) {
    if (options.comma) {
      const parts = bn.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    return bn.toString();
  }

  const abs = bn.abs();
  if (abs.gte(1e9)) return `${bn.dividedBy(1e9).toFixed(1)}B`;
  if (abs.gte(1e6)) return `${bn.dividedBy(1e6).toFixed(1)}M`;
  if (abs.gte(1e3)) return `${bn.dividedBy(1e3).toFixed(1)}k`;
  return bn.toFormat ? bn.toFormat(0) : bn.toString();
}

function formatPercent(val, options = {}) {
  if (val === null || val === undefined) return '0%';
  const bn = BigNumber.isBigNumber(val) ? val : new BigNumber(val);
  if (bn.isNaN() || !bn.isFinite()) return '0%';
  const isFloor = options === true || options.floor === true;
  return `${(isFloor ? bn.integerValue(BigNumber.ROUND_FLOOR) : bn).toString()}%`;
}

function formatBoostText(val) {
  if (!val) return '';
  const bn = BigNumber.isBigNumber(val) ? val : new BigNumber(val);
  return !bn.isZero() ? ` (+${bn.toString()}%)` : '';
}

function formatEraName(era) {
  if (!era) return 'Unknown';
  if (typeof era !== 'string') return String(era);
  const parts = era.match(/[A-Z][a-z]+|[0-9]+/g);
  return parts ? parts.join(' ') : era;
}

function extractPlayerIds(listOrObj) {
  if (!listOrObj) return [];
  if (Array.isArray(listOrObj)) {
    return listOrObj
      .map((x) => (typeof x === 'object' && x?.player_id ? x.player_id : x))
      .filter(Boolean);
  }
  if (typeof listOrObj === 'object') {
    const vals = Object.values(listOrObj);
    const valid = vals.filter(
      (v) =>
        typeof v === 'number' ||
        (typeof v === 'string' && /^\d+$/.test(v.trim())),
    );
    return valid.length === Object.keys(listOrObj).length ?
        valid
      : Object.keys(listOrObj).filter((k) => /^\d+$/.test(k.trim()));
  }
  return [];
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        m
      ],
  );
}

function formatGoodsDisplay(stats = {}, playerInfo = {}) {
  const goods = stats.goods || {};
  const byEra = goods.byEra || stats.goodsByEra || playerInfo.goodsByEra;
  if (byEra && Object.keys(byEra).length > 0) {
    const entries = Object.entries(byEra).filter(([, amt]) => {
      const bn = BigNumber.isBigNumber(amt) ? amt : new BigNumber(amt || 0);
      return !bn.isZero();
    });
    if (entries.length > 0) {
      entries.sort(
        ([a], [b]) =>
          (ERA_ORDER.indexOf(getEraAcronym(a)) || 999) -
          (ERA_ORDER.indexOf(getEraAcronym(b)) || 999),
      );
      return entries
        .map(([era, amt]) => `${getEraAcronym(era)}:${formatStatNumber(amt)}`)
        .join(' ');
    }
  }

  const total = goods.total ?? playerInfo.totalGoods ?? null;
  if (
    total !== null &&
    (BigNumber.isBigNumber(total) ? !total.isZero() : total !== 0)
  ) {
    return formatStatNumber(total, { exact: true, comma: true });
  }

  return playerInfo.goodsHTML || stats.goodsHTML || '';
}

function formatGoodsHTML(
  stats = {},
  playerInfo = {},
  prefix = '',
  exact = false,
) {
  const goods = stats.goods || {};
  const boostPercent =
    goods.boostPercent ||
    playerInfo.goodsBoostPercent ||
    stats.goodsBoostPercent ||
    null;
  const boostText = formatBoostText(boostPercent);

  const rawGoodsHTML = playerInfo.goodsHTML || stats.goodsHTML || '';
  if (rawGoodsHTML) {
    if (
      rawGoodsHTML.includes('data-i18n="goods"') ||
      rawGoodsHTML.includes('data-i18n="stat_daily_goods"')
    )
      return rawGoodsHTML;
    return `<span data-i18n="stat_daily_goods">Daily Goods</span>: ${rawGoodsHTML.trim()}${boostText}`;
  }

  const byEra =
    goods.byEra || stats.goodsByEra || playerInfo.goodsByEra || null;
  if (byEra && Object.keys(byEra).length > 0) {
    const eraEntries = Object.entries(byEra).filter(([, amt]) => {
      const bn = BigNumber.isBigNumber(amt) ? amt : new BigNumber(amt || 0);
      return !bn.isZero();
    });

    if (eraEntries.length > 0) {
      eraEntries.sort(([a], [b]) => {
        const ia = ERA_ORDER.indexOf(getEraAcronym(a));
        const ib = ERA_ORDER.indexOf(getEraAcronym(b));
        return (ia !== -1 ? ia : 999) - (ib !== -1 ? ib : 999);
      });

      const tooltips =
        goods.tooltipsByEra ||
        stats.goodsTooltipsByEra ||
        playerInfo.goodsTooltipsByEra ||
        {};
      const spans = eraEntries
        .map(([era, amt]) => {
          const acronym = getEraAcronym(era);
          const age = era.toLowerCase();
          const displayAmt = formatStatNumber(amt, { exact });
          const rawTip =
            tooltips[era] ||
            tooltips[acronym] ||
            tooltips[age] ||
            `<strong>${escapeHtml(acronym)}:</strong> ${displayAmt}`;
          const plain = rawTip
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
          const escaped = rawTip.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
          return `<span id="${prefix}-${age}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="bottom" data-bs-title="${escaped}" title="${plain}">${acronym}:${displayAmt}</span>`;
        })
        .join(' ');

      return `<span data-i18n="stat_daily_goods">Daily Goods</span>: ${spans}${boostText}`;
    }
  }

  const tip =
    playerInfo.goodsTooltipHTML ||
    stats.goodsTooltipHTML ||
    goods.tooltipHTML ||
    '';
  const escapedTip =
    typeof tip === 'string' ?
      tip.replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    : '';
  const total = goods.total ?? playerInfo.totalGoods ?? null;

  if (total !== null || escapedTip) {
    const totalDisplay =
      total !== null ? formatStatNumber(total, { exact, comma: true }) : '';
    const text = `${totalDisplay}${boostText}`;
    const pop = `<span id="${prefix}-goods" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily Goods" data-bs-content='${escapedTip}'>${text}</span>`;
    return `<span data-i18n="stat_daily_goods">Daily Goods</span>: ${escapedTip ? pop : text}`;
  }
  return '';
}

function formatClanGoodsHTML(stats = {}, playerInfo = {}, prefix = '') {
  const tooltip =
    playerInfo.clanGoodsTooltipHTML || stats.clanGoodsTooltipHTML || '';
  const escaped =
    typeof tooltip === 'string' ?
      tooltip.replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    : '';
  const cg =
    stats.clanGoods ?? stats.goods?.treasury ?? playerInfo.clanGoods ?? null;
  const display =
    cg !== null ?
      BigNumber.isBigNumber(cg) ?
        cg.toString()
      : String(cg)
    : '';
  if (!display) return '';
  const body = `<span id="${prefix}-clan-goods" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Guild Goods" data-bs-content='${escaped}'>${display}</span>`;
  return `<span data-i18n="guildgoods">Guild Goods</span>: ${escaped ? body : display}`;
}

function formatFpHTML(stats = {}, playerInfo = {}, prefix = '', exact = false) {
  const fp = stats.fp || { total: 0, boostPercent: 0 };
  const tooltip =
    playerInfo.fpTooltipHTML ||
    stats.fpTooltipHTML ||
    stats.fp?.tooltipHTML ||
    '';
  const escaped =
    typeof tooltip === 'string' ?
      tooltip.replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    : '';
  const boost = formatBoostText(fp.boostPercent);
  const text = `${formatStatNumber(fp.total, { exact })}${boost}`;
  const body = `<span id="${prefix}-fp" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily FP" data-bs-content='${escaped}'>${text}</span>`;
  return {
    fpTooltipEscaped: escaped,
    fpHTML: `<span data-i18n="stat_daily_fp">Daily FP</span>: ${escaped ? body : text}`,
  };
}

module.exports = {
  formatStatNumber,
  formatPercent,
  formatEraName,
  extractPlayerIds,
  escapeHtml,
  formatGoodsDisplay,
  formatGoodsHTML,
  formatClanGoodsHTML,
  formatFpHTML,
};
module.exports.default = module.exports;
