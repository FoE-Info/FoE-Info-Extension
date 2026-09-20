/**
 * galaxyPanelEvents.js
 *
 * Event listener binding for Blue Galaxy panel collapse toggles.
 * Dual CJS/ESM compatible.
 */

/**
 * Binds click listeners for collapsing/expanding the Galaxy panel.
 *
 * @param {Object} params
 * @param {HTMLElement|Object} params.el - Container element.
 * @param {Function} params.onToggleCollapse - Collapse toggle callback.
 */
function bindGalaxyCollapseEvents({ el, onToggleCollapse }) {
  if (!el || typeof onToggleCollapse !== 'function') {
    return;
  }

  const labelEl =
    typeof document !== 'undefined' ?
      document.getElementById('galaxyTextLabel')
    : el.querySelector?.('#galaxyTextLabel');

  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#galaxyicon')
      ) {
        return;
      }
      onToggleCollapse();
    });
  }

  const iconEl =
    typeof document !== 'undefined' ?
      document.getElementById('galaxyicon')
    : el.querySelector?.('#galaxyicon');

  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      onToggleCollapse();
    });
  }
}

module.exports = {
  bindGalaxyCollapseEvents,
};
module.exports.default = module.exports;
