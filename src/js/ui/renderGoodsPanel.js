/** Goods Inventory (#goods) renderer, extracted from ResourceService.js. */
const { createLogger } = require('../utils/logger.js');
const logger = createLogger('GoodsPanel');
const safeRequire = (loader) => {
  try {
    return loader();
  } catch {
    return null;
  }
};
const element = safeRequire(() => require('../fn/AddElement.js'));
const collapse = safeRequire(() => require('../fn/collapse.js'));
const i18n = safeRequire(() => require('../fn/i18n.js'));
const helper = safeRequire(() => require('../fn/helper.js'));
const panelResize = safeRequire(() => require('./panelResize.js'));
let globals = safeRequire(() => require('../fn/globals.js'));
const SPECIAL_GOODS = new Set(
  'promethium orichalcum mars_ore asteroid_ice venus_carbon unknown_dna crystallized_hydrocarbons dark_matter'.split(
    ' ',
  ),
);
const NON_GOODS = new Set(
  'money supplies medals strategy_points credits colonists life_support castle_points tavern_silver guild_power clan_power population happiness'.split(
    ' ',
  ),
);

const isStandardGood = (good) =>
  !SPECIAL_GOODS.has(good.id) &&
  !NON_GOODS.has(good.id) &&
  good.type !== 'special_resource' &&
  good.type !== 'currency' &&
  good.type !== 'population' &&
  good.type !== 'happiness';
const isSpecialGood = (good) =>
  (SPECIAL_GOODS.has(good.id) || good.type === 'special_resource') &&
  !NON_GOODS.has(good.id);

const rowMarkup = (name, amount) =>
  `<tr><td class="text-start">${name}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;

function buildGoodsRows(
  currentResources = {},
  resourceDefs = [],
  resourceNames = {},
) {
  let standardGoodsText = '';
  let specialGoodsRows = '';

  if (resourceDefs && resourceDefs.length > 0 && helper?.numAges) {
    for (var i = 0; i < helper.numAges; i++) {
      let eraGoodsText = '';
      let currentEraName = '';
      const eraLevel = helper.numAges - i;
      resourceDefs.forEach((good) => {
        if (
          helper.fLevelfromAge(good.era) === eraLevel &&
          currentResources[good.id] > 0 &&
          isStandardGood(good)
        ) {
          currentEraName =
            typeof helper.fGVGagesname === 'function' ?
              helper.fGVGagesname(good.era)
            : good.era;
          eraGoodsText += rowMarkup(good.name, currentResources[good.id]);
        }
      });
      if (eraGoodsText) {
        standardGoodsText += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraGoodsText}`;
      }
    }

    for (var j = 0; j < helper.numAges; j++) {
      const eraLevel = helper.numAges - j;
      resourceDefs.forEach((good) => {
        if (
          helper.fLevelfromAge(good.era) === eraLevel &&
          currentResources[good.id] > 0 &&
          isSpecialGood(good)
        ) {
          specialGoodsRows += rowMarkup(good.name, currentResources[good.id]);
        }
      });
    }
  } else {
    Object.entries(currentResources).forEach(([goodId, qty]) => {
      if (NON_GOODS.has(goodId) || !qty || qty <= 0) return;
      const name = resourceNames[goodId] || goodId;
      if (SPECIAL_GOODS.has(goodId)) specialGoodsRows += rowMarkup(name, qty);
      else standardGoodsText += rowMarkup(name, qty);
    });
  }

  let goodsText = standardGoodsText;
  if (specialGoodsRows) {
    goodsText += `<tr><td colspan="2" class="goods-era-header"><span data-i18n="special_goods">Special Goods</span></td></tr>`;
    goodsText += specialGoodsRows;
  }
  return goodsText;
}

function bindCollapseAndResize(goodsSize) {
  if (collapse?.fCollapseGoods) {
    const labelEl = document.getElementById('goodsTextLabel');
    labelEl?.addEventListener('click', (e) => {
      if (e?.target?.closest?.('#goodsicon')) return;
      collapse.fCollapseGoods();
    });
    const iconEl = document.getElementById('goodsicon');
    if (iconEl && iconEl !== labelEl) {
      iconEl.addEventListener('click', () => collapse.fCollapseGoods());
    }
  }

  const goodsDiv = document.getElementById('goodsText');
  if (!goodsDiv) return;
  if (panelResize?.bindResizableCollapse) {
    panelResize.bindResizableCollapse({
      element: goodsDiv,
      initialSize: goodsSize,
      minSize: 80,
      onResize: (height) => globals?.setGoodsSize?.(height),
    });
  } else if (typeof ResizeObserver !== 'undefined' && globals?.setGoodsSize) {
    try {
      new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect?.height;
          const collapsing =
            goodsDiv.classList?.contains('collapsing') ||
            (goodsDiv.classList && !goodsDiv.classList.contains('show'));
          if (typeof height === 'number' && height >= 80 && !collapsing) {
            globals.setGoodsSize(height);
          }
        }
      }).observe(goodsDiv);
    } catch (err) {
      logger.warn('Failed to observe goodsDiv resize:', err);
    }
  }
}

