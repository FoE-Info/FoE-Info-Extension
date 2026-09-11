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

function formatStatNumber(val, options = {}) {
  if (val === null || val === undefined) return '0';
  const bn = BigNumber.isBigNumber(val) ? val : new BigNumber(val);
  if (bn.isNaN() || !bn.isFinite()) return '0';

  if (options.exact) {
    return bn.toString();
  }

  const abs = bn.abs();
  if (abs.isGreaterThanOrEqualTo(1e9)) {
    return bn.dividedBy(1e9).toFixed(1) + 'B';
  }
  if (abs.isGreaterThanOrEqualTo(1e6)) {
    return bn.dividedBy(1e6).toFixed(1) + 'M';
  }
  if (abs.isGreaterThanOrEqualTo(1e3)) {
    return bn.dividedBy(1e3).toFixed(1) + 'k';
  }
  return bn.toFormat ? bn.toFormat(0) : bn.toString();
}

function formatPercent(val, options = {}) {
  if (val === null || val === undefined) return '0%';
  const bn = BigNumber.isBigNumber(val) ? val : new BigNumber(val);
  if (bn.isNaN() || !bn.isFinite()) return '0%';
  if (options === true || options.floor === true) {
    return bn.integerValue(BigNumber.ROUND_FLOOR).toString() + '%';
  }
  return bn.toString() + '%';
}

function formatEraName(era) {
  if (!era) return 'Unknown';
  if (typeof era !== 'string') return String(era);
  const parts = era.match(/[A-Z][a-z]+|[0-9]+/g);
  return parts ? parts.join(' ') : era;
}

