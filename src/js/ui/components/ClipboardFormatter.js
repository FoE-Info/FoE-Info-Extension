/**
 * ClipboardFormatter.js
 *
 * Extracts formatted text from city stats cards and copies to system clipboard.
 */

function formatStatsText(card, prefix) {
  if (!card) return '';
  const strong = card.querySelector('strong');
  const rows = Array.from(card.querySelectorAll(`#${prefix}Text > div > div`));
  const lines = [];

  if (strong?.textContent?.trim()) {
    lines.push(strong.textContent.trim());
  }
  rows.forEach((r) => {
    const t = r.textContent?.trim();
    if (t) lines.push(t);
  });

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