function bindDismiss(targetDiv, onDismiss) {
  if (!onDismiss || typeof targetDiv?.querySelector !== 'function') return;
  const closeBtn = targetDiv.querySelector('.btn-close');
  if (closeBtn && typeof closeBtn.addEventListener === 'function') {
    closeBtn.addEventListener('click', () => {
      logger.debug('goods panel dismiss clicked');
      onDismiss();
    });
  }
}

function renderGoodsPanel(currentResources, context = {}) {
  const {
    force = false,
    showGoods,
    unlocked = false,
    debug = false,
    resourceDefs = [],
    resourceNames = {},
    fallbackDiv = null,
    goodsSize: providedGoodsSize,
    onDismiss = null,
    onCopy = null,
  } = context;

  if (!currentResources || Object.keys(currentResources).length === 0) {
    return undefined;
  }

  const targetDiv =
    context.targetDiv ||
    (typeof document !== 'undefined' ?
      document.getElementById('goods') || fallbackDiv
    : fallbackDiv);

  if (!force && (showGoods === false || (!unlocked && !debug))) {
    if (targetDiv) {
      targetDiv.innerHTML = '';
      targetDiv.style.display = 'none';
    }
    logger.debug('goods render suppressed', { showGoods, unlocked, debug });
    return targetDiv;
  }

  if (typeof document === 'undefined') return null;

  const goodsText = buildGoodsRows(
    currentResources,
    resourceDefs,
    resourceNames,
  );
  const rawSize = providedGoodsSize ?? globals?.toolOptions?.goodsSize;
  const goodsSize =
    typeof rawSize === 'number' && rawSize >= 80 ? rawSize : 200;
  const isCollapsed = collapse?.collapseGoods;

  const closeMarkup =
    element?.close ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const iconMarkup =
    element?.icon ?
      element.icon('goodsicon', 'goodsText', isCollapsed)
    : `<span class="header-icon collapse-toggle fw-bold font-monospace" id="goodsicon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="goodsText" data-bs-target="#goodsText" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;
  const copyMarkup =
    element?.copy ?
      element.copy('goodsCopyID', 'success', 'right', isCollapsed)
    : '<span id="goodsCopyID" class="badge bg-success float-end right-button">Copy</span>';

  let goodsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
            ${closeMarkup}`;
  goodsHTML += `<p id="goodsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#goodsText" aria-expanded="${!isCollapsed}" aria-controls="goodsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  goodsHTML += iconMarkup;
  goodsHTML += `<strong><span data-i18n="inventory">Goods Inventory</span>:</strong></p>`;
  goodsHTML += copyMarkup;
  goodsHTML += `<div id="goodsText" style="height: ${goodsSize}px" class="overflow-y resize collapse ${
    isCollapsed ? '' : 'show'
  }"><table id="goodstable" class="goods-table w-100"><thead><tr><th class="text-start"><span data-i18n="type">Type</span></th><th class="text-end"><span data-i18n="amount">Amount</span></th></tr></thead><tbody>`;

  targetDiv.style.display = '';
  targetDiv.classList?.remove('d-none');
  targetDiv.innerHTML = goodsHTML + goodsText + `</tbody></table></div></div>`;

  bindCollapseAndResize(goodsSize);
  if (document.body && i18n?.translateContainer) {
    i18n.translateContainer(document.body);
  }
  if (typeof onCopy === 'function') {
    document.getElementById('goodsCopyID')?.addEventListener('click', onCopy);
  }
  bindDismiss(targetDiv, onDismiss);

  logger.debug('goods panel rendered', {
    rowLength: goodsText.length,
    goodsSize,
  });
  return targetDiv;
}

function setGlobals(g) {
  globals = g;
}
module.exports = {
  renderGoodsPanel,
  buildGoodsRows,
  setGlobals,
};
module.exports.default = renderGoodsPanel;
