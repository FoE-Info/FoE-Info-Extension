/** A separate drag handle avoids the native grip beside the inner scrollbar. */
const boundElements = new WeakSet();

function hasPanelResizeHandle(element) {
  return boundElements.has(element);
}

function bindPanelResizeHandle(element, { minSize, getSize, setSize }) {
  if (boundElements.has(element)) return null;
  const doc = element.ownerDocument;
  if (!doc?.createElement || typeof element.after !== 'function') return null;
  boundElements.add(element);
  const handle = doc.createElement('button');
  handle.type = 'button';
  handle.className = 'foe-resize-handle';
  handle.setAttribute('data-i18n-aria-label', 'resize_panel');
  const label = require('../utils/i18n.js').t('resize_panel');
  handle.setAttribute(
    'aria-label',
    label === 'resize_panel' ? 'Resize panel' : label,
  );
  handle.setAttribute('aria-controls', element.id);
  const view = doc.defaultView;
  const nativeResize = element.style.resize;
  element.style.resize = 'none';
  element.after(handle);
  const removers = [];
  const listen = (target, event, callback) => {
    target?.addEventListener(event, callback);
    removers.push(() => target?.removeEventListener(event, callback));
  };
  let drag = null;
  const finish = () => {
    const pointer = drag?.id;
    drag = null;
    if (pointer !== undefined && handle.hasPointerCapture?.(pointer))
      handle.releasePointerCapture(pointer);
  };
  listen(handle, 'pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = { id: event.pointerId, y: event.clientY, size: getSize() };
    handle.setPointerCapture?.(event.pointerId);
  });
  listen(handle, 'pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.buttons === 0) {
      finish();
      return;
    }
    setSize(Math.max(minSize, drag.size + event.clientY - drag.y));
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
    listen(handle, event, finish);
  listen(view, 'blur', finish);
  listen(handle, 'keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    setSize(
      event.key === 'Home' ?
        minSize
      : Math.max(minSize, getSize() + (event.key === 'ArrowDown' ? 10 : -10)),
    );
  });
  const update = () => {
    handle.hidden = !element.classList?.contains('show');
    if (handle.hidden) finish();
  };
  listen(element, 'hidden.bs.collapse', update);
  listen(element, 'shown.bs.collapse', update);
  update();
  return {
    disconnect() {
      boundElements.delete(element);
      finish();
      for (const remove of removers) remove();
      handle.remove();
      element.style.resize = nativeResize;
    },
  };
}
module.exports = { bindPanelResizeHandle, hasPanelResizeHandle };
