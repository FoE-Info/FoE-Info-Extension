/**
 * formatters.js
 *
 * Pure string and entity formatting utilities.
 * Zero DOM dependencies; safe for both Node.js test environments and Webpack extension bundles.
 */

/**
 * Escapes HTML characters in untrusted strings to prevent XSS.
 * @param {*} str - Raw string or value to sanitize.
 * @returns {string} Sanitized string.
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats an entity ID from a string, number, or object representation.
 * @param {*} id - Entity identifier or object containing id/value/identifier.
 * @returns {string} Formatted entity id as string.
 */
function formatEntityId(id) {
  if (!id) return '';
  if (typeof id === 'object') {
    return id.value || id.id || id.identifier || String(id);
  }
  return String(id);
}

/**
 * Returns a human-friendly short name for in-game resource keys.
 * @param {string} name - Resource identifier.
 * @param {Record<string, string>} [lookup] - Optional lookup dictionary.
 * @returns {string} Human-friendly short resource name.
 */
function fResourceShortName(name, lookup = null) {
  if (name === 'sacrificial_offerings') {
    return 'Offerings';
  }
  if (name === 'something else') {
    return 'something';
  }
  if (lookup && lookup[name]) {
    return lookup[name];
  }
  return name;
}

/**
 * Normalizes and shortens reward descriptions for display badges and logs.
 * @param {string} reward - Raw reward name or description.
 * @returns {string} Shortened or normalized reward name.
 */
function fRewardShortName(reward) {
  if (!reward || typeof reward !== 'string') {
    return reward ?? '';
  }

  if (reward === 'Fragment of Statue Of Honor Selection Kit') {
    return 'SoH Fragment';
  }
  if (reward === 'Statue Of Honor Selection Kit') {
    return 'SoH Kit';
  }
  if (reward === 'Fragment of The Great Elephant Selection Kit') {
    return 'Elephant Fragment';
  }

  const firstWord = reward.split(' ')[0];
  let cleaned = reward;
  if (firstWord === '1' || firstWord === '5') {
    cleaned = reward.slice(2);
  } else if (firstWord === '5x' || firstWord === '10') {
    cleaned = reward.slice(3);
  } else if (!isNaN(Number(firstWord))) {
    cleaned = reward.slice(reward.indexOf(' ') + 1);
  }

  if (cleaned.includes('Coins')) {
    return 'Coins';
  }
  if (cleaned.includes('Goods')) {
    return 'Goods';
  }
  if (cleaned.includes('Supplies')) {
    return 'Supplies';
  }
  if (cleaned.includes('Rogue')) {
    return 'Rogues';
  }
  if (cleaned.includes('Medals')) {
    return 'Medals';
  }
  if (cleaned.includes('Forge Points')) {
    return 'Forge Points';
  }

  return cleaned;
}

/**
 * Rounds a numeric value to a fixed number of decimal places.
 * Nullish, non-finite, or non-numeric inputs resolve to 0.
 *
 * @param {*} val - Value to round.
 * @param {number} [decimals=2] - Number of decimal places (clamped to >= 0).
 * @returns {number} Rounded number, or 0 for invalid input.
 */
function fRound(val, decimals = 2) {
  const num = Number(val);
  if (val === null || val === undefined || !Number.isFinite(num)) {
    return 0;
  }
  const places =
    Number.isFinite(Number(decimals)) ?
      Math.max(0, Math.trunc(Number(decimals)))
    : 2;
  const factor = 10 ** places;
  return Math.round(num * factor) / factor;
}

/**
 * Coerces a value to a finite number, tolerating numeric strings with
 * grouping separators or whitespace. Returns the fallback otherwise.
 *
 * @param {*} val - Value to coerce.
 * @param {number} [fallback=0] - Value returned when coercion fails.
 * @returns {number} Finite number or fallback.
 */
function fNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === 'string') {
    const parsed = Number(val.replace(/[\s,]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Formats a numeric value with locale-aware thousands separators.
 * Invalid input resolves to '0'.
 *
 * @param {*} num - Value to format.
 * @param {string} [locale='en-US'] - BCP 47 locale used for grouping.
 * @returns {string} Grouped number string.
 */
function fFormatNumber(num, locale = 'en-US') {
  const parsed = typeof num === 'number' ? num : Number(num);
  if (
    num === null ||
    num === undefined ||
    num === '' ||
    !Number.isFinite(parsed)
  ) {
    return '0';
  }
  return parsed.toLocaleString(locale);
}

/**
 * Converts a camel-cased era key (e.g. 'SpaceAgeMars') into a spaced
 * display label (e.g. 'Space Age Mars'). Already-spaced values are
 * returned unchanged and nullish input resolves to an empty string.
 *
 * @param {*} ageKey - Era identifier.
 * @returns {string} Human-readable era label, or '' for nullish input.
 */
function fAgestring(ageKey) {
  if (ageKey === null || ageKey === undefined) return '';
  const raw = String(ageKey).trim();
  if (!raw) return '';
  if (raw.includes(' ')) return raw;
  return raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

module.exports = {
  escapeHTML,
  formatEntityId,
  fResourceShortName,
  fRewardShortName,
  fRound,
  fNumber,
  fFormatNumber,
  fAgestring,
};
