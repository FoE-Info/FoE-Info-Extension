import assert from 'node:assert/strict';
import test from 'node:test';
import { attachGbDonationPanelEvents } from '../../src/js/ui/gbDonationPanelEvents.js';

test('gbDonationPanelEvents Suite', async (t) => {
  await t.test(
    'when useNewDonationPanel is false, calls bindDonationEventsFn and skips duplicate listener',
    () => {
      let boundEvents = false;
      let directListenerCount = 0;

      const mockElement = {
        addEventListener: () => {
          directListenerCount++;
        },
      };

      const mockDoc = {
        getElementById: (id) => (id === 'GBselected' ? mockElement : null),
      };

      const result = attachGbDonationPanelEvents({
        useNewDonationPanel: false,
        donation2DIV: { innerHTML: '' },
        donationDIV: { innerHTML: '' },
        copyText: 'P1(950)',
        depCopy: {},
        depCollapse: {},
        depStorage: {},
        depHelper: { translateContainer: () => {} },
        onRerender: () => {},
        bindDonationEventsFn: () => {
          boundEvents = true;
        },
        doc: mockDoc,
      });

      assert.equal(boundEvents, true);
      assert.equal(directListenerCount, 0);
      assert.equal(result.useNewDonationPanel, false);
    },
  );

  await t.test(
    'when useNewDonationPanel is true, skips bindDonationEventsFn and toggles to false on Shift-Click',
    () => {
      let boundEvents = false;
      let shiftListenerAttached = false;
      let rerenderCalled = false;
      let storedVal = null;

      const mockElement = {
        addEventListener: (evt, handler) => {
          if (evt === 'click') {
            shiftListenerAttached = true;
            handler({ shiftKey: true });
          }
        },
      };

      const mockDoc = {
        getElementById: (id) => (id === 'GBselected' ? mockElement : null),
      };

      const result = attachGbDonationPanelEvents({
        useNewDonationPanel: true,
        donation2DIV: { innerHTML: '' },
        donationDIV: { innerHTML: '' },
        copyText: '',
        depCopy: {},
        depCollapse: {},
        depStorage: {
          set: (k, v) => {
            storedVal = v;
          },
        },
        depHelper: { translateContainer: () => {} },
        onRerender: () => {
          rerenderCalled = true;
        },
        bindDonationEventsFn: () => {
          boundEvents = true;
        },
        doc: mockDoc,
      });

      assert.equal(boundEvents, false);
      assert.equal(shiftListenerAttached, true);
      assert.equal(rerenderCalled, true);
      assert.equal(storedVal, false);
      assert.equal(result.useNewDonationPanel, false);
    },
  );
});
