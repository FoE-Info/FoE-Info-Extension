import assert from 'node:assert/strict';
import test from 'node:test';

const debugTogglePkg =
  await import('../../src/js/ui/components/debugToggle.js');
const { createDebugLogo, bindDebugToggle } =
  debugTogglePkg.default || debugTogglePkg;

const addElementPkg = await import('../../src/js/ui/AddElement.js');
const { isCustomButton } = addElementPkg.default || addElementPkg;

function createMockDocument() {
  function createElement(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      style: {},
      attributes: new Map(),
      listeners: {},
      setAttribute(k, v) {
        this.attributes.set(k, v);
      },
      getAttribute(k) {
        return this.attributes.get(k) ?? null;
      },
      addEventListener(event, fn) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(fn);
      },
    };
  }
  return { createElement };
}

test('Debug toggle logo: builds enabled bug icon with a11y wiring', () => {
  const doc = createMockDocument();
  const logo = createDebugLogo(doc, true);

  assert.equal(logo.tagName, 'SPAN');
  assert.equal(logo.textContent, 'bug_report');
  assert.equal(logo.getAttribute('role'), 'button');
  assert.equal(logo.getAttribute('tabindex'), '0');
  assert.equal(logo.getAttribute('aria-pressed'), 'true');
  assert.equal(logo.getAttribute('data-foe-native-keys'), 'true');
  assert.ok(logo.getAttribute('aria-label'));
});

test('Debug toggle logo: builds disabled image icon', () => {
  const doc = createMockDocument();
  const logo = createDebugLogo(doc, false);

  assert.equal(logo.tagName, 'IMG');
  assert.equal(logo.src, '/icons/Icon48.png');
  assert.equal(logo.alt, 'FoE-Info');
  assert.equal(logo.getAttribute('aria-pressed'), 'false');
  assert.equal(logo.getAttribute('data-foe-native-keys'), 'true');
});

test('Debug toggle: Enter keydown and Space keyup activate exactly once', () => {
  const doc = createMockDocument();
  const logo = createDebugLogo(doc, false);
  let activations = 0;
  bindDebugToggle(logo, () => {
    activations++;
  });

  const keydown = logo.listeners.keydown[0];
  const keyup = logo.listeners.keyup[0];

  const event = (key) => ({
    key,
    repeat: false,
    preventDefault() {},
  });

  keydown(event('Enter'));
  assert.equal(activations, 1, 'Enter must activate once');

  keydown(event('Enter'));
  assert.equal(activations, 2, 'each Enter press activates');

  keyup(event(' '));
  assert.equal(activations, 3, 'Space must activate once on keyup');

  keydown(event(' '));
  assert.equal(activations, 3, 'Space keydown must not activate');

  logo.listeners.click[0]();
  assert.equal(activations, 4, 'mouse click still activates');
});

test('Global custom-button handler opts out of native-key elements', () => {
  const optedOut = {
    tagName: 'SPAN',
    getAttribute: (k) => {
      if (k === 'role') return 'button';
      if (k === 'data-foe-native-keys') return 'true';
      return null;
    },
  };
  assert.equal(isCustomButton(optedOut), false);

  const plain = {
    tagName: 'SPAN',
    getAttribute: (k) => (k === 'role' ? 'button' : null),
  };
  assert.equal(
    isCustomButton(plain),
    true,
    'unmarked role=button still handled',
  );

  const nativeButton = {
    tagName: 'BUTTON',
    getAttribute: (k) => (k === 'role' ? 'button' : null),
  };
  assert.equal(isCustomButton(nativeButton), false);
});
