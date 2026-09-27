/**
 * The no-unescaped-html-interpolation rule guards the encoding half of
 * docs/TODO.md:36, which the i18n rule structurally cannot see. The i18n rule
 * reports hardcoded TEXT; a file can be completely i18n-clean and still
 * interpolate a payload-supplied name into innerHTML unescaped. Both verified
 * defects of that shape were `+=` accumulators, which is what this rule
 * inspects.
 *
 * These cases run the real rule through a real ESLint instance, so a rule that
 * silently stops matching is caught here rather than in production.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { Linter } from 'eslint';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '../..');
const rule = require(
  path.join(ROOT, 'tools/eslint-rules/no-unescaped-html-interpolation.js'),
);

const linter = new Linter();

/** Lint a source snippet and return the rule's messages. */
function lint(source, file = 'src/js/ui/sample.js') {
  const config = [
    {
      plugins: { encodingGuard: { rules: { target: rule } } },
      rules: { 'encodingGuard/target': 'error' },
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  ];
  return linter
    .verify(source, config, path.join(ROOT, file))
    .filter((m) => m.ruleId === 'encodingGuard/target');
}

test('flags an unescaped payload name in a += accumulator', () => {
  // The exact shape of the greatBuildingsPanel and gbgPanel defects.
  const messages = lint(`
    let html = '';
    html += \`<div>\${place.player.name} (10 FP)</div>\`;
  `);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /Unescaped name/);
});

test('flags an unescaped name assigned straight to innerHTML', () => {
  const messages = lint(`
    el.innerHTML = \`<td>\${entry.name}</td>\`;
  `);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /Unescaped name/);
});

test('accepts a name wrapped in the canonical escaper', () => {
  const messages = lint(`
    let html = '';
    html += \`<div>\${escapeHTML(place.player.name)}</div>\`;
  `);
  assert.deepEqual(messages, []);
});

test('accepts a name unwrapped from a || fallback, once escaped', () => {
  const messages = lint(`
    let html = '';
    html += \`<div>\${escapeHTML(place.player?.name || '')}</div>\`;
  `);
  assert.deepEqual(messages, []);
});

test('accepts a t() translation, which returns text not markup', () => {
  const messages = lint(`
    let html = '';
    html += \`<div>\${t('owner')}</div>\`;
  `);
  assert.deepEqual(messages, []);
});

test('does not flag composed markup fragments', () => {
  // A += into an HTML accumulator is overwhelmingly used to compose markup.
  // Flagging these was measured at 21 hits with zero real findings.
  const messages = lint(`
    el.innerHTML = closeBtn + iconHtml + tableMarkup + (!isCollapsed);
  `);
  assert.deepEqual(messages, []);
});

test('does not flag numeric or non-data interpolations', () => {
  const messages = lint(`
    let html = '';
    html += \`<td>\${row.rank}</td><td>\${row.fp} FP</td>\`;
  `);
  assert.deepEqual(messages, []);
});

test('honours the baseline for a pinned expression', () => {
  // incidentsPanel.js interpolates incidentName.text, which comes from a
  // hardcoded INCIDENT_LOOKUP constant rather than a payload.
  const messages = lint(
    `
    let html = '';
    html += \`<div>\${incidentName.text} for 1:00:00</div>\`;
  `,
    'src/js/ui/incidentsPanel.js',
  );
  assert.deepEqual(messages, []);
});

test('the baseline is scoped to its own file', () => {
  // The same expression in a different file must still be reported, or
  // baselining one site would suppress the whole class.
  const messages = lint(`
    let html = '';
    html += \`<div>\${incidentName.text} for 1:00:00</div>\`;
  `);
  assert.equal(messages.length, 1);
});
