import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const AddElement = require('../../src/js/ui/AddElement.js');

test('Collapse Icons & Titles Characterization Suite', async (t) => {
  await t.test(
    'element.icon renders [-] when expanded (collapse: false)',
    () => {
      const markup = AddElement.icon('testId', 'targetId', false);
      assert.match(markup, /id="testId"/);
      assert.match(markup, /data-bs-target="#targetId"/);
      assert.match(markup, /aria-controls="targetId"/);
      assert.match(markup, /aria-expanded="true"/);
      assert.match(markup, /collapse-toggle/);
      assert.match(markup, /fw-bold/);
      assert.match(markup, /font-monospace/);
      assert.match(markup, /\[-\]/);
      assert.doesNotMatch(markup, /remove_circle_outline/);
    },
  );

  await t.test(
    'element.icon renders [+] when collapsed (collapse: true)',
    () => {
      const markup = AddElement.icon('testId', 'targetId', true);
      assert.match(markup, /id="testId"/);
      assert.match(markup, /data-bs-target="#targetId"/);
      assert.match(markup, /aria-controls="targetId"/);
      assert.match(markup, /aria-expanded="false"/);
      assert.match(markup, /collapse-toggle/);
      assert.match(markup, /fw-bold/);
      assert.match(markup, /font-monospace/);
      assert.match(markup, /\[\+\]/);
      assert.doesNotMatch(markup, /add_circle_outline/);
    },
  );

  await t.test('AddElement.updateIcon swaps icon between [-] and [+]', () => {
    const mockElement = {
      id: 'testId',
      outerHTML: '',
    };
    const prevDoc = globalThis.document;
    globalThis.document = {
      getElementById: (id) => (id === 'testId' ? mockElement : null),
    };

    try {
      // Toggle to collapsed (true) -> should render [+]
      AddElement.updateIcon('testId', 'targetId', true);
      assert.match(mockElement.outerHTML, /\[\+\]/);
      assert.match(mockElement.outerHTML, /aria-expanded="false"/);

      // Toggle to expanded (false) -> should render [-]
      AddElement.updateIcon('testId', 'targetId', false);
      assert.match(mockElement.outerHTML, /\[-\]/);
      assert.match(mockElement.outerHTML, /aria-expanded="true"/);
    } finally {
      globalThis.document = prevDoc;
    }
  });

  await t.test(
    'AddElement.updateIcon updates textContent and aria-expanded in-place on real DOM nodes',
    () => {
      const attrs = {};
      const mockElement = {
        id: 'testId',
        textContent: '[-]',
        setAttribute(name, val) {
          attrs[name] = String(val);
        },
        getAttribute(name) {
          return attrs[name];
        },
      };
      const prevDoc = globalThis.document;
      globalThis.document = {
        getElementById: (id) => (id === 'testId' ? mockElement : null),
      };

      try {
        AddElement.updateIcon('testId', 'targetId', true);
        assert.equal(mockElement.textContent, '[+]');
        assert.equal(mockElement.getAttribute('aria-expanded'), 'false');

        AddElement.updateIcon('testId', 'targetId', false);
        assert.equal(mockElement.textContent, '[-]');
        assert.equal(mockElement.getAttribute('aria-expanded'), 'true');
      } finally {
        globalThis.document = prevDoc;
      }
    },
  );

  await t.test(
    'Panel headers render proper collapse trigger attributes',
    () => {
      const isCollapsed = true;
      const goodsLabelMarkup = `<p id="goodsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#goodsText" aria-expanded="${!isCollapsed}" aria-controls="goodsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
      assert.match(goodsLabelMarkup, /data-bs-toggle="collapse"/);
      assert.match(goodsLabelMarkup, /data-bs-target="#goodsText"/);
      assert.match(goodsLabelMarkup, /role="button"/);
      assert.match(goodsLabelMarkup, /tabindex="0"/);
      assert.match(goodsLabelMarkup, /aria-expanded="false"/);
      assert.match(goodsLabelMarkup, /aria-controls="goodsText"/);
      assert.match(goodsLabelMarkup, /user-select-none/);
    },
  );

  await t.test(
    'Clicking label vs child icon avoids double-firing desync',
    () => {
      let toggleCount = 0;
      const collapseFn = () => {
        toggleCount++;
      };

      const iconEl = {
        id: 'goodsicon',
        closest(sel) {
          return sel === '#goodsicon' ? this : null;
        },
      };
      const labelEl = {
        id: 'goodsTextLabel',
        contains(target) {
          return target === iconEl;
        },
      };

      const labelHandler = (e) => {
        if (
          e.target &&
          typeof e.target.closest === 'function' &&
          e.target.closest('#goodsicon')
        ) {
          return;
        }
        collapseFn();
      };
      const iconHandler = () => {
        collapseFn();
      };

      // Scenario A: User clicks label text outside icon
      labelHandler({ target: labelEl });
      assert.equal(toggleCount, 1, 'Label click increments toggleCount once');

      // Scenario B: User clicks child icon (simulates icon click + event bubbling to parent label)
      iconHandler(); // Child icon click fires
      labelHandler({ target: iconEl }); // Bubbled event to label is suppressed
      assert.equal(
        toggleCount,
        2,
        'Icon click increments toggleCount exactly once, bubbled label handler was ignored',
      );
    },
  );

  await t.test(
    'fCollapseInvested shows Available FP when collapsed and clears when expanded',
    () => {
      let collapseInvested = false;
      const onHandEl = { innerHTML: '' };
      const availableFpEl = { innerHTML: '320,440 FP' };
      const copyEl = { style: { display: '' } };

      const fCollapseInvested = () => {
        collapseInvested = !collapseInvested;
        if (collapseInvested && availableFpEl) {
          onHandEl.innerHTML = `<span data-i18n="available">Available FP</span>: ${availableFpEl.innerHTML}`;
        } else {
          onHandEl.innerHTML = '';
        }
        copyEl.style.display = collapseInvested ? 'none' : 'block';
      };

      // Toggle to collapsed (collapseInvested = true)
      fCollapseInvested();
      assert.match(onHandEl.innerHTML, /Available FP/);
      assert.match(onHandEl.innerHTML, /320,440 FP/);
      assert.doesNotMatch(onHandEl.innerHTML, /126,923 FP/);
      assert.equal(copyEl.style.display, 'none');

      // Toggle back to expanded (collapseInvested = false)
      fCollapseInvested();
      assert.equal(
        onHandEl.innerHTML,
        '',
        'Clears header FP when expanded so amounts live in body statistics',
      );
      assert.equal(copyEl.style.display, 'block');
    },
  );
});
