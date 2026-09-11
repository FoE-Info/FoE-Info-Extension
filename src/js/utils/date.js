/**
 * date.js
 *
 * Lightweight, customizable date and time formatting utility for FoE-Info.
 * Provides European 24-hour format defaults (DD.MM.YYYY HH:mm:ss) and customizable
 * token patterns without external bundle dependencies.
 */

const DATE_PRESETS = {
  date: ['DD.MM.YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD.MM.YY'],
  time: ['HH:mm:ss', 'HH:mm', 'hh:mm:ss A', 'hh:mm a'],
  dateTime: [
    'DD.MM.YYYY HH:mm:ss',
    'YYYY-MM-DD HH:mm:ss',
    'MM/DD/YYYY hh:mm:ss A',
    'DD.MM.YYYY HH:mm',
  ],
};

const DEFAULT_DATE_FORMAT = 'DD.MM.YYYY';
const DEFAULT_TIME_FORMAT = 'HH:mm:ss';
const DEFAULT_DATETIME_FORMAT = 'DD.MM.YYYY HH:mm:ss';

let activeConfig = {
  dateFormat: DEFAULT_DATE_FORMAT,
  timeFormat: DEFAULT_TIME_FORMAT,
  dateTimeFormat: DEFAULT_DATETIME_FORMAT,
  customPattern: '',
};

function setTimeFormattingConfig(config) {
  if (!config) {
    activeConfig = {
      dateFormat: DEFAULT_DATE_FORMAT,
      timeFormat: DEFAULT_TIME_FORMAT,
      dateTimeFormat: DEFAULT_DATETIME_FORMAT,
      customPattern: '',
    };
    return;
  }
  activeConfig = {
    dateFormat: config.dateFormat || DEFAULT_DATE_FORMAT,
    timeFormat: config.timeFormat || DEFAULT_TIME_FORMAT,
    dateTimeFormat: config.dateTimeFormat || DEFAULT_DATETIME_FORMAT,
    customPattern: config.customPattern || '',
  };
}

function getTimeFormattingConfig() {
  return { ...activeConfig };
}

function getEffectiveFormat(type = 'dateTime') {
  if (type === 'date') return activeConfig.dateFormat || DEFAULT_DATE_FORMAT;
  if (type === 'time') return activeConfig.timeFormat || DEFAULT_TIME_FORMAT;
  return (
    activeConfig.customPattern ||
    activeConfig.dateTimeFormat ||
    DEFAULT_DATETIME_FORMAT
  );
}

/**
 * Resolves various timestamp inputs (Date object, seconds, milliseconds, ISO string) into a valid Date.
 *
 * @param {Date|number|string} input Timestamp or Date
 * @returns {Date|null} Valid Date object or null if invalid
 */
function resolveDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    if (input <= 0 || isNaN(input)) return null;
    // Seconds timestamp threshold (< 1e11 is approx year 5138 in seconds)
    const ms = input < 1e11 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const num = Number(input);
    if (!isNaN(num) && num > 0) {
      return resolveDate(num);
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Replaces format tokens on a Date object.
 *
 * Tokens supported:
 * - YYYY: 4-digit year (e.g. 2026)
 * - YY: 2-digit year (e.g. 26)
 * - MM: 2-digit month (01-12)
 * - DD: 2-digit day of month (01-31)
 * - HH: 2-digit hour 24h (00-23)
 * - hh: 2-digit hour 12h (01-12)
 * - mm: 2-digit minute (00-59)
 * - ss: 2-digit second (00-59)
 * - A: Upper AM/PM
 * - a: Lower am/pm
 *
 * @param {Date} date Valid Date object
 * @param {string} pattern Format string pattern
 * @returns {string} Formatted string
 */
function formatPattern(date, pattern = DEFAULT_DATETIME_FORMAT) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h24 = date.getHours();
  const min = date.getMinutes();
  const s = date.getSeconds();

  const h12 = h24 % 12 || 12;
  const isPM = h24 >= 12;

  const pad = (val) => String(val).padStart(2, '0');

  // Support escaping brackets: [text] preserves text literally
  const literals = [];
  const withPlaceholders = pattern.replace(/\[([^\]]+)\]/g, (_, literal) => {
    literals.push(literal);
    return `___LITERAL_${literals.length - 1}___`;
  });

  const tokens = {
    YYYY: String(y),
    YY: String(y).slice(-2),
    MM: pad(m),
    DD: pad(d),
    HH: pad(h24),
    hh: pad(h12),
    mm: pad(min),
    ss: pad(s),
    A: isPM ? 'PM' : 'AM',
    a: isPM ? 'pm' : 'am',
  };

  let formatted = withPlaceholders.replace(
    /\b(YYYY|YY|MM|DD|HH|hh|mm|ss)\b|(?<![a-zA-Z])([Aa])(?![a-zA-Z])/g,
    (match) => tokens[match] || match,
  );

  // Restore literals
  formatted = formatted.replace(
    /___LITERAL_(\d+)___/g,
    (_, idx) => literals[Number(idx)] || '',
  );

  return formatted;
}

/**
 * Formats a date using the provided pattern or default European date format (DD.MM.YYYY).
 *
 * @param {Date|number|string} input Timestamp or Date
 * @param {string} [pattern=DEFAULT_DATE_FORMAT] Pattern
 * @returns {string} Formatted date string
 */
function formatDate(input, pattern) {
  const d = resolveDate(input);
  return d ? formatPattern(d, pattern || getEffectiveFormat('date')) : '';
}

/**
 * Formats a time using the provided pattern or default European 24h format (HH:mm:ss).
 *
 * @param {Date|number|string} input Timestamp or Date
 * @param {string} [pattern] Pattern (defaults to user configured time format)
 * @returns {string} Formatted time string
 */
function formatTime(input, pattern) {
  const d = resolveDate(input);
  return d ? formatPattern(d, pattern || getEffectiveFormat('time')) : '';
}

/**
 * Formats full datetime using the provided pattern or default European datetime format (DD.MM.YYYY HH:mm:ss).
 *
 * @param {Date|number|string} input Timestamp or Date
 * @param {string} [pattern] Pattern (defaults to user configured datetime format)
 * @returns {string} Formatted datetime string
 */
function formatDateTime(input, pattern) {
  const d = resolveDate(input);
  return d ? formatPattern(d, pattern || getEffectiveFormat('dateTime')) : '';
}

module.exports = {
  DATE_PRESETS,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_DATETIME_FORMAT,
  setTimeFormattingConfig,
  getTimeFormattingConfig,
  getEffectiveFormat,
  resolveDate,
  formatPattern,
  formatDate,
  formatTime,
  formatDateTime,
};
