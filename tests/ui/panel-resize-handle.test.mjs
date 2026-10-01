import assert from 'node:assert/strict';
import test from 'node:test';
import { bindPanelResizeHandle } from '../../src/js/ui/panelResizeHandle.js';

function target() {
  const listeners = new Map();
  return {
    addEventListener(key, fn) {
      listeners.set(key, fn);
    },
    removeEventListener(key) {
      listeners.delete(key);
    },
    fire(key, values = {}) {
      listeners.get(key)?.({ preventDefault() {}, ...values });
    },
  };
}
test('separate resize handle releases drag on up, cancel, lost buttons, and blur, and cleans up', () => {
  const view = target();
  const grip = {
    ...target(),
    setAttribute() {},
    setPointerCapture(id) {
      this.pointer = id;
    },
    hasPointerCapture(id) {
      return this.pointer === id;
    },
    releasePointerCapture() {
      this.pointer = undefined;
    },
    remove() {
      this.removed = true;
    },
  };
  const el = {
    ...target(),
    id: 'goodsText',
    style: { resize: 'vertical' },
    classList: { contains: () => true },
    ownerDocument: { defaultView: view, createElement: () => grip },
    after() {},
  };
  let size = 290;
  const binding = bindPanelResizeHandle(el, {
    minSize: 80,
    getSize: () => size,
    setSize: (value) => (size = value),
  });
  assert.equal(el.style.resize, 'none');
  const start = () =>
    grip.fire('pointerdown', { button: 0, pointerId: 1, clientY: 100 });
  const move = (y, buttons = 1) =>
    grip.fire('pointermove', { pointerId: 1, clientY: y, buttons });
  for (const end of ['pointerup', 'pointercancel', 'blur', 'buttons']) {
    start();
    move(120);
    const finalSize = size;
    if (end === 'blur') view.fire('blur');
    else if (end === 'buttons') move(180, 0);
    else grip.fire(end);
    move(200);
    assert.equal(size, finalSize, end);
    assert.equal(grip.pointer, undefined, end);
  }
  grip.fire('keydown', { key: 'Home' });
  assert.equal(size, 80);
  start();
  binding.disconnect();
  move(400);
  assert.equal(size, 80);
  assert.equal(grip.removed, true);
  assert.equal(el.style.resize, 'vertical');
});
