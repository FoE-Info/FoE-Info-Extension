/**
 * ClipboardFormatter.js
 *
 * Extracts formatted text from city stats cards and copies to system clipboard.
 */

function formatStatsText(card, prefix) {
  if (!card) return '';
  const body = card.querySelector(`#${prefix}Text .foe-panel-body`);
  if (!body) return '';

  const lines = [];
  for (const row of Array.from(body.children)) {
    if (row.classList?.contains('foe-section-header')) {
      const label = row.textContent?.trim();
      if (label) lines.push('', `${label}:`);
      continue;
    }
    const clone = row.cloneNode(true);
    clone
      .querySelectorAll('.material-icons-outlined, .material-symbols-outlined')
      .forEach((icon) => icon.remove());
    const text = clone.textContent?.trim();
    if (text) lines.push(text);
  }

  return lines.join('\n');
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const temp = document.createElement('textarea');
    document.body.appendChild(temp);
    temp.value = text;
    temp.select();
    document.execCommand('copy');
    temp.remove();
    return true;
  } catch (err) {
    console.error('CityStats copy failed:', err);
    return false;
  }
}

async function handleCopyStats(targetId, prefix) {
  const card = document.getElementById(targetId);
  const text = formatStatsText(card, prefix);
  return await copyTextToClipboard(text);
}

module.exports = {
  formatStatsText,
  copyTextToClipboard,
  handleCopyStats,
};
module.exports.default = module.exports;
