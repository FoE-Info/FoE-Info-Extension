/** Messages and teasers RPC service for player conversation threads. */
let Alert;
try {
  const bs = require('bootstrap');
  Alert = bs.Alert;
} catch {}
let dateUtils = {};
try {
  dateUtils = require('../utils/date.js');
} catch {}

function formatTimeSafe(value) {
  return typeof dateUtils?.formatTime === 'function' ?
      dateUtils.formatTime(value)
    : '';
}
let element = { close: () => '', post: () => '', icon: () => '' };
try {
  element = require('../ui/AddElement.js');
} catch {
  try {
    element = require('../fn/AddElement');
  } catch {}
}
let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}
let helper = {};
try {
  helper = require('../fn/helper.js');
} catch {}
let post_webstore = {};
try {
  post_webstore = require('../fn/post.js');
} catch {}
let extractRateFromTitle = () => 0;
try {
  const rp = require('../fn/rateParser.js');
  extractRateFromTitle = rp.extractRateFromTitle;
} catch {}
let targets = null;
let targetsTopic = '🎯🎯 Battleground TARGETS 🎯🎯';
if (typeof __webpack_require__ !== 'undefined') {
  try {
    const state = require('../vars/state.js');
    targets = state.targets;
    targetsTopic = state.targetsTopic;
  } catch {}
}

function setTargetsTopic(topic) {
  targetsTopic = topic;
}

function getTargetsTopic() {
  if (typeof __webpack_require__ !== 'undefined') {
    try {
      const state = require('../vars/state.js');
      if (state?.targetsTopic) return state.targetsTopic;
    } catch {}
  }
  return targetsTopic || 'targets';
}

function isTargetsTopic(title) {
  if (!title || typeof title !== 'string') return false;
  const activeTopic = getTargetsTopic();
  const lower = title.toLowerCase();
  if (activeTopic && lower.includes(activeTopic.toLowerCase())) {
    return true;
  }
  return lower.includes('targets') || title.includes('🎯');
}
let setCurrentPercent = () => {};
try {
  const gb = require('./GreatBuildingsService.js');
  setCurrentPercent = gb.setCurrentPercent;
} catch {}
let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('ConversationService');
} catch {}

let targetsTimer = null;
let lastTargetsConversationId = null;

function renderTargetMessage(message) {
  if (!message) return;
  const targetsGBG =
    document.getElementById('targetsGBG') ||
    (() => {
      const el = document.createElement('div');
      el.id = 'targetsGBG';
      targets?.appendChild?.(el);
      return el;
    })();

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
  const safeText = (
    typeof helper?.escapeHTML === 'function' ?
      helper.escapeHTML(rawText)
    : String(rawText).replace(
        /[&<>"']/g,
        (m) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[m],
      )).replace(/(?:\r\n|\r|\n)/g, '<br>');

  const rawSender =
    message?.lastMessage?.sender?.name ||
    message?.sender?.name ||
    (typeof message?.sender === 'string' ? message.sender : '');
  const safeSender =
    typeof helper?.escapeHTML === 'function' ?
      helper.escapeHTML(rawSender)
    : String(rawSender).replace(
        /[&<>"']/g,
        (m) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[m],
      );

  const rawDate = message?.lastMessage?.date || message?.date;
  let formattedDate;
  if (typeof rawDate === 'number') {
    formattedDate = formatTimeSafe(rawDate);
  } else if (rawDate) {
    formattedDate = String(rawDate);
  } else {
    formattedDate = formatTimeSafe(Math.floor(Date.now() / 1000));
  }
  const safeDate =
    typeof helper?.escapeHTML === 'function' ?
      helper.escapeHTML(formattedDate)
    : String(formattedDate).replace(
        /[&<>"']/g,
        (m) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[m],
      );

  const iconHTML =
    typeof element?.icon === 'function' ?
      element.icon('targeticon', 'targetText', collapse.collapseTarget)
    : '';

  const alertTime = formatTimeSafe(Math.floor(Date.now() / 1000));

  targetsGBG.innerHTML =
    targetsHTML +
    `<p id="targetLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#targetText" aria-expanded="${!collapse.collapseTarget}" aria-controls="targetText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
  ${iconHTML}
            <strong>GBG Targets</strong> ${safeDate}</p><p id="targetText" class="collapse ${
              collapse.collapseTarget ? '' : 'show'
            }">${safeText}<br><span class="text-muted">by ${safeSender}. alert @ ${alertTime}</span></p></div>`;

  if (targetsTimer) clearTimeout(targetsTimer);
  targetsTimer = setTimeout(function () {
    if (targetsGBG) targetsGBG.innerHTML = '';
    targetsTimer = null;
  }, 600000);
  if (targetsTimer && typeof targetsTimer.unref === 'function') {
    targetsTimer.unref();
  }

  document
    .getElementById('targetLabel')
    ?.addEventListener('click', collapse.fCollapseTarget);
  if (canPost) {
    document
      .getElementById('targetPostID')
      ?.addEventListener('click', post_webstore.postTargetsToDiscord);
  }
}

function conversationService(msg) {
  let messages = [];
  if (Array.isArray(msg?.responseData?.category?.teasers)) {
    messages = msg.responseData.category.teasers;
  } else if (Array.isArray(msg?.responseData?.teasers)) {
    messages = msg.responseData.teasers;
  } else if (Array.isArray(msg?.responseData?.categories)) {
    for (const cat of msg.responseData.categories) {
      if (Array.isArray(cat?.teasers)) {
        messages.push(...cat.teasers);
      }
    }
  } else if (Array.isArray(msg?.responseData)) {
    messages = msg.responseData;
  }

  messages.forEach(function (message) {
    if (isTargetsTopic(message?.title)) {
      if (message.id) lastTargetsConversationId = message.id;
      renderTargetMessage(message);
    }
  });

  setCurrentPercent(0); // reset to custom %
}

function getConversation(msg) {
  const resp = msg?.responseData || msg;
  if (!resp) return;

  // if title includes donation %, setCurrentPercent for donation helper
  getPercent(resp.title);

  if (isTargetsTopic(resp.title)) {
    if (resp.id) lastTargetsConversationId = resp.id;
    const msgs = Array.isArray(resp.messages) ? resp.messages : [];
    const latestMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    if (latestMsg) {
      renderTargetMessage({
        title: resp.title,
        conversationId: resp.id,
        text: latestMsg.text,
        sender: latestMsg.sender,
        date: latestMsg.date,
      });
    }
  }
}

function getNewMessage(msg) {
  const data = msg?.responseData || msg;
  if (!data) return;
  if (
    lastTargetsConversationId &&
    data.conversationId === lastTargetsConversationId
  ) {
    renderTargetMessage({
      title: targetsTopic,
      conversationId: data.conversationId,
      text: data.text,
      sender: data.sender,
      date: data.date,
    });
  }
}

function getPercent(title) {
  try {
    if (!title || title === '') return;
    const rate = extractRateFromTitle(title);
    setCurrentPercent(rate);
  } catch (error) {
    logger?.error?.('Failed to parse trade percentage from title', error);
  }
}

module.exports = {
  conversationService,
  getConversation,
  getNewMessage,
  renderTargetMessage,
  extractRateFromTitle,
  setTargetsTopic,
  getTargetsTopic,
  isTargetsTopic,
};
module.exports.default = module.exports;
