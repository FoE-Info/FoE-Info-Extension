/**
 * TradeService.js
 *
 * Marketplace trade-offer service: parses `TradeService.getTradeOffers`,
 * computes offer:need ratios, and classifies fair trades (same era 1:1,
 * adjacent era 2:1 / 1:2). Era lookup is injected for dynamic metadata and
 * falls back to canonical value ratios. Zero DOM; dual CJS/ESM compatible.
 */

const BigNumber = require('bignumber.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('TradeService');
} catch {}

let fLevelfromAge = null;
try {
  fLevelfromAge = require('../calc/eraMapping.js').fLevelfromAge;
} catch {}

let defaultResolveEra = null;
function getDefaultResolveEra() {
  if (defaultResolveEra) return defaultResolveEra;
  try {
    const { metadataStore } = require('../state/MetadataStore.js');
    defaultResolveEra = (goodId) =>
      metadataStore?.getResource?.(goodId)?.era || null;
  } catch {
    defaultResolveEra = () => null;
  }
  return defaultResolveEra;
}

function toBigNumber(value) {
  if (value instanceof BigNumber) return value;
  const bn = new BigNumber(value ?? 0);
  return bn.isNaN() ? new BigNumber(0) : bn;
}

function formatRatioLabel(ratio) {
  const bn = toBigNumber(ratio);
  if (bn.eq(1)) return '1:1';
  if (bn.eq(2)) return '2:1';
  if (bn.eq(0.5)) return '1:2';
  return `${bn.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}:1`;
}

function normalizeTradeOffer(raw = {}) {
  const offer = raw.offer || {};
  const need = raw.need || {};
  const merchant = raw.merchant || {};
  return {
    id: raw.id ?? null,
    offerGoodId: offer.good_id || '',
    needGoodId: need.good_id || '',
    offerValue: toBigNumber(offer.value),
    needValue: toBigNumber(need.value),
    quantity: Number(raw.quantity ?? 1) || 1,
    createdAt: Number(raw.offer_created_at ?? 0) || 0,
    merchant: {
      playerId: merchant.player_id ?? merchant.id ?? 0,
      name: merchant.name || '',
      era: merchant.era || null,
      isNeighbor: Boolean(merchant.is_neighbor),
      isActive: merchant.is_active !== false,
      score: Number(merchant.score ?? 0) || 0,
    },
    raw,
  };
}

function parseTradeOffers(responseData) {
  const raw =
    Array.isArray(responseData?.offers) ? responseData.offers
    : Array.isArray(responseData) ? responseData
    : [];
  return raw.filter(Boolean).map(normalizeTradeOffer);
}

function calculateTradeRatio(offer = {}) {
  const offerValue = toBigNumber(offer.offerValue ?? offer.offer?.value);
  const needValue = toBigNumber(offer.needValue ?? offer.need?.value);

  if (needValue.isZero()) {
    return {
      valid: false,
      ratio: null,
      label: '—',
      offerValue,
      needValue,
    };
  }

  const ratio = offerValue.dividedBy(needValue);
  return {
    valid: true,
    ratio,
    label: formatRatioLabel(ratio),
    offerValue,
    needValue,
  };
}

function getEraRelationship(offerGoodId, needGoodId, resolveEra) {
  const resolve =
    typeof resolveEra === 'function' ? resolveEra : getDefaultResolveEra();

  let offerEra = null;
  let needEra = null;
  try {
    offerEra = resolve(offerGoodId) || null;
  } catch {}
  try {
    needEra = resolve(needGoodId) || null;
  } catch {}

  if (!offerEra || !needEra) {
    return { relationship: 'unknown', offerEra, needEra, distance: null };
  }
  if (offerEra === needEra) {
    return { relationship: 'same', offerEra, needEra, distance: 0 };
  }

  const offerLevel =
    typeof fLevelfromAge === 'function' ? fLevelfromAge(offerEra) : -1;
  const needLevel =
    typeof fLevelfromAge === 'function' ? fLevelfromAge(needEra) : -1;
  if (offerLevel < 0 || needLevel < 0) {
    return { relationship: 'unknown', offerEra, needEra, distance: null };
  }

  const distance = needLevel - offerLevel;
  return {
    relationship: Math.abs(distance) === 1 ? 'adjacent' : 'distant',
    offerEra,
    needEra,
    distance,
  };
}

function classifyFairTrade(offer = {}, options = {}) {
  const ratioInfo = calculateTradeRatio(offer);
  const era = getEraRelationship(
    offer.offerGoodId ?? offer.offer?.good_id,
    offer.needGoodId ?? offer.need?.good_id,
    options.resolveEra,
  );

  const ratio = ratioInfo.valid ? ratioInfo.ratio : null;
  let fair = false;
  let category = 'unfair';

  if (ratio) {
    if (era.relationship === 'unknown') {
      // No era metadata: classify by the canonical value ratios only.
      if (ratio.eq(1)) {
        fair = true;
        category = 'same-era';
      } else if (ratio.eq(2) || ratio.eq(0.5)) {
        fair = true;
        category = 'adjacent-era';
      }
    } else if (era.relationship === 'same' && ratio.eq(1)) {
      fair = true;
      category = 'same-era';
    } else if (
      era.relationship === 'adjacent' &&
      (ratio.eq(2) || ratio.eq(0.5))
    ) {
      fair = true;
      category = 'adjacent-era';
    }
  }

  const result = {
    ...ratioInfo,
    eraRelationship: era.relationship,
    offerEra: era.offerEra,
    needEra: era.needEra,
    eraDistance: era.distance,
    fair,
    category,
  };

  logger?.debug('Classified trade offer', {
    offerGoodId: offer.offerGoodId ?? offer.offer?.good_id,
    needGoodId: offer.needGoodId ?? offer.need?.good_id,
    ratio: ratio ? ratio.toString() : null,
    eraRelationship: era.relationship,
    fair,
    category,
  });

  return result;
}

function isFairTrade(offer = {}, options = {}) {
  return classifyFairTrade(offer, options).fair;
}

class TradeService {
  constructor({ resolveEra } = {}) {
    this.resolveEra = typeof resolveEra === 'function' ? resolveEra : null;
    this.offers = [];
    this.lastUpdated = null;
    this.getTradeOffers = this.getTradeOffers.bind(this);
  }

  getTradeOffers(msg) {
    this.offers = parseTradeOffers(msg?.responseData);
    this.lastUpdated = Date.now();
    logger?.debug('Parsed marketplace trade offers', {
      count: this.offers.length,
    });
    return { success: true, count: this.offers.length, offers: this.offers };
  }

  getOffers() {
    return this.offers;
  }

  getTradeOffer(id) {
    return this.offers.find((o) => String(o.id) === String(id)) || null;
  }

  classify(offer) {
    return classifyFairTrade(offer, { resolveEra: this.resolveEra });
  }

  getFairTrades() {
    return this.offers.filter((offer) => this.classify(offer).fair);
  }
}

const tradeService = new TradeService();

module.exports = {
  TradeService,
  tradeService,
  normalizeTradeOffer,
  parseTradeOffers,
  calculateTradeRatio,
  classifyFairTrade,
  isFairTrade,
  getEraRelationship,
  formatRatioLabel,
};
module.exports.default = tradeService;
