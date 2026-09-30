/**
 * langBootstrap.js — CSP-compliant first-paint <html lang> sync.
 *
 * Must be loaded as a synchronous blocking <script> in <head> BEFORE
 * HtmlWebpackPlugin-injected entry scripts, so screen readers and
 * :lang() CSS selectors see the correct language during first paint.
 *
 * Maps navigator.language to one of the 7 supported i18n locales
 * (de, el, en, es, fr, gr, it).  Unsupported browser languages
 * fall back to 'en' so the lang attribute never claims a locale the
 * extension cannot actually serve.
 *
 * After storage bootstrap runs, syncDocumentLanguage() in i18n.js
 * corrects <html lang> to the user's stored preference — this file
 * only closes the gap before that async path completes.
 */
(function () {
  let SUPPORTED = { de: 1, el: 1, en: 1, es: 1, fr: 1, gr: 1, it: 1 };
  let raw = (navigator && navigator.language) || 'en';
  let code = raw.split('-')[0].toLowerCase();
  document.documentElement.lang = SUPPORTED[code] ? code : 'en';
})();
