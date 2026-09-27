/**
 * no-hardcoded-text — flags user-visible English that will never be
 * translated.
 *
 * Why a rule and not a line-based grep: a per-line regex cannot tell a text
 * node from a JS token, so it reports `div class` and `const body` alongside
 * real labels, and it cannot see that `<span data-i18n="rank">Rank</span>` is
 * already bound. Working on the AST means the extractor only ever looks at
 * string contents, and it can strip the *contents* of bound elements, not
 * just their tags.
 *
 * Three detectors, each precise rather than broad:
 *   1. WORD_RUN      — two or more consecutive words left in a text node.
 *   2. STRONG        — anything left inside a <strong> element, which in this
 *                      codebase is always a panel or card heading.
 *   3. LABEL        — a capitalized phrase followed by a colon ("Level:").
 *
 * All three run AFTER removing every tag, every attribute value, every `${…}`
 * interpolation, and the whole subtree of any `data-i18n*` element, so a bound
 * string cannot be reported.
 *
 * Known debt is pinned in `hardcoded-text-baseline.json`, so the rule can only
 * fail on NEW unbound text. Delete an entry when it gets bound.
 */

const fs = require('node:fs');
const path = require('node:path');

const BASELINE_PATH = path.join(__dirname, 'hardcoded-text-baseline.json');
let baselineCache = null;
function baseline() {
  if (!baselineCache) {
    try {
      baselineCache = new Set(
        JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')),
      );
    } catch {
      baselineCache = new Set();
    }
  }
  return baselineCache;
}

const WORD_RUN =
  /\b[A-Za-z][a-z]{2,}(?:['’][A-Za-z]+)?(?:\s+[A-Za-z][a-z]{2,})+\b/g;
const LABEL = /\b([A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,})*)\s*:/g;
const STRONG = /<strong\b[^>]*>([\s\S]*?)<\/strong\s*>/gi;

// Loggers and console calls take strings that nobody reads.
const IGNORED_CALLEES =
  /^(console|logger|createLogger|debug|warn|error|info|log)$/;

/** Remove the subtree of every element that carries a data-i18n* attribute. */
function stripBoundSubtrees(text) {
  let out = text;
  for (let i = 0; i < 4; i++) {
    const next = out.replace(
      /<([a-z][\w-]*)\b[^>]*data-i18n[\w-]*\s*=\s*"[^"]*"[^>]*>[\s\S]*?<\/\1\s*>/gi,
      ' ',
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Reduce a markup string to the text a user would actually read. */
function visibleText(raw) {
  return stripBoundSubtrees(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/="[^"]*"/g, ' ')
    .replace(/'[^']*'/g, ' ')
    .replace(/\$\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMarkup(text) {
  return /<[a-z][\w-]*[\s/>]/i.test(text) && text.includes('>');
}

function calleeName(node) {
  const parent = node?.parent;
  if (!parent || parent.type !== 'CallExpression') return null;
  const callee = parent.callee;
  if (!callee) return null;
  if (callee.type === 'MemberExpression') return callee.property?.name ?? null;
  if (callee.type === 'Identifier') return callee.name;
  return null;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require user-visible text in markup to go through data-i18n / t().',
      recommended: true,
    },
    schema: [],
    messages: {
      hardcoded:
        'Untranslated user-visible text {{text}} — wrap it in an element with data-i18n="<key>" and add the key to all 7 locales.',
    },
  },
  create(context) {
    const filename = context.filename ?? '';
    const known = baseline();
    const rel = path.relative(process.cwd(), filename);

    function reportHits(node, hits) {
      for (const hit of hits) {
        if (known.has(`${rel} :: ${hit}`)) continue;
        context.report({ node, messageId: 'hardcoded', data: { text: hit } });
      }
    }

    function inspect(node, raw) {
      if (!isMarkup(raw)) return;
      const stripped = stripBoundSubtrees(raw);

      const strong = [];
      for (const m of stripped.matchAll(STRONG)) {
        const inner = visibleText(m[1]);
        if (inner && /[A-Za-z]{3}/.test(inner)) strong.push(inner);
      }
      reportHits(node, strong);

      const labels = [];
      for (const m of stripped.matchAll(LABEL)) {
        if (!strong.includes(m[1])) labels.push(m[1]);
      }
      reportHits(node, labels);

      reportHits(node, visibleText(raw).match(WORD_RUN) ?? []);
    }

    return {
      TemplateLiteral(node) {
        if (node.parent?.type === 'TaggedTemplateExpression') return;
        const callee = calleeName(node);
        if (callee && IGNORED_CALLEES.test(callee)) return;
        inspect(node, node.quasis.map((q) => q.value.raw).join('${…}'));
      },
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (node.parent?.type === 'TemplateElement') return;
        // Non-computed object keys are identifiers, not text.
        if (
          node.parent?.type === 'Property' &&
          node.parent.key === node &&
          !node.parent.computed
        ) {
          return;
        }
        const callee = calleeName(node);
        if (callee && IGNORED_CALLEES.test(callee)) return;
        inspect(node, node.value);
      },
    };
  },
};
