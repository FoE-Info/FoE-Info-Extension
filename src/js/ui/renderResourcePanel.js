/** Resource/goods panel DOM helpers, extracted from ResourceService.js. */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('ResourcePanel');

function setAvailableForgePoints(value) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('availableFPID');
  if (el) el.textContent = value;
}

function clearGoodsPanel() {
  if (typeof document === 'undefined') return;
  const targetDiv = document.getElementById('goods');
  if (!targetDiv) return;
  targetDiv.innerHTML = '';
  targetDiv.style.display = 'none';
  targetDiv.classList?.add('d-none');
}

async function goodsCopy() {
  if (typeof document === 'undefined') return;
  const table = document.getElementById('goodstable');
  if (!table) return;

  let currentEra = '';
  const lines = [];
  table.querySelectorAll('tr').forEach((row) => {
    const eraHeader = row.querySelector(
      '.goods-era-header, .special-goods-header',
    );
    if (eraHeader) {
      currentEra = eraHeader.textContent.trim();
      return;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length === 2 && cells[0].textContent.trim()) {
      lines.push(
        `${currentEra}\t${cells[0].textContent.trim()}\t${cells[1].textContent.trim()}`,
      );
    }
  });

  const tsvText = lines.join('\n');

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(tsvText);
    } else {
      const temp = document.createElement('textarea');
      document.body.appendChild(temp);
      temp.value = tsvText;
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
    logger.debug('goods inventory copied', { rows: lines.length });
  } catch (err) {
    logger.warn('goodsCopy clipboard write failed:', err);
  }
}

module.exports = {
  setAvailableForgePoints,
  clearGoodsPanel,
  goodsCopy,
};
module.exports.default = goodsCopy;
