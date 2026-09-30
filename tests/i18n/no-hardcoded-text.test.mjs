/**
 * Guard against hardcoded user-visible English in the chrome entry HTMLs,
 * the ui/ panel layer, and fn/ helpers that produce markup: every visible
 * text must go through a data-i18n* attribute or (in JS) a t()/escape
 * helper — or be explicitly allowlisted.
 *
 * Chosen approach: static, offline analysis.
 * - HTML: text nodes in <body> whose enclosing element carries no data-i18n*
 *   attribute are flagged. Templates (<%= %>) are ignored.
 * - JS: single-quoted/double-quoted literal assignments to .textContent with
 *   alphabetic content are flagged (template-literal innerHTML builds are
 *   dominated by data-i18n spans and are covered by the render-time
 *   translateContainer calls; scanning them heuristically would produce an
 *   unusable false-positive rate).
 *
 * Known existing violations are allowlisted with a reason; adding a NEW
 * hardcoded string makes this test fail. Wave B owns adding the missing
 * translation keys and removing allowlist entries.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const CHROME = path.join(ROOT, 'src/chrome');
const UI_DIR = path.join(ROOT, 'src/js/ui');
const HTML_FILES = [
  'panel.html',
  'options.html',
  'popup.html',
  'devtools.html',
];

/**
 * Strings that are knowingly untranslated today. Format: file -> substring
 * (whitespace-collapsed, case-sensitive) -> reason.
 */
const HTML_ALLOWLIST = {
  'popup.html': [
    // Activation instructions + the whole page have NO keys yet;
    // Wave B adds keys (popup_*) and removes these entries.
    'How to activate:',
    '1) Ctrl+Shift+I (Win/Linux)',
    'Command+Option+I (MAC)', // same <p> as above, split by <br/>
    '2) Right-Click, then select Inspect',
    '3) Browser Menu > More Tools > Developer Tools',
    'Click on tab >>',
    'Open Options Page',
  ],
  'options.html': [
    // <option> labels that show DATE FORMAT EXAMPLES and LOCALE NAMES —
    // content samples, intentionally not translated. Wave B may revisit.
    'EU 24h (',
    'UK 24h (',
    'US 12h (',
    'English',
    'Dutch',
    'Finnish',
    'French',
    'German',
    'Greek',
    'Italian',
    'Spanish',
    'Swedish',
  ],
};

/** Literal .textContent assignments in ui/ that are not user-visible prose. */
const JS_TEXTCONTENT_ALLOWLIST = new Set([
  'bug_report', // Material Icons ligature (icon glyph), not prose
]);

const hasLetters = (s) => /[A-Za-z]/.test(s);

const decodeEntities = (s) =>
  s
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const collapse = (s) => decodeEntities(s.replace(/\s+/g, ' ')).trim();

function stripBlocks(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');
}

/** Returns [text, ancestorAttrsList] pairs: text nodes with their enclosing elements' attribute strings. */
function extractTextNodes(html) {
  const out = [];
  const stack = []; // attribute strings of open start tags
  const tokenRe = /<[^>]*>/g;
  let last = 0;
  let match;
  while ((match = tokenRe.exec(html)) !== null) {
    const text = html.slice(last, match.index);
    if (hasLetters(text) && !text.includes('<%=')) {
      out.push([text, [...stack]]);
    }
    const tag = match[0];
    if (/^<\//.test(tag)) {
      stack.pop();
    } else if (!/\/>$/.test(tag) && /^<[a-zA-Z]/.test(tag)) {
      stack.push(tag);
    }
    last = tokenRe.lastIndex;
  }
  const trailing = html.slice(last);
  if (hasLetters(trailing) && !trailing.includes('<%=')) {
    out.push([trailing, [...stack]]);
  }
  return out;
}

function findHtmlViolations(file, html) {
  const allow = HTML_ALLOWLIST[file] || [];
  const body = html.slice(html.search(/<body[\s>]/i));
  const violations = [];
  for (const [text, ancestors] of extractTextNodes(stripBlocks(body))) {
    const wrapped = ancestors.some((tag) => /data-i18n/i.test(tag));
    if (wrapped) continue;
    const normalized = collapse(text);
    if (allow.some((a) => normalized.includes(a))) continue;
    if (normalized) violations.push(normalized);
  }
  return violations;
}

/** Single-line literal .textContent assignments with alphabetic content. */
function findJsViolations(source) {
  const violations = [];
  const re = /\.textContent\s*=\s*(['"])([^'"\n]+)\1/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const value = match[2];
    if (!hasLetters(value)) continue;
    if (JS_TEXTCONTENT_ALLOWLIST.has(value)) continue;
    violations.push(value);
  }
  return violations;
}

describe('no hardcoded user-visible text in chrome entry HTMLs', () => {
  for (const file of HTML_FILES) {
    it(`${file} renders visible text only via data-i18n (or the allowlist)`, () => {
      const html = fs.readFileSync(path.join(CHROME, file), 'utf8');
      const violations = findHtmlViolations(file, html);
      assert.deepEqual(
        violations,
        [],
        `Hardcoded user-visible text in ${file} — add data-i18n + keys ` +
          `(all 7 locales) or extend HTML_ALLOWLIST with a reason.`,
      );
    });
  }
});

describe('no hardcoded user-visible text in ui/ textContent assignments', () => {
  it('every literal textContent assignment goes through i18n or the allowlist', () => {
    const files = fs
      .readdirSync(UI_DIR, { recursive: true })
      .filter((f) => f.endsWith('.js'))
      .map((f) => path.join(UI_DIR, f));
    const violations = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const v of findJsViolations(source)) {
        violations.push(`${path.relative(ROOT, file)}: "${v}"`);
      }
    }
    assert.deepEqual(
      violations,
      [],
      'Hardcoded user-visible strings in ui/ — route through t() or extend ' +
        'JS_TEXTCONTENT_ALLOWLIST with a reason.',
    );
  });
});
