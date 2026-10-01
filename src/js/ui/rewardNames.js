/** Keep quantities separate from localized reward names before accumulation. */
function normalizeRewardName(name) {
  let text = String(name)
    .trim()
    .replace(/^\d[\d,.]*\s*[x×]\s*/i, '');
  const separator = text.lastIndexOf('-');
  if (
    separator > 0 &&
    /\s/.test(text[separator - 1]) &&
    /\s/.test(text[separator + 1] || '') &&
    text
      .slice(separator + 1)
      .trim()
      .toLowerCase() === 'active'
  ) {
    text = text.slice(0, separator).trimEnd();
  }
  return text.trim();
}

function formatRewardLine(quantity, name) {
  return `${quantity}x ${normalizeRewardName(name)}`;
}

function getRewardQuantity(payload) {
  if (payload.type === 'good' && Number(payload.totalAmount) > 0)
    return Number(payload.totalAmount);
  return Number(payload.amount) || Number(payload.totalAmount) || 1;
}

module.exports = { normalizeRewardName, formatRewardLine, getRewardQuantity };
