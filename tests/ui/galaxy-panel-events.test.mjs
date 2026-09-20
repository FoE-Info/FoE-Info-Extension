import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { bindGalaxyCollapseEvents } from '../../src/js/ui/galaxyPanelEvents.js';

function createMockNode(id = '') {
  const listeners = new Map();
  return {
    id,
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    dispatch(event, e = {}) {
      const handlers = listeners.get(event) || [];
      for (const h of handlers) h(e);
    },
  };
}

describe('galaxyPanelEvents Suite', () => {
  beforeEach(() => {
    delete globalThis.document;
  });

  it('safely handles missing container or missing onToggleCollapse callback', () => {
    assert.doesNotThrow(() => {
      bindGalaxyCollapseEvents({ el: null, onToggleCollapse: null });
      bindGalaxyCollapseEvents({ el: {}, onToggleCollapse: null });
      bindGalaxyCollapseEvents({ el: null, onToggleCollapse: () => {} });
    });
  });

  it('attaches listener to label and executes callback on click', () => {
    let clicked = 0;
    const label = createMockNode('galaxyTextLabel');
    const container = {
      querySelector(sel) {
        if (sel === '#galaxyTextLabel') return label;
        return null;
      },
    };

    bindGalaxyCollapseEvents({
      el: container,
      onToggleCollapse: () => {
        clicked++;
      },
    });

    label.dispatch('click', { target: label });
    assert.equal(clicked, 1);
  });

  it('ignores label click when click target is or is inside #galaxyicon', () => {
    let clicked = 0;
    const label = createMockNode('galaxyTextLabel');
    const icon = createMockNode('galaxyicon');
    const container = {
      querySelector(sel) {
        if (sel === '#galaxyTextLabel') return label;
        if (sel === '#galaxyicon') return icon;
        return null;
      },
    };

    bindGalaxyCollapseEvents({
      el: container,
      onToggleCollapse: () => {
        clicked++;
      },
    });

    const event = {
      target: {
        closest(sel) {
          return sel === '#galaxyicon' ? icon : null;
        },
      },
    };

    label.dispatch('click', event);
    assert.equal(clicked, 0);

    // Clicking icon itself triggers callback
    icon.dispatch('click');
    assert.equal(clicked, 1);
  });
});
