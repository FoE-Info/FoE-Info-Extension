import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fCheckOutput,
  repairGbOutput,
} from '../../src/js/ui/gbOutputRepair.js';

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    const el = {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      style: {},
      children: [],
      childNodes: [],
      parentElement: null,
      parentNode: null,
      appendChild(child) {
        if (!child) return child;
        child.parentElement = this;
        child.parentNode = this;
        this.children.push(child);
        this.childNodes.push(child);
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          this.childNodes.splice(idx, 1);
          child.parentElement = null;
          child.parentNode = null;
          if (child.id) elementsById.delete(child.id);
        }
        return child;
      },
      contains(target) {
        if (!target) return false;
        if (target === this) return true;
        for (const child of this.children) {
          if (child === target || (child.contains && child.contains(target))) {
            return true;
          }
        }
        return false;
      },
    };
    return el;
  }

  const body = createElement('body');
  body.id = 'body';
  elementsById.set('body', body);

  const contentEl = createElement('div');
  contentEl.id = 'content';
  elementsById.set('content', contentEl);
  body.appendChild(contentEl);

  const mockDocument = {
    body,
    createElement,
    getElementById(id) {
      return elementsById.get(id) || null;
    },
  };

  return { mockDocument, body, contentEl, createElement };
}

test('gbOutputRepair Suite', async (t) => {
  await t.test('handles missing document or contentEl safely', () => {
    assert.doesNotThrow(() => {
      repairGbOutput({ contentEl: null, targetDocument: null });
    });
    assert.doesNotThrow(() => {
      fCheckOutput({ contentEl: null, targetDocument: null });
    });
  });

  await t.test(
    'appends unattached containers to contentEl in invariant order',
    () => {
      const { mockDocument, contentEl, createElement } = createMockDOM();
      const greatbuilding = createElement('div');
      const gbInfoDIV = createElement('div');
      const donation2DIV = createElement('div');
      const donationDIV = createElement('div');
      const cityrewards = createElement('div');

      repairGbOutput({
        contentEl,
        targetDocument: mockDocument,
        greatbuilding,
        gbInfoDIV,
        donation2DIV,
        donationDIV,
        cityrewards,
        showOptions: {
          showGBDonors: true,
          showGBInfo: true,
          showDonation: true,
        },
      });

      assert.equal(greatbuilding.id, 'greatbuilding');
      assert.equal(gbInfoDIV.id, 'gbInfo');
      assert.equal(donation2DIV.id, 'donation2');
      assert.equal(donationDIV.id, 'donation');
      assert.equal(cityrewards.id, 'cityrewards');

      assert.ok(contentEl.contains(greatbuilding));
      assert.ok(contentEl.contains(gbInfoDIV));
      assert.ok(contentEl.contains(donation2DIV));
      assert.ok(contentEl.contains(donationDIV));
      assert.ok(contentEl.contains(cityrewards));
    },
  );

  await t.test('restores hidden display styles when showOptions allows', () => {
    const { mockDocument, contentEl, createElement } = createMockDOM();
    const greatbuilding = createElement('div');
    greatbuilding.style.display = 'none';

    const gbContributors = createElement('div');
    gbContributors.id = 'gbContributors';
    gbContributors.style.display = 'none';
    gbContributors.appendChild(greatbuilding);
    contentEl.appendChild(gbContributors);

    const gbInfoDIV = createElement('div');
    gbInfoDIV.style.display = 'none';

    const donation2DIV = createElement('div');
    donation2DIV.style.display = 'none';

    const gbDonation = createElement('div');
    gbDonation.id = 'gbDonation';
    gbDonation.style.display = 'none';
    gbDonation.appendChild(donation2DIV);
    contentEl.appendChild(gbDonation);

    const donationDIV = createElement('div');
    donationDIV.style.display = 'none';

    repairGbOutput({
      contentEl,
      targetDocument: mockDocument,
      greatbuilding,
      gbInfoDIV,
      donation2DIV,
      donationDIV,
      showOptions: { showGBDonors: true, showGBInfo: true, showDonation: true },
    });

    assert.equal(greatbuilding.style.display, '');
    assert.equal(gbContributors.style.display, '');
    assert.equal(gbInfoDIV.style.display, '');
    assert.equal(donation2DIV.style.display, '');
    assert.equal(gbDonation.style.display, '');
    assert.equal(donationDIV.style.display, '');
  });

  await t.test(
    'preserves hidden display styles when showOptions is explicitly false',
    () => {
      const { mockDocument, contentEl, createElement } = createMockDOM();
      const greatbuilding = createElement('div');
      greatbuilding.style.display = 'none';

      const gbInfoDIV = createElement('div');
      gbInfoDIV.style.display = 'none';

      const donation2DIV = createElement('div');
      donation2DIV.style.display = 'none';

      repairGbOutput({
        contentEl,
        targetDocument: mockDocument,
        greatbuilding,
        gbInfoDIV,
        donation2DIV,
        showOptions: {
          showGBDonors: false,
          showGBInfo: false,
          showDonation: false,
        },
      });

      assert.equal(greatbuilding.style.display, 'none');
      assert.equal(gbInfoDIV.style.display, 'none');
      assert.equal(donation2DIV.style.display, 'none');
    },
  );
});
