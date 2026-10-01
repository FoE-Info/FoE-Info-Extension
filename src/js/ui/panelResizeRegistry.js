/** Give dynamically rendered panels the shared grip and a separate scroll viewport. */
const {
  bindPanelResizeHandle,
  hasPanelResizeHandle,
} = require('./panelResizeHandle.js');

const sizeSetters = {
  friendsText: 'setFriendsSize',
  guildText: 'setFriendsSize',
  hoodText: 'setFriendsSize',
  listsText: 'setFriendsSize',
  buildingCostText: 'setBuildingCostSize',
  battlegroundCollapse: 'setBattlegroundSize',
  battlegroundTextCollapse: 'setBattlegroundSize',
  geChampionshipText: 'setExpeditionSize',
  geContributionText: 'setExpeditionSize',
  geInternationalCollapse: 'setExpeditionSize',
  geContributionCollapse: 'setExpeditionSize',
  rewardsText: 'setRewardSize',
};

function persistPanelSize(id, size) {
  const setter = sizeSetters[id];
  const globals = require('../fn/globals.mjs');
  if (setter) globals[setter]?.(size);
  else globals.setPanelSize(id, size);
}

function installPanelResizeHandles(
  root,
  {
    MutationObserverClass = globalThis.MutationObserver,
    onResize = persistPanelSize,
  } = {},
) {
  if (!root?.querySelectorAll) return () => {};
  const bindings = new Map();
  const sizes = new Map();
  let stopped = false;
  let queued = false;
  const refresh = () => {
    if (stopped) return;
    for (const [body, binding] of bindings) {
      if (!root.contains(body)) {
        binding.disconnect();
        bindings.delete(body);
      }
    }
    for (const body of root.querySelectorAll(
      '.resize, .resize-both, [data-panel-resizable], .alert > .collapse[id]',
    )) {
      if (!body.id || hasPanelResizeHandle(body)) continue;
      // Let an existing inner viewport own resizing rather than add two grips.
      if (body.querySelector?.('.resize, .resize-both, [data-panel-resizable]'))
        continue;
      let viewport = body.children.length === 1 ? body.children[0] : null;
      if (viewport?.tagName !== 'DIV') {
        viewport = body.ownerDocument.createElement('div');
        while (body.firstChild) viewport.appendChild(body.firstChild);
        body.appendChild(viewport);
      }
      viewport.classList.add('foe-panel-scroll');
      body.classList.add('foe-resizable-body');
      const shared =
        require('../fn/globals.mjs').toolOptions?.panelHeights?.[body.id];
      if (Number.isFinite(shared) && shared >= 50)
        body.style.height = `${shared}px`;
      else if (sizes.has(body.id))
        body.style.height = `${sizes.get(body.id)}px`;
      const binding = bindPanelResizeHandle(body, {
        minSize: 50,
        getSize: () => Math.ceil(body.getBoundingClientRect().height),
        setSize: (height) => {
          const size = Math.max(50, Math.round(height));
          sizes.set(body.id, size);
          body.classList.remove('gbg-changes-full');
          body.style.height = `${size}px`;
          body.style.maxHeight = 'none';
          body.style.minHeight = '0';
          onResize(body.id, size);
        },
      });
      if (binding) bindings.set(body, binding);
    }
  };
  const observer =
    MutationObserverClass ?
      new MutationObserverClass(() => {
        if (queued || stopped) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          refresh();
        });
      })
    : null;
  observer?.observe(root, { childList: true, subtree: true });
  refresh();
  return () => {
    stopped = true;
    observer?.disconnect();
    for (const binding of bindings.values()) binding.disconnect();
    bindings.clear();
  };
}

module.exports = { installPanelResizeHandles };
