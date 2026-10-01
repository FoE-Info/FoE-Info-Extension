/** Parsed HTML boundaries: sanitize rich markup, or extract plain text once. */
import xss from 'xss';

const commonAttributes = [
  'id',
  'class',
  'title',
  'role',
  'tabindex',
  'style',
  'aria-label',
  'aria-live',
  'aria-expanded',
  'aria-controls',
  'aria-hidden',
  'data-i18n',
  'data-bs-toggle',
  'data-bs-target',
  'data-bs-dismiss',
  'data-bs-placement',
  'data-bs-html',
  'data-bs-title',
  'data-bs-content',
];
const whiteList = {};
for (const tag of [
  'div',
  'span',
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'small',
  'h3',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'caption',
  'button',
  'label',
  'input',
  'a',
]) {
  whiteList[tag] = [...commonAttributes];
}
whiteList.a.push('href');
whiteList.button.push('type');
whiteList.input.push('type', 'checked', 'disabled');
whiteList.label.push('for');
whiteList.td.push('colspan');
whiteList.th.push('scope', 'colspan');
const richFilter = new xss.FilterXSS({
  whiteList,
  stripIgnoreTag: true,
  stripIgnoreTagBody: [
    'script',
    'style',
    'iframe',
    'object',
    'svg',
    'math',
    'template',
  ],
});

function sanitizeHTML(html) {
  return richFilter.process(String(html ?? ''));
}

// Decode the common entities emitted by our templates and numeric references
// once. Unknown named entities stay literal; this is text conversion, not a
// sanitizer and must never be reused as HTML without escaping.
const textEntities = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};
function decodeTextEntities(text) {
  return text.replace(
    /&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,
    (entity, code) => {
      if (code[0] !== '#') return textEntities[code.toLowerCase()] || entity;
      const point =
        code[1].toLowerCase() === 'x' ?
          Number.parseInt(code.slice(2), 16)
        : Number(code.slice(1));
      return (
          point > 0 &&
            point <= 0x10ffff &&
            !(point >= 0xd800 && point <= 0xdfff)
        ) ?
          String.fromCodePoint(point)
        : '\ufffd';
    },
  );
}

/** Output is plain text only; it must be escaped before any HTML reuse. */
function htmlToText(html, { table = false } = {}) {
  const blocked = [];
  const hidden = new Set(['script', 'style', 'svg', 'math', 'template']);
  return xss.parseTag(
    String(html ?? ''),
    (_sourcePosition, _position, name, _markup, closing) => {
      if (hidden.has(name)) {
        if (closing) {
          const index = blocked.lastIndexOf(name);
          if (index !== -1) blocked.splice(index);
        } else blocked.push(name);
        return '';
      }
      if (blocked.length) return '';
      if (name === 'br' && !closing) return '\n';
      if (closing && table && (name === 'td' || name === 'th')) return '\t';
      if (closing && (name === 'p' || (table && name === 'tr'))) return '\n';
      return '';
    },
    (text) => (blocked.length ? '' : decodeTextEntities(text)),
  );
}

export { sanitizeHTML, htmlToText };
