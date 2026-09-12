/**
 * Native Vanilla i18n Engine for FoE-Info
 * Replaces @wikimedia/jquery.i18n without jQuery dependency.
 */

const dictionaries = {};
let currentLocale = 'en';

function getLocale() {
  return currentLocale;
}

function setLocale(locale) {
  if (locale && typeof locale === 'string') {
    currentLocale = locale;
  }
}

function loadTranslations(locale, data) {
  if (!locale || !data) return;
  dictionaries[locale] = {
    ...(dictionaries[locale] || {}),
    ...data,
  };
}

async function loadLocale(locale, urlOrPath) {
  if (!urlOrPath) return;
  if (typeof urlOrPath === 'object') {
    loadTranslations(locale, urlOrPath);
    return;
  }
  try {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    loadTranslations(locale, data);
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[i18n] Failed loading ${locale} from ${urlOrPath}:`, err);
    }
  }
}

async function loadAll(localesMap) {
  if (!localesMap || typeof localesMap !== 'object') return;
  const promises = Object.entries(localesMap).map(([loc, pathOrObj]) =>
    loadLocale(loc, pathOrObj),
  );
  await Promise.all(promises);
}

function t(key, ...args) {
  if (!key) return '';
  const currentDict = dictionaries[currentLocale] || {};
  const enDict = dictionaries['en'] || {};
  let str = currentDict[key] ?? enDict[key] ?? key;

  if (args.length > 0 && typeof str === 'string') {
    args.forEach((val, idx) => {
      str = str.replace(new RegExp(`\\$${idx + 1}`, 'g'), String(val ?? ''));
    });
  }
  return str;
}

const I18N_ATTRIBUTES = [
  ['data-i18n', 'textContent'],
  ['data-i18n-title', 'title'],
  ['data-i18n-aria-label', 'aria-label'],
  ['data-i18n-placeholder', 'placeholder'],
];

function collectI18nElements(container) {
  const elements = [];
  const hasBinding = (el) =>
    typeof el.getAttribute === 'function' &&
    I18N_ATTRIBUTES.some(([attr]) => el.getAttribute(attr));
  if (hasBinding(container)) elements.push(container);
  if (typeof container.querySelectorAll === 'function') {
    const selector = I18N_ATTRIBUTES.map(([attr]) => `[${attr}]`).join(', ');
    const matched = container.querySelectorAll(selector);
    for (let i = 0; i < matched.length; i++) {
      elements.push(matched[i]);
    }
  }
  return elements;
}

function translateContainer(container) {
  if (!container) return;
  for (const el of collectI18nElements(container)) {
    if (typeof el.getAttribute !== 'function') continue;
    for (const [attr, target] of I18N_ATTRIBUTES) {
      const key = el.getAttribute(attr);
      if (!key) continue;
      if (target === 'textContent') {
        el.textContent = t(key);
      } else if (typeof el.setAttribute === 'function') {
        el.setAttribute(target, t(key));
      }
    }
  }
}

function setupI18nBridge(
  scope = typeof window !== 'undefined' ? window : globalThis,
) {
  if (!scope) return;

  scope.i18n = {
    t,
    translateContainer,
    translateDom: translateContainer,
    setLocale,
    getLocale,
    loadTranslations,
    loadLocale,
    loadAll,
  };

  let jq = scope.jQuery || scope.$;
  if (!jq) {
    jq = function (selector) {
      if (typeof document === 'undefined') {
        return {
          i18n: () => {},
          length: 0,
        };
      }
      const el =
        typeof selector === 'string' ?
          document.querySelector(selector)
        : selector;
      return {
        i18n: () => {
          if (el) translateContainer(el);
        },
        length: el ? 1 : 0,
      };
    };
    scope.$ = jq;
  }

  if (jq) {
    if (!jq.fn) {
      jq.fn = {};
    }
    jq.fn.i18n = function () {
      if (typeof this.each === 'function') {
        this.each((_, el) => translateContainer(el));
      }
      return this;
    };

    jq.i18n = function (arg1, ...args) {
      if (typeof arg1 === 'object' && arg1 !== null) {
        if (arg1.locale) setLocale(arg1.locale);
        return jq.i18n;
      }
      if (typeof arg1 === 'string') {
        return t(arg1, ...args);
      }
      return {
        locale: currentLocale,
        load: (map) => ({
          done: (cb) => {
            loadAll(map).then(() => {
              if (typeof cb === 'function') cb();
            });
            return this;
          },
        }),
      };
    };
    jq.i18n.debug = false;
  }
}

if (typeof window !== 'undefined') {
  setupI18nBridge(window);
}

module.exports = {
  getLocale,
  setLocale,
  loadTranslations,
  loadLocale,
  loadAll,
  t,
  translateContainer,
  translateDom: translateContainer,
  setupI18nBridge,
};
module.exports.default = module.exports;
