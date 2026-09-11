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

module.exports = {
  escapeHTML,
  formatEntityId,
  fResourceShortName,
  fRewardShortName,
};