function renderCityStats(containerId, stats, playerInfo = {}, options = {}) {
  const isOwnCity = !!playerInfo.isOwnCity;
  const playerName =
    playerInfo.name || (isOwnCity ? 'My City' : 'Visited Player');
  const playerEra = playerInfo.era || 'Unknown';
  const playerScore =
    playerInfo.score ? formatStatNumber(playerInfo.score) : null;
  const isCollapsed = options.collapseStats === true;

  const targetId =
    containerId.startsWith('#') ? containerId.slice(1) : containerId;
  const prefix = targetId; // 'citystats' or 'visit'
  const exact = options.exactNumbers === true || stats.exactNumbers === true;

  // Extract metrics safely
  const coins = stats.coins || { total: 0, boostPercent: 0 };
  const supplies = stats.supplies || { total: 0, boostPercent: 0 };
  const fp = stats.fp || {
    total: 0,
    boostPercent: 0,
    boostable: 0,
    unboostable: 0,
  };
  const goods = stats.goods || {
    currentEra: 0,
    previousEra: 0,
    nextEra: 0,
    treasury: 0,
    total: 0,
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

  // Goods display: priority to pre-formatted goodsHTML, then byEra object, then total
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

  let goodsDisplay = '';
  if (playerInfo.goodsHTML) {
    goodsDisplay = playerInfo.goodsHTML;
  } else if (stats.goodsHTML) {
    goodsDisplay = stats.goodsHTML;
  } else if (stats.goods?.byEra && Object.keys(stats.goods.byEra).length > 0) {
    goodsDisplay = Object.entries(stats.goods.byEra)
      .filter(([, amt]) => {
        const bn = BigNumber.isBigNumber(amt) ? amt : new BigNumber(amt || 0);
        return !bn.isZero();
      })
      .map(([era, amt]) => `${era.toUpperCase()}:${formatStatNumber(amt)}`)
      .join(' ');
  } else if (goods.total && !goods.total.isZero()) {
    goodsDisplay = formatStatNumber(goods.total);
  }

  // Guild / Treasury Goods display
  const clanGoodsTooltipHTML =
    playerInfo.clanGoodsTooltipHTML || stats.clanGoodsTooltipHTML || '';
  const clanGoodsTooltipEscaped =
    clanGoodsTooltipHTML ?
      clanGoodsTooltipHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    : '';

  const clanGoods =
    stats.clanGoods !== undefined && stats.clanGoods !== null ? stats.clanGoods
    : goods.treasury !== undefined && goods.treasury !== null ? goods.treasury
    : playerInfo.clanGoods !== undefined && playerInfo.clanGoods !== null ?
      playerInfo.clanGoods
    : null;
  const clanGoodsDisplay =
    clanGoods !== null ?
      BigNumber.isBigNumber(clanGoods) ?
        clanGoods.toString()
      : String(clanGoods)
    : '';
  const clanGoodsHTML =
    clanGoodsDisplay !== '' ?
      clanGoodsTooltipEscaped ?
        `<span data-i18n="guildgoods">Guild Goods</span>: <span id="${prefix}-clan-goods" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Guild Goods" data-bs-content='${clanGoodsTooltipEscaped}'>${clanGoodsDisplay}</span>`
      : `<span data-i18n="guildgoods">Guild Goods</span>: ${clanGoodsDisplay}`
    : '';

  // Daily FP Popover
  const fpTooltipHTML =
    playerInfo.fpTooltipHTML ||
    stats.fpTooltipHTML ||
    stats.fp?.tooltipHTML ||
    '';
  const fpTooltipEscaped =
    fpTooltipHTML ?
      fpTooltipHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    : '';
  const dailyFpText = `${formatStatNumber(fp.total, { exact })}FP${fp.boostPercent && !fp.boostPercent.isZero() ? ` (+${fp.boostPercent.toString()}%)` : ''}`;
  const fpHTML =
    fpTooltipEscaped ?
      `<span data-i18n="daily">Daily</span>: <span id="${prefix}-fp" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily FP" data-bs-content='${fpTooltipEscaped}'>${dailyFpText}</span>`
    : `<span data-i18n="daily">Daily</span>: ${dailyFpText}`;

  // Available FP display: preserve existing live DOM value if not re-provided
  const prevAvailableFP =
    (typeof document !== 'undefined' &&
      document.getElementById('availableFPID')?.textContent) ||
    '';
  const rawAvailableFP =
    stats.availableFP !== undefined && stats.availableFP !== null ?
      stats.availableFP
    : playerInfo.availableFP !== undefined ? playerInfo.availableFP
    : null;
  const availableFPDisplay =
    rawAvailableFP !== null && rawAvailableFP !== 0 ?
      formatStatNumber(rawAvailableFP, { exact })
    : prevAvailableFP && prevAvailableFP !== '0' ? prevAvailableFP
    : '0';

  let html = '';
  if (isOwnCity) {
    const userTooltip = playerInfo.userTooltipHTML || '';
    const userTitle = playerInfo.userTitle || 'Playing FoE';
    const originPrefix = playerInfo.origin ? `${playerInfo.origin} ` : '';
    const suppliesText =
      supplies && supplies.total && !supplies.total.isZero() ?
        `, ${formatStatNumber(supplies.total)} <span data-i18n="supplies">Supplies</span>`
      : '';

    html = `
<div id="${prefix}-panel" class="foe-original-card">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <span role="button" class="foe-collapse-icon me-1 flex-shrink-0" data-bs-toggle="collapse" href="#${prefix}Text"
        aria-expanded="${!isCollapsed}" aria-controls="${prefix}Text" title="Toggle Stats">[-]</span>
      <strong class="text-dark text-truncate">${originPrefix}${playerName}</strong>
      <span id="user" class="pop d-inline-flex align-items-center flex-shrink-0 ms-1" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true"
        data-bs-title="${userTitle}" data-bs-content='${userTooltip || '<p class="pop"><em>None</em></p>'}'>
        <span class="material-icons-outlined info-icon" id="infoIcon" style="font-size: 14px; line-height: 1; vertical-align: middle; cursor: pointer; color: #6c757d;">info</span>
      </span>
    </div>
    <span id="${prefix}-copy-btn" role="button" tabindex="0" class="badge rounded-pill bg-success foe-copy-btn flex-shrink-0"
      style="cursor: pointer;" data-i18n="copy" title="Copy Stats">Copy</span>
  </div>
  <div id="${prefix}Text" class="collapse ${isCollapsed ? '' : 'show'}">
    <div class="small" style="line-height: 1.45;">
      <div>${fpHTML}, ${formatStatNumber(coins.total)} <span data-i18n="coins">Coins</span>${suppliesText}</div>
      <div><span data-i18n="goods">Goods</span>${goodsBoostText}: ${goodsDisplay || '0'}</div>
      ${clanGoodsHTML ? `<div>${clanGoodsHTML}</div>` : ''}
      ${playerInfo.clanPower ? `<div><span data-i18n="guildpower">Guild Power</span>: ${formatStatNumber(playerInfo.clanPower)}</div>` : ''}
      ${spec.arcPercent && !spec.arcPercent.isZero() ? `<div>Arc <span data-i18n="bonus">Bonus</span>: ${formatPercent(spec.arcPercent)}</div>` : ''}
      ${spec.chatBonus && !spec.chatBonus.isZero() ? `<div>CF <span data-i18n="bonus">Bonus</span>: ${formatPercent(spec.chatBonus)} (${formatStatNumber(spec.goodsPerQuest)} <span data-i18n="goods">Goods</span>)</div>` : ''}
      <div><span data-i18n="army">Army Units</span>: ${formatStatNumber(units.daily || units.traz, { exact })}</div>
      <div><span data-i18n="attackers">Attackers</span>: ${formatPercent(mil.red.base.att, true)} Att, ${formatPercent(mil.red.base.def, true)} Def</div>
      <div><span data-i18n="defenders">Defenders</span>: ${formatPercent(mil.blue.base.att, true)} Att, ${formatPercent(mil.blue.base.def, true)} Def</div>
      <div><span data-i18n="gbg-attackers">GBG Attackers</span>: ${formatPercent(mil.red.gbg.att, true)} Att, ${formatPercent(mil.red.gbg.def, true)} Def</div>
      <div><span data-i18n="gbg-defenders">GBG Defenders</span>: ${formatPercent(mil.blue.gbg.att, true)} Att, ${formatPercent(mil.blue.gbg.def, true)} Def</div>
      <div><span data-i18n="ge-attackers">GE Attackers</span>: ${formatPercent(mil.red.ge.att, true)} Att, ${formatPercent(mil.red.ge.def, true)} Def</div>
      <div><span data-i18n="ge-defenders">GE Defenders</span>: ${formatPercent(mil.blue.ge.att, true)} Att, ${formatPercent(mil.blue.ge.def, true)} Def</div>
      <div><span data-i18n="qi-attackers">QI Attackers</span>: ${formatPercent(mil.red.qi.att, true)} Att, ${formatPercent(mil.red.qi.def, true)} Def</div>
      <div><span data-i18n="qi-defenders">QI Defenders</span>: ${formatPercent(mil.blue.qi.att, true)} Att, ${formatPercent(mil.blue.qi.def, true)} Def</div>
      <div><span data-i18n="available">Available FP</span>: <span id="availableFPID">${availableFPDisplay}</span></div>
    </div>
  </div>
</div>`;
  } else {
    html = `
<div id="${prefix}-panel" class="foe-original-card">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <strong class="text-primary text-decoration-underline text-truncate">${playerName}</strong>
      ${playerInfo.guild ? `<span class="text-secondary">(${playerInfo.guild})</span>` : ''}
      ${playerInfo.shieldTimeText ? `<span class="badge bg-danger ms-1">🛡 ${playerInfo.shieldTimeText}</span>` : ''}
    </div>
    <button type="button" class="btn-close btn-close-white flex-shrink-0" id="${prefix}-close-btn" aria-label="Close" title="Close"></button>
  </div>
  <div id="${prefix}Text" class="mt-1 small" style="line-height: 1.45;">
    <div>Age: ${formatEraName(playerEra)}</div>
    <div>Score: ${playerScore || '0'}</div>
    <div><span data-i18n="daily">Daily</span> FP: ${fpTooltipEscaped ? `<span id="${prefix}-fp" class="pop" role="button" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily FP" data-bs-content='${fpTooltipEscaped}'>${formatStatNumber(fp.total, { exact })}</span>` : formatStatNumber(fp.total, { exact })}</div>
    ${goodsDisplay ? `<div><span data-i18n="goods">Goods</span>${goodsBoostText}: ${goodsDisplay}</div>` : ''}
    ${clanGoodsHTML ? `<div>${clanGoodsHTML}</div>` : ''}
    ${playerInfo.clanPower ? `<div><span data-i18n="guildpower">Guild Power</span>: ${formatStatNumber(playerInfo.clanPower)}${playerInfo.sohCount ? ` ${playerInfo.sohCount} <span data-i18n="soh">SoH/TGE</span>` : ''}${playerInfo.hofCount ? ` ${playerInfo.hofCount} <span data-i18n="hof">HoF</span>` : ''}</div>` : ''}
    ${spec.arcPercent && !spec.arcPercent.isZero() ? `<div>Arc <span data-i18n="bonus">Bonus</span>: ${formatPercent(spec.arcPercent)}</div>` : ''}
    ${units.daily || units.traz ? `<div><span data-i18n="army">Army Units</span>: ${formatStatNumber(units.daily || units.traz, { exact })}</div>` : ''}
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

  // Render into DOM if in browser environment
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
    container.className =
      isOwnCity ?
        'alert alert-dismissible alert-warning show collapsed mb-2'
      : 'alert alert-dismissible alert-dark show collapsed mb-2';
    container.innerHTML = html;

    // Attach close button listener
    const closeBtn = document.getElementById(`${prefix}-close-btn`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.innerHTML = '';
        if (container.parentNode) container.parentNode.removeChild(container);
      });
    }

    // Attach copy button listener
    const copyBtn = document.getElementById(`${prefix}-copy-btn`);
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        let textToCopy = '';
        const card = document.getElementById(targetId);
        if (card) {
          const strong = card.querySelector('strong');
          const rows = Array.from(
            card.querySelectorAll(`#${prefix}Text > div > div`),
          );
          const lines = [];
          if (strong?.textContent?.trim())
            lines.push(strong.textContent.trim());
          rows.forEach((r) => {
            const t = r.textContent?.trim();
            if (t) lines.push(t);
          });
          if (lines.length > 0) {
            textToCopy = lines.join('\n');
          }
        }
        if (textToCopy) {
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(textToCopy);
            } else {
              const temp = document.createElement('textarea');
              document.body.appendChild(temp);
              temp.value = textToCopy;
              temp.select();
              document.execCommand('copy');
              temp.remove();
            }
          } catch (err) {
            console.error('CityStats copy failed:', err);
          }
        }
      });
    }

    // Call i18n translation if available
    try {
      if (typeof window !== 'undefined' && window.translateContainer) {
        window.translateContainer(container);
      }
    } catch {
      // Ignore translation errors
    }

    // Initialize Bootstrap 5 Tooltips and Popovers
    try {
      let bs =
        (typeof window !== 'undefined' && window.bootstrap) ||
        (typeof global !== 'undefined' && global.bootstrap) ||
        null;
      if (!bs && typeof window !== 'undefined') {
        try {
          bs = require('bootstrap');
        } catch {}
      }
      if (bs?.Tooltip) {
        container
          .querySelectorAll('[data-bs-toggle="tooltip"]')
          .forEach((el) => {
            new bs.Tooltip(el, {
              html: true,
              delay: { show: 100, hide: 500 },
            });
          });
      }
      if (bs?.Popover) {
        container
          .querySelectorAll('[data-bs-toggle="popover"]')
          .forEach((el) => {
            const existing = bs.Popover.getInstance(el);
            if (existing) {
              existing.dispose();
            }

            const titleGetter = () =>
              el.getAttribute('data-bs-title') ||
              el.getAttribute('title') ||
              '';
            const contentGetter = () =>
              el.getAttribute('data-bs-content') || '';

            const popover = new bs.Popover(el, {
              html: true,
              trigger: 'manual',
              container: 'body',
              sanitize: false,
              animation: false,
              title: titleGetter,
              content: contentGetter,
            });

            let showTimer = null;
            let hideTimer = null;
            let isSelecting = false;

            const getTip = () => {
              try {
                if (popover.tip) return popover.tip;
                if (typeof popover._getTipElement === 'function') {
                  return popover._getTipElement();
                }
                const ariaId = el.getAttribute('aria-describedby');
                if (ariaId) return document.getElementById(ariaId);
              } catch {}
              return null;
            };

            const showPopover = () => {
              if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
              }
              if (!showTimer) {
                showTimer = setTimeout(() => {
                  showTimer = null;
                  popover.show();
                  bindPopoverBox();
                }, 80);
              }
            };

            const hidePopover = () => {
              if (showTimer) {
                clearTimeout(showTimer);
                showTimer = null;
              }
              if (hideTimer) clearTimeout(hideTimer);
              hideTimer = setTimeout(() => {
                if (isSelecting) return;
                const tip = getTip();
                if (tip && tip.matches(':hover')) return;
                popover.hide();
              }, 350);
            };

            el.addEventListener('mouseenter', showPopover);
            el.addEventListener('mouseleave', (e) => {
              const tip = getTip();
              if (
                tip &&
                e.relatedTarget &&
                (tip === e.relatedTarget || tip.contains(e.relatedTarget))
              ) {
                return;
              }
              hidePopover();
            });
            el.addEventListener('focus', showPopover);
            el.addEventListener('blur', hidePopover);

            el.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const tip = getTip();
              if (tip && tip.classList.contains('show')) {
                hidePopover();
              } else {
                showPopover();
              }
            });

            const bindPopoverBox = () => {
              const tip = getTip();
              if (tip && !tip._hoverBound) {
                tip._hoverBound = true;
                tip.addEventListener('mouseenter', () => {
                  if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                  }
                });
                tip.addEventListener('mouseleave', (e) => {
                  if (
                    e.relatedTarget &&
                    (el === e.relatedTarget || el.contains(e.relatedTarget))
                  ) {
                    return;
                  }
                  hidePopover();
                });
                tip.addEventListener('mousedown', () => {
                  isSelecting = true;
                  if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                  }
                });
                window.addEventListener('mouseup', () => {
                  if (isSelecting) {
                    isSelecting = false;
                    const curTip = getTip();
                    if (
                      curTip &&
                      !curTip.matches(':hover') &&
                      !el.matches(':hover')
                    ) {
                      hidePopover();
                    }
                  }
                });
              }
            };

            el.addEventListener('inserted.bs.popover', bindPopoverBox);
            el.addEventListener('shown.bs.popover', bindPopoverBox);
          });
      }
    } catch {
      // Ignore tooltip initialization errors in headless/test environments
    }
  }

  return html;
}

function extractPlayerIds(listOrObj) {
  if (!listOrObj) return [];
  if (Array.isArray(listOrObj)) {
    return listOrObj
      .map((x) => (typeof x === 'object' && x?.player_id ? x.player_id : x))
      .filter(Boolean);
  }
  if (typeof listOrObj === 'object') {
    const values = Object.values(listOrObj);
    const validValues = values.filter(
      (v) =>
        typeof v === 'number' ||
        (typeof v === 'string' && /^\d+$/.test(v.trim())),
    );
    if (
      validValues.length > 0 &&
      validValues.length === Object.keys(listOrObj).length
    ) {
      return validValues;
    }
    return Object.keys(listOrObj).filter((k) => /^\d+$/.test(k.trim()));
  }
  return [];
}

module.exports = {
  renderCityStats,
  formatStatNumber,
  formatPercent,
  extractPlayerIds,
};
module.exports.default = renderCityStats;
