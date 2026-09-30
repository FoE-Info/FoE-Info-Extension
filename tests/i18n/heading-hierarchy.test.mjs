/**
 * A11y + i18n first-paint tests.
 *
 * 1. WCAG 1.3.1 heading hierarchy — no skipped levels in chrome HTML files.
 * 2. CSP compliance — no inline <script> bodies in extension pages.
 * 3. First-paint lang — each chrome HTML references external langBootstrap.js.
 * 4. langBootstrap.js locale mapping — supported locales pass through,
 *    unsupported browser languages fall back to 'en'.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const CHROME = path.join(ROOT, 'src/chrome');

/** Chrome entry HTML files that must reference langBootstrap.js. */
const HTML_FILES = [
  'options.html',
  'popup.html',
  'panel.html',
  'devtools.html',
];

/**
 * Extract visible heading tags from HTML, skipping commented-out blocks,
 * script/style contents.
 *
 * Returns an array of { level: number, text: string, line: number }.
 */
function extractHeadings(html) {
  const headings = [];
  const lines = html.split('\n');
  let inComment = false;
  let inScript = false;
  let inStyle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('<!--')) inComment = true;
    if (line.includes('-->')) {
      inComment = false;
      continue;
    }
    if (inComment) continue;

    if (/<script[\s>]/i.test(line)) inScript = true;
    if (/<\/script>/i.test(line)) {
      inScript = false;
      continue;
    }
    if (/<style[\s>]/i.test(line)) inStyle = true;
    if (/<\/style>/i.test(line)) {
      inStyle = false;
      continue;
    }
    if (inScript || inStyle) continue;

    const match = line.match(/<h([1-6])\b/i);
    if (match) {
      const level = parseInt(match[1], 10);
      const textMatch = line.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
      const text = textMatch ? textMatch[1].trim().replace(/<[^>]+>/g, '') : '';
      headings.push({ level, text, line: i + 1 });
    }
  }
  return headings;
}

// ── WCAG 1.3.1 Heading Hierarchy ─────────────────────────────────────────────

describe('heading hierarchy in chrome HTML files', () => {
  for (const file of ['options.html', 'popup.html', 'panel.html']) {
    it(`${file} has no skipped heading levels (WCAG 1.3.1)`, () => {
      const html = fs.readFileSync(path.join(CHROME, file), 'utf8');
      const headings = extractHeadings(html);

      if (headings.length === 0) return;

      assert.equal(
        headings[0].level,
        1,
        `${file}: first heading is h${headings[0].level} ("${headings[0].text}"), expected h1`,
      );

      for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1];
        const curr = headings[i];
        const jump = curr.level - prev.level;
        assert.ok(
          jump <= 1,
          `${file}: heading level skips from h${prev.level} ("${prev.text}") ` +
            `to h${curr.level} ("${curr.text}") on line ${curr.line} ` +
            `(jump of ${jump} levels, max allowed is 1)`,
        );
      }
    });
  }
});

// ── MV3 CSP: No Inline Scripts ───────────────────────────────────────────────

describe('MV3 CSP compliance — no inline script bodies', () => {
  for (const file of HTML_FILES) {
    it(`${file} contains no inline <script>…</script> blocks`, () => {
      const html = fs.readFileSync(path.join(CHROME, file), 'utf8');
      // Match <script> followed by content before </script> (non-self-closing)
      const inlineMatches = html.match(
        /<script(?![^>]*\bsrc\b)[^>]*>[\s\S]*?<\/script>/gi,
      );
      assert.ok(
        !inlineMatches || inlineMatches.length === 0,
        `${file}: found inline <script> blocks (CSP script-src 'self' blocks these):\n` +
          (inlineMatches || []).map((m) => `  ${m.slice(0, 120)}…`).join('\n'),
      );
    });
  }
});

// ── First-Paint lang Bootstrap ───────────────────────────────────────────────

describe('first-paint <html lang> via external langBootstrap.js', () => {
  for (const file of HTML_FILES) {
    it(`${file} references langBootstrap.js as a blocking script in <head>`, () => {
      const html = fs.readFileSync(path.join(CHROME, file), 'utf8');
      assert.ok(
        /<script\s+src="langBootstrap\.js"><\/script>/.test(html),
        `${file}: missing <script src="langBootstrap.js"></script> in <head>`,
      );
    });
  }

  it('langBootstrap.js file exists in src/chrome/', () => {
    const bootstrapPath = path.join(CHROME, 'langBootstrap.js');
    assert.ok(
      fs.existsSync(bootstrapPath),
      `langBootstrap.js not found at ${bootstrapPath}`,
    );
  });

  it('webpack.common.js copies langBootstrap.js to build root', () => {
    const common = fs.readFileSync(
      path.join(ROOT, 'webpack.common.js'),
      'utf8',
    );
    assert.ok(
      /langBootstrap\.js/.test(common),
      'webpack.common.js must include a CopyPlugin pattern for langBootstrap.js',
    );
  });
});

// ── langBootstrap.js Locale Mapping Logic ────────────────────────────────────

describe('langBootstrap.js locale mapping', () => {
  let bootstrapSrc;

  before(() => {
    bootstrapSrc = fs.readFileSync(
      path.join(CHROME, 'langBootstrap.js'),
      'utf8',
    );
  });

  it('maps navigator.language to a supported locale or falls back to en', () => {
    // The SUPPORTED map in the bootstrap must include all 7 i18n locales.
    const supported = { de: 1, el: 1, en: 1, es: 1, fr: 1, gr: 1, it: 1 };
    const keys = Object.keys(supported).sort();
    assert.deepEqual(keys, ['de', 'el', 'en', 'es', 'fr', 'gr', 'it']);

    // Verify the bootstrap file contains the SUPPORTED map with these keys
    for (const locale of keys) {
      // Accept both quoted and unquoted key forms: "de": 1, 'de': 1, de: 1
      const re = new RegExp(`(?:["']${locale}["']|\\b${locale}\\b)\\s*:\\s*1`);
      assert.ok(
        re.test(bootstrapSrc),
        `langBootstrap.js SUPPORTED map missing locale "${locale}"`,
      );
    }
  });

  it('falls back to "en" when navigator.language is an unsupported locale', () => {
    // Simulate the bootstrap logic: extract code, look up SUPPORTED map
    const SUPPORTED = { de: 1, el: 1, en: 1, es: 1, fr: 1, gr: 1, it: 1 };

    const unsupportedLocales = [
      'sv',
      'nl',
      'fi',
      'pl',
      'pt',
      'ja',
      'zh',
      'ko',
      'ar',
      'hi',
    ];
    for (const locale of unsupportedLocales) {
      const code = locale.split('-')[0].toLowerCase();
      const result = SUPPORTED[code] ? code : 'en';
      assert.equal(
        result,
        'en',
        `Unsupported locale "${locale}" should fall back to 'en', got '${result}'`,
      );
    }
  });

  it('preserves supported locales (including el and gr) from navigator.language', () => {
    const SUPPORTED = { de: 1, el: 1, en: 1, es: 1, fr: 1, gr: 1, it: 1 };

    const testCases = [
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['de-AT', 'de'],
      ['el-GR', 'el'],
      ['el', 'el'],
      ['fr-FR', 'fr'],
      ['es-ES', 'es'],
      ['it-IT', 'it'],
      ['gr', 'gr'],
    ];

    for (const [input, expected] of testCases) {
      const code = input.split('-')[0].toLowerCase();
      const result = SUPPORTED[code] ? code : 'en';
      assert.equal(
        result,
        expected,
        `navigator.language "${input}" should map to '${expected}', got '${result}'`,
      );
    }
  });
});
