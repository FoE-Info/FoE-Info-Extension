/**
 * PopoverManager.js
 *
 * Interactive Bootstrap 5.3 Popover and Tooltip lifecycle manager for DevTools panels.
 * Handles hover delays, tip interaction, text selection, and clean disposal.
 */

function getBootstrap() {
  if (typeof window !== 'undefined' && window.bootstrap) {
    return window.bootstrap;
  }
  try {
    return require('bootstrap');
  } catch {
    return null;
  }
}

/**
 * Initializes and binds interactive tooltips and popovers within a container.
 *
 * @param {HTMLElement} container Container element
 * @param {Object} [customBs] Optional Bootstrap instance override
 */
function initPopovers(container, customBs = null) {
  if (!container || typeof container.querySelectorAll !== 'function') return;

  try {
    const bs = customBs || getBootstrap();
    if (!bs) return;

    // Tooltips
    if (bs.Tooltip) {
      container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        const existing = bs.Tooltip.getInstance(el);
        if (existing) {
          existing.dispose();
        }
        new bs.Tooltip(el, {
          html: true,
          container: 'body',
          delay: { show: 100, hide: 500 },
        });
      });
    }

    // Interactive Popovers
    if (bs.Popover) {
      container.querySelectorAll('[data-bs-toggle="popover"]').forEach((el) => {
        const existing = bs.Popover.getInstance(el);
        if (existing) {
          existing.dispose();
        }

        const titleGetter = () =>
          el.getAttribute('data-bs-title') || el.getAttribute('title') || '';
        const contentGetter = () => el.getAttribute('data-bs-content') || '';

        const popover = new bs.Popover(el, {
          html: true,
          trigger: 'manual',
          container: 'body',
          sanitize: false,
          animation: false,
          title: titleGetter,
          content: contentGetter,
        });

        let showTimer = null;
        let hideTimer = null;
        let isSelecting = false;

        const getTip = () => {
          try {
            if (popover.tip) return popover.tip;
            if (typeof popover._getTipElement === 'function') {
              return popover._getTipElement();
            }
            const ariaId = el.getAttribute('aria-describedby');
            if (ariaId) return document.getElementById(ariaId);
          } catch {}
          return null;
        };

        const showPopover = () => {
          if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
          }
          if (!showTimer) {
            showTimer = setTimeout(() => {
              showTimer = null;
              popover.show();
              bindPopoverBox();
            }, 80);
          }
        };

        const hidePopover = () => {
          if (showTimer) {
            clearTimeout(showTimer);
            showTimer = null;
          }
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(() => {
            if (isSelecting) return;
            const tip = getTip();
            if (tip && tip.matches(':hover')) return;
            popover.hide();
          }, 350);
        };

        el.addEventListener('mouseenter', showPopover);
        el.addEventListener('mouseleave', (e) => {
          const tip = getTip();
          if (
            tip &&
            e.relatedTarget &&
            (tip === e.relatedTarget || tip.contains(e.relatedTarget))
          ) {
            return;
          }
          hidePopover();
        });
        el.addEventListener('focus', showPopover);
        el.addEventListener('blur', hidePopover);

        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tip = getTip();
          if (tip && tip.classList.contains('show')) {
            hidePopover();
          } else {
            showPopover();
          }
        });

        const bindPopoverBox = () => {
          const tip = getTip();
          if (tip && !tip._hoverBound) {
            tip._hoverBound = true;
            tip.addEventListener('mouseenter', () => {
              if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
              }
            });
            tip.addEventListener('mouseleave', (e) => {
              if (
                e.relatedTarget &&
                (el === e.relatedTarget || el.contains(e.relatedTarget))
              ) {
                return;
              }
              hidePopover();
            });
            tip.addEventListener('mousedown', () => {
              isSelecting = true;
              if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
              }
            });
            window.addEventListener('mouseup', () => {
              if (isSelecting) {
                isSelecting = false;
                const curTip = getTip();
                if (
                  curTip &&
                  !curTip.matches(':hover') &&
                  !el.matches(':hover')
                ) {
                  hidePopover();
                }
              }
            });
          }
        };

        el.addEventListener('inserted.bs.popover', bindPopoverBox);
        el.addEventListener('shown.bs.popover', bindPopoverBox);
      });
    }
  } catch {
    // Graceful fallback for test or headless environments without full DOM
  }
}

module.exports = {
  initPopovers,
};
module.exports.default = initPopovers;
