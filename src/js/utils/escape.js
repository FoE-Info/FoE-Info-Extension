/**
 * escape.js
 *
 * Shared, fail-closed escaping core.
 *
 * Contract - this module escapes untrusted TEXT and ATTRIBUTE content.
 * It is NEVER a sanitiser for trusted-HTML sinks: do not feed markup here
 * and then render it as HTML; escaping encodes dangerous characters, it
 * does not validate or "clean" markup.
 *
 * Every function is total: null/undefined -> '', non-strings -> String(value),
 * never throws, never mutates the input.
 *
 * CJS dual-format note: `src/js/utils/formatters.js` (CJS) requires this
 * module directly, and the repo's package.json is `"type": "commonjs"`,
 * so this file uses `module.exports`. ESM consumers (`import { escapeHTML }
 * from './escape.js'`) still get named exports.
 */

/**
 * Escapes HTML-special characters in untrusted content for use as TEXT.
 * Escapes `& < > " '`.
 * @param {*} value - Raw value (string, number, object, null, undefined).
 * @returns {string} Escaped string safe for HTML text contexts.
 */
function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return escapeString(typeof value === 'string' ? value : String(value));
}

/**
 * Escapes HTML-special characters in untrusted content for use inside a
 * quoted HTML ATTRIBUTE (e.g. `title="${escapeHTMLAttribute(x)}"`).
 * Same escape set as TEXT; requires the surrounding markup to quote
 * attribute values with `"` for full protection.
 * @param {*} value - Raw value (string, number, object, null, undefined).
 * @returns {string} Escaped string safe for quoted HTML attribute contexts.
 */
function escapeHTMLAttribute(value) {
  if (value === null || value === undefined) return '';
  return escapeString(typeof value === 'string' ? value : String(value));
}

/**
 * Converts any value to a display string.
 * `null` and `undefined` become `''` (not the string "null"/"undefined").
 * @param {*} value - Raw value.
 * @returns {string} Display-safe string.
 */
function toDisplayString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

const ESCAPE_PATTERN = /[&<>"']/g;

/**
 * Escape (never strip) the dangerous characters via a single pass.
 * @param {string} input - Raw string.
 * @returns {string} Escaped string.
 */
function escapeString(input) {
  return input.replace(ESCAPE_PATTERN, (ch) => ESCAPE_MAP[ch]);
}

module.exports = { escapeHTML, escapeHTMLAttribute, toDisplayString };
