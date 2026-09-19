/**
 * cardVisibilityDebugStubs.js
 *
 * Debug-mode stub DOM observer and annotation engine.
 * Annotates visible panels with debug stubs carrying raw rendered dumps,
 * and tracks DOM mutations to keep stubs in sync with dynamic panel re-renders.
 */

const { DEBUG_STUB_PANEL_IDS } = require('./cardVisibilityConfig.js');

let debugStubObserver = null;
let debugStubSyncQueued = false;

/** Escape a value for safe inclusion inside the debug stub markup. */
function escapeDebugData(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip any previously injected debug stub from a panel's innerHTML. */
function stripDebugStubs(html) {
  return String(html || '')
    .replace(/<div[^>]*class="[^"]*debug-stub[^"]*"[^>]*>.*?<\/div>/gs, '')
    .trim();
}

function debugStubBody(data) {
  return data ?
      `<details><summary>data</summary><pre class="m-0" style="white-space: pre-wrap; word-break: break-word;">${escapeDebugData(
        data,
      )}</pre></details>`
    : '<span class="fst-italic">empty</span>';
}

function makeDebugStubMarkup(panelId, data) {
  return `<div class="alert alert-secondary p-2 mb-2 font-monospace small debug-stub" data-foe-stub-for="${panelId}"><strong>[DEBUG STUB]</strong> ${panelId} ${debugStubBody(
    data,
  )}</div>`;
}

/** True when the element is currently rendered (inline or computed display). */
function isPanelVisible(el) {
  if (!el) return false;
  if (el.style && el.style.display === 'none') return false;
  if (typeof getComputedStyle === 'function') {
    try {
      if (getComputedStyle(el).display === 'none') return false;
    } catch {
      // ignore: non-DOM test double
    }
  }
  return true;
}

/** True when a visible stubbed panel wraps this element (avoids nesting stubs). */
function hasVisibleStubAncestor(el) {
  let parent = el.parentElement || null;
  while (parent) {
    if (DEBUG_STUB_PANEL_IDS.has(parent.id) && isPanelVisible(parent)) {
      return true;
    }
    parent = parent.parentElement || null;
  }
  return false;
}

/** Prefer the panel's primary card so the stub reads as attached inside it. */
function resolveDebugStubHost(el) {
  if (typeof el.querySelector !== 'function') return el;
  return (
    el.querySelector(':scope > .alert:not(.debug-stub)') ||
    el.querySelector(':scope > [class*="foe-card"]') ||
    el.querySelector(':scope > .card') ||
    el.querySelector('.alert:not(.debug-stub)') ||
    el.querySelector('[class*="foe-card"]') ||
    el.querySelector('.card') ||
    el
  );
}

/**
 * Insert or refresh a panel's debug stub with a raw (escaped) dump of its
 * current rendered content. The stub is kept as the first child of the panel's
 * card so it reads as attached, while sibling nodes and their listeners survive.
 */
function upsertDebugStub(el, panelId) {
  const data = stripDebugStubs(el.innerHTML);

  if (typeof el.querySelector === 'function') {
    const host = resolveDebugStubHost(el);
    const existing =
      el.querySelector(`.debug-stub[data-foe-stub-for="${panelId}"]`) ||
      el.querySelector('.debug-stub');

    if (existing && existing.parentElement === host) {
      if (typeof existing.setAttribute === 'function') {
        existing.setAttribute('data-foe-stub-for', panelId);
      }
      const pre =
        typeof existing.querySelector === 'function' ?
          existing.querySelector('pre')
        : null;
      if (data && pre) {
        if (pre.textContent !== data) pre.textContent = data;
        return;
      }
      if (!data && !pre) return;
    }
    if (existing && typeof existing.remove === 'function') existing.remove();
    if (typeof host.insertAdjacentHTML === 'function') {
      host.insertAdjacentHTML('afterbegin', makeDebugStubMarkup(panelId, data));
      return;
    }
  }

  // Test-double fallback (no real DOM querying): rebuild stripped markup.
  el.innerHTML =
    makeDebugStubMarkup(panelId, data) + stripDebugStubs(el.innerHTML);
}

/** Remove every debug stub and stop observing panel mutations. */
function removeDebugStubs() {
  if (debugStubObserver) {
    debugStubObserver.disconnect();
    debugStubObserver = null;
  }
  if (typeof document.querySelectorAll !== 'function') return;
  const stubs = document.querySelectorAll('.debug-stub') || [];
  for (const stub of stubs) {
    if (stub?.parentNode?.removeChild) {
      stub.parentNode.removeChild(stub);
    }
  }
}

/** Rebuild stubs for every visible topmost panel with its live content. */
function syncDebugStubs() {
  if (typeof document === 'undefined') return;

  const targets = [];
  for (const id of DEBUG_STUB_PANEL_IDS) {
    const el = document.getElementById(id);
    if (!el || !isPanelVisible(el)) continue;
    if (hasVisibleStubAncestor(el)) continue;
    if (stripDebugStubs(el.innerHTML).trim() === '') continue;
    targets.push([id, el]);
  }
  const keep = new Set(targets.map(([id]) => id));

  if (typeof document.querySelectorAll === 'function') {
    for (const stub of document.querySelectorAll('.debug-stub') || []) {
      const owner =
        stub.getAttribute?.('data-foe-stub-for') ||
        stub.dataset?.foeStubFor ||
        '';
      const ownerEl = owner ? document.getElementById(owner) : null;
      if (!keep.has(owner) || !isPanelVisible(ownerEl)) {
        if (stub.parentNode?.removeChild) stub.parentNode.removeChild(stub);
      }
    }
  }

  for (const [id, el] of targets) upsertDebugStub(el, id);
}

function scheduleDebugStubSync() {
  if (debugStubSyncQueued) return;
  debugStubSyncQueued = true;
  const run = () => {
    debugStubSyncQueued = false;
    syncDebugStubs();
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else if (typeof setTimeout === 'function') setTimeout(run, 0);
  else run();
}

/** Watch panel mount/render mutations so stubs always reflect live content. */
function ensureDebugStubObserver() {
  if (debugStubObserver || typeof MutationObserver === 'undefined') return;
  if (typeof document === 'undefined') return;
  const root = document.body || document.documentElement;
  if (!root) return;
  debugStubObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) => {
      if (m.target?.closest?.('.debug-stub')) return false;
      const nodes = [...(m.addedNodes || []), ...(m.removedNodes || [])];
      if (
        nodes.length > 0 &&
        nodes.every((n) => n.classList && n.classList.contains('debug-stub'))
      ) {
        return false;
      }
      return true;
    });
    if (relevant) scheduleDebugStubSync();
  });
  debugStubObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

module.exports = {
  escapeDebugData,
  stripDebugStubs,
  makeDebugStubMarkup,
  isPanelVisible,
  upsertDebugStub,
  removeDebugStubs,
  syncDebugStubs,
  ensureDebugStubObserver,
};
module.exports.default = module.exports;
