/**
 * no-unescaped-html-interpolation — flags a game- or player-supplied value
 * interpolated into markup without passing through an escaper.
 *
 * Why a rule and not a grep: the dangerous expression is a `${…}` hole in a
 * template literal, and whether it is safe depends on the value it holds, not
 * on the line it sits on. The two verified defects this guards against were
 * both `` `… ${place.player.name} …` `` — a name the game supplied, rendered
 * through innerHTML.
 *
 * Why it keys on DATA LEAVES rather than every interpolation: a `+=` into an
 * HTML accumulator is overwhelmingly used to compose markup fragments
 * (`iconHtml`, `tableMarkup`, `closeBtn`), and flagging those produces noise
 * with no finding behind it. A member read whose property is a known text
 * field is the case where the value came from a payload and nothing in the
 * expression escaped it. Measured over src/js/ui: 5 hits, of which 3 were real
 * (gbgPanel battleground member name, galaxyPanel building name x2) and 2 were
 * hardcoded lookup constants.
 *
 * Escapers, `t()` and `tr()` are the allowed forms: each returns text, not
 * markup. Anything else that is a bare member read of a text field is
 * reported, unless the file and expression are pinned in the baseline.
 *
 * Known debt is pinned in `unescaped-html-baseline.json`, so the rule can only
 * fail on NEW unescaped sinks. Delete an entry when the site is fixed.
 */

const fs = require('node:fs');
const path = require('node:path');

const BASELINE_PATH = path.join(__dirname, 'unescaped-html-baseline.json');
let baselineCache = null;

/** file :: expression text entries that are knowingly unescaped today. */
function baseline() {
  if (baselineCache === null) {
    try {
      const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
      baselineCache = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      baselineCache = new Set();
    }
  }
  return baselineCache;
}

/** Functions whose result is already safe to embed as text. */
const TEXT_PRODUCERS =
  /^(escapeHTML|escape|escapeHTMLAttribute|safeEscape|escapeFn|escapeHtml|canonicalEscapeHTML|toDisplayString|defaultEscapeHTML|t|tr|translate)$/;

/** Property names that carry a human-readable, payload-supplied string. */
const DATA_LEAVES = new Set([
  'name',
  'player_name',
  'playerName',
  'clanName',
  'clan_name',
  'guildName',
  'title',
  'nickname',
  'owner',
  'ownerName',
  'rewardName',
  'eraName',
  'buildingName',
  'unitName',
  'text',
  'label',
]);

/**
 * Unwrap `a || ''` and `cond ? a : b` to reach the value that will render.
 */
function renderedValue(node) {
  let current = node;
  while (current) {
    if (current.type === 'LogicalExpression') {
      current = current.left;
      continue;
    }
    if (current.type === 'ConditionalExpression') {
      current = current.consequent;
      continue;
    }
    break;
  }
  return current;
}

/** True when the expression is a member read of a known text field. */
function isUnescapedDataRead(node) {
  const value = renderedValue(node);
  if (!value || value.type !== 'MemberExpression') return null;
  const property = value.property;
  if (!property || property.type !== 'Identifier') return null;
  if (!DATA_LEAVES.has(property.name)) return null;
  return property.name;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require game- or player-supplied values interpolated into markup to pass through an escaper.',
      recommended: true,
    },
    schema: [],
    messages: {
      unescaped:
        'Unescaped {{field}} interpolated into HTML — wrap it in escapeHTML() from utils/escape.js.',
    },
  },
  create(context) {
    const filename = context.filename ?? '';
    const known = baseline();
    const rel = path.relative(process.cwd(), filename);
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function inspect(template, sink) {
      if (!template || template.type !== 'TemplateLiteral') return;
      for (const expression of template.expressions) {
        if (
          expression.type === 'CallExpression' &&
          expression.callee.type === 'Identifier' &&
          TEXT_PRODUCERS.test(expression.callee.name)
        ) {
          continue;
        }
        const field = isUnescapedDataRead(expression);
        if (!field) continue;
        const text = sourceCode.getText(expression);
        if (known.has(`${rel} :: ${text}`)) continue;
        context.report({
          node: expression,
          messageId: 'unescaped',
          data: { field, sink },
        });
      }
    }

    return {
      // html += `… ${x.name} …` — the accumulator pattern both defects used.
      'AssignmentExpression[operator="+="]'(node) {
        if (node.left.type !== 'Identifier') return;
        inspect(node.right, node.left.name);
      },
      // el.innerHTML = `… ${x.name} …` and el.outerHTML likewise.
      AssignmentExpression(node) {
        const left = node.left;
        if (left.type !== 'MemberExpression') return;
        const property = left.property;
        if (property.type !== 'Identifier') return;
        if (property.name !== 'innerHTML' && property.name !== 'outerHTML')
          return;
        inspect(node.right, property.name);
      },
    };
  },
};
