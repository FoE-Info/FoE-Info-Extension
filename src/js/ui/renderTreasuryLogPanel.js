/** Guild Treasury Logs (#treasuryLog) renderer, extracted from TreasuryService.js. */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('TreasuryLogPanel');

const safeRequire = (loader) => {
  try {
    return loader();
  } catch {
    return null;
  }
};

const element = safeRequire(() => require('../fn/AddElement.js'));
const collapse = safeRequire(() => require('../fn/collapse.js'));
const helper = safeRequire(() => require('../fn/helper.js'));

function renderTreasuryLogPanel(logs, totals = {}, context = {}) {
  const {
    totalGoodsDonated,
    totalMedalsDonated,
    totalMedalsSpent,
    totalLogCount,
  } = totals;
  const { showTreasury = true, targetEl = null } = context;

  if (typeof document === 'undefined') return;
  const target = targetEl || document.getElementById('treasuryLog');
  if (!target) return;

  const list = Array.isArray(logs) ? logs : [];

  if (showTreasury === false) {
    target.innerHTML = '';
    return;
  }
  target.style.display = '';

  const isCollapsed =
    collapse?.collapseTreasuryLog !== undefined ?
      !!collapse.collapseTreasuryLog
    : true;
  let html = `<div class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">`;
  if (element?.close) html += element.close();
  if (element?.copy)
    html += element.copy('treasuryLogCopyID', 'info', 'right', isCollapsed);
  html += `<p id="treasuryLogTextLabel" href="#treasuryLogText" data-bs-toggle="collapse" role="button">`;
  if (element?.icon)
    html += element.icon('treasuryLogicon', 'treasuryLogText', isCollapsed);
  html += `<strong><span data-i18n="treasury_logs">Treasury Logs</span>:</strong>`;
  html += ` <span class="ms-1 small">(${list.length}/${totalLogCount ?? list.length} <span data-i18n="entries">Entries</span>)</span></p>`;
  html += `<div id="treasuryLogText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">`;
  html += `<div class="mb-2 small px-2">`;
  html += `<span data-i18n="goods_donated">Goods Donated</span>: <strong>${totalGoodsDonated.toNumber().toLocaleString()}</strong> | `;
  html += `<span data-i18n="medals_donated">Medals Donated</span>: <strong>${totalMedalsDonated.toNumber().toLocaleString()}</strong> | `;
  html += `<span data-i18n="medals_spent">Medals Spent</span>: <strong>${totalMedalsSpent.toNumber().toLocaleString()}</strong>`;
  html += `</div>`;
  html += `<table class="table table-sm table-striped align-middle mb-0"><caption class="visually-hidden"><span data-i18n="treasury">Guild Treasury</span></caption><thead><tr>`;
  html += `<th scope="col" class="text-start"><span data-i18n="player">Player</span></th>`;
  html += `<th scope="col" class="text-start"><span data-i18n="action">Action</span></th>`;
  html += `<th scope="col" class="text-start"><span data-i18n="resource">Resource</span></th>`;
  html += `<th scope="col" class="text-end"><span data-i18n="amount">Amount</span></th>`;
  html += `</tr></thead><tbody>`;

  for (const entry of list.slice(0, 50)) {
    const pName =
      helper?.escapeHTML ?
        helper.escapeHTML(entry.playerName || 'Unknown')
      : entry.playerName || 'Unknown';
    const rName =
      helper?.escapeHTML ?
        helper.escapeHTML(entry.resource || '')
      : entry.resource;
    const act =
      helper?.escapeHTML ? helper.escapeHTML(entry.action || '') : entry.action;
    const isDonation = entry.isDonation();
    const amountClass = isDonation ? 'text-success' : 'text-danger';
    const amountSign = isDonation ? '+' : '-';
    const amountStr = entry.amount.toNumber().toLocaleString();

    html += `<tr>`;
    html += `<td class="text-start">${pName}</td>`;
    html += `<td class="text-start small text-muted">${act}</td>`;
    html += `<td class="text-start">${rName}</td>`;
    html += `<td class="text-end ${amountClass}">${amountSign}${amountStr}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table></div></div>`;
  target.innerHTML = html;

  if (collapse?.fCollapseTreasuryLog) {
    document
      .getElementById('treasuryLogTextLabel')
      ?.addEventListener('click', collapse.fCollapseTreasuryLog);
  }
  if (helper?.translateContainer) {
    helper.translateContainer(target);
  }

  logger.debug('treasury log rendered', {
    rows: list.length,
    totalLogCount,
  });
}

module.exports = { renderTreasuryLogPanel };
module.exports.default = renderTreasuryLogPanel;
