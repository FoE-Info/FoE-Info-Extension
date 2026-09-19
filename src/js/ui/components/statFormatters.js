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
  if (isFloor) {
    return `${bn.integerValue(BigNumber.ROUND_FLOOR).toString()}%`;
  }
  const decimals = typeof options?.decimals === 'number' ? options.decimals : 2;
  return `${bn.decimalPlaces(decimals, BigNumber.ROUND_HALF_UP).toString()}%`;
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

let i18nModule = null;
try {
  i18nModule = require('../../utils/i18n.js');
} catch {}

function tr(key, fallback) {
  const value = i18nModule?.t?.(key);
  return value && value !== key ? value : fallback;
}

function buildUnaidedIndicatorHTML({
  resource = '',
  aidStats = null,
  prefix = '',
  exact = false,
} = {}) {
  if (
    !aidStats ||
    !aidStats.unaided ||
    !Array.isArray(aidStats.unaided[resource])
  ) {
    return '';
  }
  const unaidedList = aidStats.unaided[resource];
  if (unaidedList.length === 0) return '';

  const currentVal = aidStats.current?.[resource] ?? 0;
  const maxVal = aidStats.max?.[resource] ?? 0;
  const diffVal = aidStats.diff?.[resource] ?? 0;
  const totalCount = unaidedList.reduce((acc, x) => acc + (x.count || 1), 0);

  const titleText = `${tr('unaided_buildings', 'Unaided Buildings')} (${totalCount})`;
  const escapedTitle = escapeHtml(titleText);

  const itemsHTML = unaidedList
    .map(
      (item) =>
        `<div style="color: #e9ecef; margin-bottom: 2px;">• <strong style="color: #ffffff;">${escapeHtml(item.name)}${item.count > 1 ? ` (x${item.count})` : ''}</strong>: <span style="color: #ffca2c;">-${formatStatNumber(item.diff, { exact, comma: true })}</span></div>`,
    )
    .join('');

  const body = `<div class="pop unaided-popover"><div class="py-1 px-2 mb-2 d-flex align-items-center gap-1" style="font-size: 11px; background-color: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.35); color: #ffca2c; border-radius: 4px;"><span class="material-icons-outlined" style="font-size: 15px; color: #ffca2c;">warning</span><strong style="color: #ffca2c;">${tr('mass_self_aid_recommended', 'Mass Self-Aid recommended before collection!')}</strong></div><div class="mb-2" style="font-size: 11px; line-height: 1.4;"><div style="color: #e9ecef;"><span style="color: #adb5bd;">${tr('actual_yield', 'Actual')}:</span> <strong style="color: #ffffff;">${formatStatNumber(currentVal, { exact, comma: true })}</strong></div><div style="color: #e9ecef;"><span style="color: #adb5bd;">${tr('max_yield', 'Max')}:</span> <strong style="color: #ffffff;">${formatStatNumber(maxVal, { exact, comma: true })}</strong></div><div style="color: #ffca2c;"><span style="color: #adb5bd;">${tr('missing_yield', 'Missing')}:</span> <strong style="color: #ffca2c;">-${formatStatNumber(diffVal, { exact, comma: true })}</strong></div></div><div class="unaided-building-list" style="max-height: 160px; overflow-y: auto; font-size: 11px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;"><div class="mb-1" style="color: #adb5bd; font-weight: 500;">${tr('unaided_buildings', 'Unaided Buildings')} (${totalCount}):</div>${itemsHTML}</div></div>`;

  const escapedBody = body.replace(/'/g, '&#39;').replace(/"/g, '&quot;');

  return `<span id="${prefix}-${resource}-unaided" class="pop d-inline-flex align-items-center flex-shrink-0 ms-1 text-nowrap" role="button" tabindex="0" aria-haspopup="true" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="${escapedTitle}" data-bs-content='${escapedBody}'><span class="material-icons-outlined text-warning" style="font-size: 14px; line-height: 1; vertical-align: middle; cursor: pointer;">warning</span></span>`;
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

  const aidStats = stats.aidStats || playerInfo.aidStats || null;
  const unaidedHTML = buildUnaidedIndicatorHTML({
    resource: 'goods',
    aidStats,
    prefix,
    exact,
  });

  const rawGoodsHTML = playerInfo.goodsHTML || stats.goodsHTML || '';
  if (rawGoodsHTML) {
    if (
      rawGoodsHTML.includes('data-i18n="goods"') ||
      rawGoodsHTML.includes('data-i18n="stat_daily_goods"')
    )
      return rawGoodsHTML;
    const trimmedBoost = boostText ? boostText.trim() : '';
    const trailingHTML =
      trimmedBoost || unaidedHTML ?
        `<span class="text-nowrap">${trimmedBoost}${unaidedHTML}</span>`
      : '';
    return `<span data-i18n="stat_daily_goods">Daily Goods</span>: ${rawGoodsHTML.trim()}${trailingHTML ? ` ${trailingHTML}` : ''}`;
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

      const trimmedBoost = boostText ? boostText.trim() : '';
      const trailingHTML =
        trimmedBoost || unaidedHTML ?
          `<span class="text-nowrap">${trimmedBoost}${unaidedHTML}</span>`
        : '';
      return `<span data-i18n="stat_daily_goods">Daily Goods</span>: ${spans}${trailingHTML ? ` ${trailingHTML}` : ''}`;
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
    const trimmedBoost = boostText ? boostText.trim() : '';
    const trailingHTML =
      trimmedBoost || unaidedHTML ?
        `<span class="text-nowrap">${trimmedBoost}${unaidedHTML}</span>`
      : '';
    const text = `${totalDisplay}${trailingHTML ? ` ${trailingHTML}` : ''}`;
    const pop = `<span id="${prefix}-goods" class="pop" role="button" tabindex="0" aria-haspopup="true" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily Goods" data-bs-content='${escapedTip}'>${text}</span>`;
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
  const aidStats = stats.aidStats || playerInfo.aidStats || null;
  const unaidedHTML = buildUnaidedIndicatorHTML({
    resource: 'clanGoods',
    aidStats,
    prefix,
  });
  const body = `<span id="${prefix}-clan-goods" class="pop" role="button" tabindex="0" aria-haspopup="true" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Guild Goods" data-bs-content='${escaped}'>${display}</span>`;
  return `<span data-i18n="guildgoods">Guild Goods</span>: ${escaped ? body : display}${unaidedHTML}`;
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
  const aidStats = stats.aidStats || playerInfo.aidStats || null;
  const unaidedHTML = buildUnaidedIndicatorHTML({
    resource: 'fp',
    aidStats,
    prefix,
    exact,
  });
  const body = `<span id="${prefix}-fp" class="pop" role="button" tabindex="0" aria-haspopup="true" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily FP" data-bs-content='${escaped}'>${text}</span>`;
  return {
    fpTooltipEscaped: escaped,
    fpHTML: `<span data-i18n="stat_daily_fp">Daily FP</span>: ${escaped ? body : text}${unaidedHTML}`,
  };
}

function formatCritStrikeHTML(spec = {}) {
  const ao =
    spec.aoCriticalStrike != null ?
      BigNumber.isBigNumber(spec.aoCriticalStrike) ?
        spec.aoCriticalStrike
      : new BigNumber(spec.aoCriticalStrike)
    : new BigNumber(0);

  const cc =
    spec.ccCriticalStrike != null ?
      BigNumber.isBigNumber(spec.ccCriticalStrike) ?
        spec.ccCriticalStrike
      : new BigNumber(spec.ccCriticalStrike)
    : new BigNumber(0);

  const specTotal =
    spec.criticalStrike != null ?
      BigNumber.isBigNumber(spec.criticalStrike) ?
        spec.criticalStrike
      : new BigNumber(spec.criticalStrike)
    : null;

  const total = specTotal && !specTotal.isZero() ? specTotal : ao.plus(cc);

  if (!total || total.isNaN() || total.lte(0)) {
    return '';
  }

  return `<div><span data-i18n="crit_strike">Crit Strike</span>: ${formatPercent(total)}</div>`;
}

function formatUnitsHTML(
  stats = {},
  playerInfo = {},
  prefix = '',
  exact = false,
) {
  const units = stats.units || {};
  const total = units.total || units.daily || units.traz || 0;
  const totalDisplay = formatStatNumber(total, { exact, comma: true });

  const tooltip =
    playerInfo.unitsTooltipHTML ||
    stats.unitsTooltipHTML ||
    units.tooltipHTML ||
    '';
  const escaped =
    typeof tooltip === 'string' ?
      tooltip.replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    : '';

  const aidStats = stats.aidStats || playerInfo.aidStats || null;
  const unaidedHTML = buildUnaidedIndicatorHTML({
    resource: 'units',
    aidStats,
    prefix,
    exact,
  });

  if (escaped) {
    const body = `<span id="${prefix}-units" class="pop" role="button" tabindex="0" aria-haspopup="true" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily Units" data-bs-content='${escaped}'>${totalDisplay}</span>`;
    return `<span data-i18n="stat_daily_units">Daily Units</span>: ${body}${unaidedHTML}`;
  }
  return `<span data-i18n="stat_daily_units">Daily Units</span>: ${totalDisplay}${unaidedHTML}`;
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
  formatCritStrikeHTML,
  formatUnitsHTML,
  buildUnaidedIndicatorHTML,
};
module.exports.default = module.exports;
