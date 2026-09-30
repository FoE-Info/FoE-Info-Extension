/**
 * renderGbgTargets.js
 *
 * Pure DOM rendering for GBG target conversation messages. Extracted
 * from ConversationService.renderTargetMessage to enforce service-layer
 * DOM purity (docs/architecture.md §42). ConversationService now delegates
 * all DOM writes here; it retains only data routing and state management.
 *
 * This module owns the full DOM lifecycle: creation, population, event
 * wiring, and the 10-minute auto-dismiss timer including DOM cleanup.
 */

const { createLogger } = require('../utils/logger.js');
const logger = createLogger('RenderGbgTargets');

let element = null;
try {
  element = require('../fn/AddElement.js');
} catch {}
let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}
let helper = null;
try {
  helper = require('../fn/helper.js');
} catch {}

const { escapeHTML } = require('../utils/escape.js');

let post_webstore = null;
try {
  post_webstore = require('../fn/post.js');
} catch {}

const { renderGbgTargetMessage } = require('./serviceDomBridge.js');

let targetsTimer = null;

/**
 * Renders a GBG target message into the panel DOM with a 10-minute
 * auto-dismiss timer. This is the sole rendering path — ConversationService
 * has no DOM access and delegates entirely here.
 *
 * @param {object}   message           - Parsed target message
 * @param {object}   gbgState          - guildBattlegroundState
 * @param {Function} [onDismiss]       - Called when timer fires (for state cleanup)
 */
function renderTargetMessage(message, gbgState, onDismiss) {
  if (!message) return;
  logger.debug('Rendering GBG target message');
  gbgState?.setTargetMessageActive?.(true);
  const timerId = Math.random().toString(36).substr(2, 5);
  let targetsHTML = `<div id="alert-${timerId}" class="alert alert-info alert-dismissible show" role="alert">`;
  if (typeof element?.close === 'function') {
    targetsHTML += element.close();
  }

  const canPost =
    (typeof helper?.checkGBG === 'function' && helper.checkGBG()) ||
    Boolean(helper?.MyGuildPermissions & 64);
  if (canPost && typeof element?.post === 'function') {
    targetsHTML += element.post(
      'targetPostID',
      'primary',
      'right',
      collapse.collapseTarget,
    );
  }

  const rawText = message?.lastMessage?.text || message?.text || '';
  const safeText = escapeHTML(rawText).replace(/(?:\r\n|\r|\n)/g, '<br>');

  const rawSender =
    message?.lastMessage?.sender?.name ||
    message?.sender?.name ||
    (typeof message?.sender === 'string' ? message.sender : '');
  const safeSender = escapeHTML(rawSender);

  const rawDate = message?.lastMessage?.date || message?.date;
  let formattedDate;
  if (typeof rawDate === 'number') {
    formattedDate = formatTimeSafe(rawDate);
  } else if (rawDate) {
    formattedDate = String(rawDate);
  } else {
    formattedDate = formatTimeSafe(Math.floor(Date.now() / 1000));
  }
  const safeDate = escapeHTML(formattedDate);

  const iconHTML =
    typeof element?.icon === 'function' ?
      element.icon('targeticon', 'targetText', collapse.collapseTarget)
    : '';

  const alertTime = formatTimeSafe(Math.floor(Date.now() / 1000));

  targetsHTML += `<p id="targetLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#targetText" aria-expanded="${!collapse.collapseTarget}" aria-controls="targetText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
  ${iconHTML}
            <strong><span data-i18n="gbg_targets">GBG Targets</span></strong> ${safeDate}</p><p id="targetText" class="collapse ${
              collapse.collapseTarget ? '' : 'show'
            }">${safeText}<br><span class="text-muted"><span data-i18n="by">by</span> ${safeSender}. <span data-i18n="alert_at">alert at</span> ${alertTime}</span></p></div>`;

  // Delegate all DOM writes + event wiring to the bridge
  renderGbgTargetMessage({
    html: targetsHTML,
    collapse,
    postTargets: canPost ? post_webstore?.postTargetsToDiscord : null,
    state: gbgState,
  });
  logger.debug('Rendered GBG target message');
  // Auto-dismiss after 10 minutes — DOM cleanup + state callback owned here
  clearTimeout(targetsTimer);
  targetsTimer = setTimeout(function () {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('targetsGBG');
      if (el) el.innerHTML = '';
    }
    logger.debug('Auto-dismissed GBG target message');
    targetsTimer = null;
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  }, 600000);
  if (typeof targetsTimer?.unref === 'function') {
    targetsTimer.unref();
  }
}

function formatTimeSafe(value) {
  try {
    const dateUtils = require('../utils/date.js');
    if (typeof dateUtils?.formatTime === 'function') {
      return dateUtils.formatTime(value);
    }
  } catch {}
  return '';
}

module.exports = { renderTargetMessage };
module.exports.default = module.exports;
