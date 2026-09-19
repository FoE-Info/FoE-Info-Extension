import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTheme,
  getTheme,
  initTheme,
  isDarkMode,
  resolveTheme,
} from '../../src/js/ui/themeManager.js';

function createMockDoc() {
  const classSet = (initial = []) => {
    const s = new Set(initial);
    return {
      has: (c) => s.has(c),
      contains: (c) => s.has(c),
      add: (c) => s.add(c),
      remove: (c) => s.delete(c),
      toggle: (c, force) => {
        if (force === true) s.add(c);
        else if (force === false) s.delete(c);
        else if (s.has(c)) s.delete(c);
        else s.add(c);
      },
      toArray: () => Array.from(s),
    };
  };

  const attrs = {};
  const docElement = {
    setAttribute: (k, v) => {
      attrs[k] = String(v);
    },
    getAttribute: (k) => attrs[k] || null,
  };

  const body = {
    classList: classSet(),
  };

  const heading = {
    classList: classSet(),
  };

  const title = {
    id: 'title',
    classList: classSet(),
    querySelector: (sel) => (sel === 'h6' ? heading : null),
  };

  const content = {
    id: 'content',
    classList: classSet(),
  };

  return {
    documentElement: docElement,
    body,
    getElementById: (id) => {
      if (id === 'title') return title;
      if (id === 'content') return content;
      return null;
    },
    _state: { attrs, body, title, heading, content },
  };
}

test('ThemeManager Suite', async (t) => {
  await t.test(
    'resolveTheme resolves explicit and auto modes accurately',
    () => {
      assert.equal(resolveTheme('dark', 'default', false), true);
      assert.equal(resolveTheme('light', 'dark', true), false);
      assert.equal(resolveTheme('auto', 'dark', false), true);
      assert.equal(resolveTheme('auto', 'default', true), false);
      assert.equal(resolveTheme('auto', '', true), true);
      assert.equal(resolveTheme('auto', '', false), false);
    },
  );

  await t.test(
    'applyTheme toggles classes on body, title, content and sets data-theme',
    () => {
      const doc = createMockDoc();

      applyTheme(doc, true);
      assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
      assert.equal(doc.body.classList.has('bg-dark'), true);
      assert.equal(doc.body.classList.has('dark-mode'), true);
      assert.equal(doc._state.title.classList.has('bg-dark'), true);
      assert.equal(doc._state.title.classList.has('text-light'), true);
      assert.equal(doc._state.heading.classList.has('bg-dark'), true);
      assert.equal(doc._state.content.classList.has('bg-dark'), true);

      applyTheme(doc, false);
      assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
      assert.equal(doc.body.classList.has('bg-dark'), false);
      assert.equal(doc.body.classList.has('dark-mode'), false);
      assert.equal(doc._state.title.classList.has('bg-dark'), false);
      assert.equal(doc._state.title.classList.has('text-light'), false);
      assert.equal(doc._state.content.classList.has('bg-dark'), false);
    },
  );

  await t.test(
    'initTheme initializes with preference and responds to media query',
    () => {
      const doc = createMockDoc();
      let changeHandler = null;
      const win = {
        matchMedia: () => ({
          matches: false,
          addEventListener: (_evt, h) => {
            changeHandler = h;
          },
        }),
      };

      let themeChangedCount = 0;
      const isDark = initTheme({
        targetWindow: win,
        targetDocument: doc,
        initialPreference: 'auto',
        devtoolsTheme: '',
        onThemeChange: () => {
          themeChangedCount++;
        },
      });

      assert.equal(isDark, false);
      assert.equal(getTheme(), 'auto');
      assert.equal(isDarkMode(), false);

      // Simulate system switching to dark mode
      if (changeHandler) {
        changeHandler({ matches: true });
      }
      assert.equal(isDarkMode(), true);
      assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
      assert.equal(themeChangedCount, 2);
    },
  );
});
