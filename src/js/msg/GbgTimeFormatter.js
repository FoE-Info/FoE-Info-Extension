/**
 * GbgTimeFormatter.js
 *
 * Guild Battlegrounds time formatting and server market resolution.
 * Extracted from GuildBattlegroundService.js for modularity.
 */
let resolveDate = (d) => (d ? new Date(d) : null);
let formatInTimeZone = (d) => (d ? d.toISOString() : '');
let getTimeFormattingConfig = () => ({});
try {
  ({
    resolveDate,
    formatInTimeZone,
    getTimeFormattingConfig,
  } = require('../utils/date.js'));
} catch {}

let createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
try {
  ({ createLogger } = require('../utils/logger.js'));
} catch {}

const logger = createLogger('GbgTimeFormatter');

const SERVER_TIMEZONES = {
  en: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  zz: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  us: { timeZone: 'America/New_York', locale: 'en-US', hour12: true },
  de: { timeZone: 'Europe/Berlin', locale: 'de-DE', hour12: false },
  fr: { timeZone: 'Europe/Paris', locale: 'fr-FR', hour12: false },
  gr: { timeZone: 'Europe/Athens', locale: 'el-GR', hour12: false },
  fi: { timeZone: 'Europe/Helsinki', locale: 'fi-FI', hour12: false },
  ru: { timeZone: 'Europe/Moscow', locale: 'ru-RU', hour12: false },
  es: { timeZone: 'Europe/Madrid', locale: 'es-ES', hour12: false },
  it: { timeZone: 'Europe/Rome', locale: 'it-IT', hour12: false },
  nl: { timeZone: 'Europe/Amsterdam', locale: 'nl-NL', hour12: false },
  pl: { timeZone: 'Europe/Warsaw', locale: 'pl-PL', hour12: false },
  br: { timeZone: 'America/Sao_Paulo', locale: 'pt-BR', hour12: false },
};

/**
 * Resolves market code (e.g. 'en', 'zz', 'us', 'de') from game origin URL.
 * @param {string} origin
 * @returns {string} Market code
 */
function getServerMarket(origin) {
  if (!origin || typeof origin !== 'string') return 'en';
  const clean = origin.trim().toLowerCase();
  if (clean.includes('zz') || clean.includes('beta')) return 'zz';
  const hostMatch = clean.match(
    /(?:https?:\/\/)?([a-z]{2,3})\d*\.forgeofempires\.com/i,
  );
  if (hostMatch && hostMatch[1]) {
    return hostMatch[1];
  }
  const prefixMatch = clean.match(/^(?:https?:\/\/)?([a-z]{2,3})\d*/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1];
  }
  return 'en';
}

/**
 * Formats a date for GBG target display in server or local time mode.
 * @param {Date|number|string} date
 * @param {string|Object} [origin]
 * @param {Object} [options]
 * @returns {string} Formatted time string (e.g. '@ 20:00')
 */
function timeGBG(
  date,
  origin = typeof globalThis.GameOrigin !== 'undefined' ?
    globalThis.GameOrigin
  : '',
  options = {},
) {
  if (!date) return '';
  if (typeof origin === 'object' && origin !== null) {
    options = origin;
    origin =
      typeof globalThis.GameOrigin !== 'undefined' ? globalThis.GameOrigin : '';
  }
  const d = resolveDate(date);
  if (!d) return '';

  const timeMode =
    options?.GBGtimeMode ||
    (typeof globalThis.showOptions !== 'undefined' &&
      globalThis.showOptions?.GBGtimeMode) ||
    'server';

  if (timeMode === 'local') {
    let is12Hour = false;
    try {
      const cfg = getTimeFormattingConfig();
      is12Hour = /\bhh\b|[Aa]/.test(
        cfg.customPattern || cfg.timeFormat || cfg.dateTimeFormat,
      );
    } catch (err) {
      logger.debug('Failed to get time formatting config:', err);
    }
    if (is12Hour) {
      const h24 = d.getHours();
      const h12 = h24 % 12 || 12;
      const hours = String(h12).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      return `@ ${hours}:${minutes} ${ampm}`;
    }
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `@ ${hours}:${minutes}`;
  }

  const market = getServerMarket(origin);
  const config = SERVER_TIMEZONES[market] || {
    timeZone: 'Europe/Berlin',
    locale: 'de-DE',
    hour12: false,
  };

  const formatted = formatInTimeZone(d, {
    locale: config.locale,
    timeZone: config.timeZone,
    hour12: config.hour12,
  });

  return `@ ${formatted}`;
}

module.exports = {
  SERVER_TIMEZONES,
  getServerMarket,
  timeGBG,
};
module.exports.default = module.exports;
