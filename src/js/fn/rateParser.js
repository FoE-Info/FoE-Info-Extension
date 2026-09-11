/**
 * rateParser.js
 *
 * Pure helper for extracting Great Building donation rates from chat titles.
 */

function extractRateFromTitle(title) {
  if (!title || typeof title !== 'string') return 0;

  // Match decimal rates like 1.85, 1.9, 1.92, 1,9, 2.0
  const decMatch = title.match(/(?:^|\s|[^\d])([12][.,]\d{1,2})(?:$|\s|[^\d])/);
  if (decMatch) {
    const val = parseFloat(decMatch[1].replace(',', '.'));
    if (!isNaN(val) && val >= 1.0 && val <= 2.5) {
      return Math.round(val * 100);
    }
  }

  // Match percentage rates like 190%, 185%, 192%
  const pctMatch = title.match(/(\d{2,3})%/);
  if (pctMatch) {
    const val = parseInt(pctMatch[1], 10);
    if (!isNaN(val) && val >= 100 && val <= 250) {
      return val;
    }
  }

  return 0;
}

module.exports = { extractRateFromTitle };
module.exports.default = { extractRateFromTitle };
module.exports.extractRateFromTitle = extractRateFromTitle;
