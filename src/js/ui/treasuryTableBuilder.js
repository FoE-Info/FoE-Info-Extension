/**
 * treasuryTableBuilder.js
 *
 * Builds goods, medals, and special resource table rows for the Guild Treasury panel.
 * Decoupled from src/js/ui/panelDispatcher.js.
 * Dual CJS/ESM exports.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('TreasuryTableBuilder');
} catch {}

function getResourceAmount(res, id) {
  if (!res) return 0;
  const val = res instanceof Map ? res.get(id) : res[id];
  if (val == null) return 0;
  if (typeof val.toNumber === 'function') return val.toNumber();
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function buildTreasuryTableHtml({ resources, rssDefs = [], helper = {} }) {
  if (!resources) return '';

  logger?.debug('Building treasury table rows', {
    resourceCount:
      resources instanceof Map ?
        resources.size
      : Object.keys(resources || {}).length,
    defsCount: rssDefs.length,
  });

  let tableRows = '';
  const numAges = helper.numAges ?? 0;
  const matchedIds = new Set(['medals']);

  for (let i = 0; i < numAges; i++) {
    let eraTreasuryText = '';
    let currentEraName = '';
    rssDefs.forEach((rssDef) => {
      const amount = getResourceAmount(resources, rssDef.id);
      if (
        typeof helper.fLevelfromAge === 'function' &&
        helper.fLevelfromAge(rssDef.era) == numAges - i &&
        amount > 0
      ) {
        matchedIds.add(rssDef.id);
        if (typeof helper.fGVGagesname === 'function') {
          currentEraName = helper.fGVGagesname(rssDef.era);
        }
        if (!currentEraName) {
          currentEraName = rssDef.era;
        }
        const displayName = rssDef.name || rssDef.id;
        const safeName =
          typeof helper.escapeHTML === 'function' ?
            helper.escapeHTML(displayName)
          : displayName;
        eraTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    });
    if (eraTreasuryText) {
      tableRows += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraTreasuryText}`;
    }
  }

  const medals = getResourceAmount(resources, 'medals');
  if (medals > 0) {
    tableRows += `<tr><td class="text-start">Medals</td><td class="text-end">${medals.toLocaleString()}</td></tr>`;
  }

  let otherTreasuryText = '';
  const allEntries =
    resources instanceof Map ?
      Array.from(resources.entries())
    : Object.entries(resources);
  for (const [resId] of allEntries) {
    if (!matchedIds.has(resId)) {
      const amount = getResourceAmount(resources, resId);
      if (amount > 0) {
        const displayName =
          (typeof helper.fResourceShortName === 'function' ?
            helper.fResourceShortName(resId)
          : null) || resId;
        const safeName =
          typeof helper.escapeHTML === 'function' ?
            helper.escapeHTML(displayName)
          : displayName;
        otherTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    }
  }
  if (otherTreasuryText) {
    tableRows += `<tr><td colspan="2" class="goods-era-header">Other</td></tr>${otherTreasuryText}`;
  }

  return tableRows;
}

const treasuryTableBuilder = {
  getResourceAmount,
  buildTreasuryTableHtml,
};

module.exports = {
  ...treasuryTableBuilder,
  default: treasuryTableBuilder,
};
