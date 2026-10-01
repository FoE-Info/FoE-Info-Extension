/** Renders categorized reward cards and harvest popovers. */
import * as collapse from '../fn/collapse.mjs';
import { setRewardSize, toolOptions } from '../fn/globals.mjs';
import * as helper from '../fn/helper.mjs';
import {
  cityrewards,
  rewardsArmy,
  rewardsBySource,
  rewardsCity,
  rewardsGeneric,
} from '../state/state.mjs';
import { escapeHTML } from '../utils/escape.js';
import { t, translateContainer } from '../utils/i18n.js';
import { createLogger } from '../utils/logger.js';
import * as element from './AddElement.js';
import { applyCardVisibility, getCurrentView } from './cardVisibility.js';
import { bindResizableCollapse } from './panelResize.js';
import { addToBucket } from './rewardCategories.js';
import {
  formatRewardLine,
  getRewardQuantity,
  normalizeRewardName,
} from './rewardNames.js';

const logger = createLogger('RewardRenderer');
const MIN_REWARD_SIZE = 50;

let rewardResizeBinding = null;

function savedRewardSize() {
  const size = Number(toolOptions.rewardSize);
  return (
      toolOptions.rewardSizeMode === 'fixed' &&
        Number.isFinite(size) &&
        size >= MIN_REWARD_SIZE
    ) ?
      Math.round(size)
    : null;
}

export function measureRewardContentHeight(element) {
  if (!element) return MIN_REWARD_SIZE;
  if (element.classList?.contains('show')) {
    return Math.max(MIN_REWARD_SIZE, Math.ceil(element.scrollHeight || 0));
  }

  const parent = element.parentElement;
  const clone = element.cloneNode?.(true);
  if (!parent || !clone) return MIN_REWARD_SIZE;

  clone.classList?.add('show');
  Object.assign(clone.style, {
    boxSizing: 'border-box',
    display: 'block',
    height: 'auto',
    maxHeight: 'none',
    position: 'absolute',
    visibility: 'hidden',
  });

  const view = element.ownerDocument?.defaultView;
  const parentStyle = view?.getComputedStyle?.(parent);
  const parentRect = parent.getBoundingClientRect?.();
  if (parentStyle && parentRect) {
    const px = (value) => Number.parseFloat(value) || 0;
    const width =
      parentRect.width -
      px(parentStyle.borderLeftWidth) -
      px(parentStyle.borderRightWidth) -
      px(parentStyle.paddingLeft) -
      px(parentStyle.paddingRight);
    if (width > 0) clone.style.width = `${width}px`;
  }

  parent.appendChild(clone);
  try {
    return Math.max(MIN_REWARD_SIZE, Math.ceil(clone.scrollHeight || 0));
  } finally {
    clone.remove();
  }
}

export function rewardObserve() {
  const rewardsEl = document.getElementById('rewards');
  if (rewardsEl) translateContainer(rewardsEl);
  rewardResizeBinding?.disconnect();
  const element = document.getElementById('rewardsText');
  const size = savedRewardSize();
  rewardResizeBinding = bindResizableCollapse({
    element,
    initialSize: size ?? measureRewardContentHeight(element),
    onResize: setRewardSize,
  });
}

const sourceLabels = {
  greatBuilding: 'Great Buildings',
  battleground: 'Guild Battlegrounds',
  expedition: 'Guild Expedition',
  pvpArena: 'PvP Arena',
  antiquesShop: 'Antiques Dealer Purchases',
  antiquesSales: 'Antiques Dealer Sales',
  himejiCastle: 'Himeji Castle — Spoils of War',
  spaceCarrier: 'Space Carrier — Diplomatic Gifts',
  quest: 'Quests',
  cityProductionCity: 'City Production',
  cityProductionArmy: 'Army Production',
};

function buildRewardsText() {
  return Object.entries(rewardsBySource)
    .map(([source, rewards]) => {
      const lines = Object.entries(rewards)
        .map(
          ([name, amount]) =>
            `${escapeHTML(formatRewardLine(amount, name))}<br>`,
        )
        .join('');
      return `<p><em>${escapeHTML(t('reward_source_' + source) || sourceLabels[source] || source)}</em><br>${lines}</p>`;
    })
    .join('');
}

function renderRewards() {
  const container =
    (typeof document !== 'undefined' ?
      document.getElementById('cityrewards') ||
      document.getElementById('rewards')
    : null) || cityrewards;

  if (!container) return;

  const text = buildRewardsText();
  const size = savedRewardSize();
  const sizeStyle = size === null ? '' : `style="height: ${size}px"`;
  container.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#rewardsText" aria-expanded="${!collapse.collapseRewards}" aria-controls="rewardsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	${element.close()}
	<div id="rewardsText" ${sizeStyle} class="overflow resize collapse ${
    collapse.collapseRewards ? '' : 'show'
  }"><div class="overflow-y">${text}</div></div>`;
  rewardObserve();
  if (getCurrentView()) applyCardVisibility();
  const labelEl = document.getElementById('rewardsTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#rewardsicon')
      ) {
        return;
      }
      collapse.fCollapseRewards();
    });
  }
  const iconEl = document.getElementById('rewardsicon');
  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      collapse.fCollapseRewards();
    });
  }
}

/**
 * Single authority for reward categorization and rendering.
 *
 * @param {string} source Explicit reward source, e.g. 'greatBuilding',
 *   'quest', 'cityProductionArmy', or 'cityProductionCity'.
 * @param {object} payload Reward item carrying name/subType/amount/type.
 */
export function showReward(source, payload) {
  if (!payload || typeof payload !== 'object') {
    logger.debug('showReward ignored invalid payload', source);
    return;
  }

  const rawName =
    payload.name ||
    payload.blueprint?.name ||
    payload.subType ||
    (payload.type === 'blueprint' ? 'Blueprint' : 'Reward');
  let name =
    typeof rawName === 'string' ? helper.fRewardShortName(rawName) : 'Reward';
  const qty = getRewardQuantity(payload);

  if (payload.type === 'resource') {
    name = helper.fResourceShortName(payload.subType) || name;
  } else if (payload.type === 'blueprint' || source === 'greatBuilding') {
    const resolvedBuilding =
      payload.subType ? helper.fGBname(payload.subType) : '';
    if (!payload.name && !payload.blueprint?.name) {
      name =
        resolvedBuilding && resolvedBuilding !== payload.subType ?
          `${resolvedBuilding} Blueprint`
        : 'Blueprint';
    }

    if (
      (payload.type === 'blueprint' ||
        (source === 'greatBuilding' &&
          (payload.name || '').toLowerCase().includes('blueprint'))) &&
      !name.toLowerCase().includes('bp') &&
      !name.toLowerCase().includes('blueprint')
    ) {
      name = `${name} BP`;
    }
  }

  name = normalizeRewardName(name);

  const bucketKey = addToBucket(
    { rewardsGeneric, rewardsCity, rewardsArmy },
    source,
    name,
    qty,
  );
  if (!bucketKey) {
    logger.warn('showReward unknown reward source', source);
    return;
  }

  const sourceRewards =
    Object.hasOwn(rewardsBySource, source) ?
      rewardsBySource[source]
    : Object.create(null);
  Object.defineProperty(rewardsBySource, source, {
    value: sourceRewards,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  sourceRewards[name] = (Number(sourceRewards[name]) || 0) + qty;

  logger.debug('reward routed', source, '->', bucketKey, name, qty);
  renderRewards();
}
