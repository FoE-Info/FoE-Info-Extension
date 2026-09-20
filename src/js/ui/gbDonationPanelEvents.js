/**
 * gbDonationPanelEvents.js
 *
 * Event listener attachments and container translations for the Great Building
 * donation panel. Extracted from renderGbDonationPanel.js to maintain modular architecture.
 */

function attachGbDonationPanelEvents(options = {}) {
  let {
    useNewDonationPanel = false,
    donation2DIV,
    donationDIV,
    copyText = '',
    depCopy = {},
    depCollapse = {},
    depStorage = {},
    depHelper = {},
    onRerender,
    bindDonationEventsFn,
    doc = typeof document !== 'undefined' ? document : null,
  } = options;

  if (!useNewDonationPanel && typeof bindDonationEventsFn === 'function') {
    bindDonationEventsFn({
      depCopy,
      depCollapse,
      depStorage,
      onRerender,
      getUseNewPanel: () => useNewDonationPanel,
      setUseNewPanel: (val) => {
        useNewDonationPanel = val;
      },
      copyText,
    });
  }

  if (useNewDonationPanel && doc && typeof doc.getElementById === 'function') {
    const gbSelectedEl = doc.getElementById('GBselected');
    if (gbSelectedEl && typeof gbSelectedEl.addEventListener === 'function') {
      gbSelectedEl.addEventListener('click', (event) => {
        if (event && event.shiftKey) {
          useNewDonationPanel = !useNewDonationPanel;
          if (typeof depStorage.set === 'function') {
            depStorage.set('useNewDonationPanel', useNewDonationPanel);
          }
          if (typeof onRerender === 'function') {
            onRerender();
          }
        }
      });
    }
  }

  if (typeof depHelper.translateContainer === 'function') {
    depHelper.translateContainer(donation2DIV || donationDIV);
  }

  return {
    useNewDonationPanel,
  };
}

module.exports = {
  attachGbDonationPanelEvents,
};
module.exports.default = attachGbDonationPanelEvents;
module.exports.attachGbDonationPanelEvents = attachGbDonationPanelEvents;
