/** Copy translated Army text in chat-friendly era groups without table headings. */
function formatArmyCopy(body) {
  const summary = body.querySelector('.mb-2');
  const total = summary?.querySelector('strong')?.textContent.trim() || '';
  const units = body.querySelector('#armyUnits3')?.textContent.trim() || '';
  const rogues = body.querySelector('#armyUnits2');
  const change = rogues?.nextElementSibling?.textContent.trim() || '';
  const lines = [
    `${total}:`,
    units,
    `${rogues?.textContent.trim() || ''}${change ? ` ${change}` : ''}`,
  ];
  for (const row of body.querySelectorAll('tbody tr')) {
    if (row.classList.contains('goods-era-header')) {
      lines.push('', row.textContent.trim());
    } else {
      const cells = Array.from(row.querySelectorAll('td'));
      const text = cells.map((cell) => cell.textContent.trim()).join(' ');
      if (text) lines.push(text);
    }
  }
  return lines.join('\n');
}

module.exports = { formatArmyCopy };
