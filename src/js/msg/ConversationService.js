/** Messages and teasers RPC service for player conversation threads. */

let extractRateFromTitle = () => 0;
try {
  const rp = require('../fn/rateParser.js');
  extractRateFromTitle = rp.extractRateFromTitle;
} catch {}
let targetsTopic = 'Targets';
if (typeof __webpack_require__ !== 'undefined') {
  try {
    const state = require('../vars/state.mjs');
    targetsTopic = state.targetsTopic;
  } catch {}
}

function setTargetsTopic(topic) {
  targetsTopic = topic;
}

function getTargetsTopic() {
  if (typeof __webpack_require__ !== 'undefined') {
    try {
      const state = require('../vars/state.mjs');
      if (state?.targetsTopic && state.targetsTopic.trim()) {
        return state.targetsTopic.trim();
      }
    } catch {}
  }
  return (targetsTopic && targetsTopic.trim()) || 'Targets';
}

function isTargetsTopic(title) {
  if (!title || typeof title !== 'string') return false;
  const activeTopic = getTargetsTopic();
  if (!activeTopic) return false;
  return title.toLowerCase().includes(activeTopic.toLowerCase());
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
let guildBattlegroundState = null;
try {
  ({ guildBattlegroundState } = require('../state/GuildDomainState.js'));
} catch {}

let lastTargetsConversationId = null;

// DOM rendering delegated entirely to ui/renderGbgTargets.js (§5 layer purity).
// This service has ZERO DOM access — all rendering, timers, and DOM cleanup
// live in the UI module. State callbacks are injected via onDismiss.
let renderGbgTargets = null;
function configurePresentation(callbacks = {}) {
  if (typeof callbacks.renderTargetMessage === 'function')
    renderGbgTargets = callbacks.renderTargetMessage;
}

function renderTargetMessage(message) {
  if (!message) return;
  // Delegate all DOM + timer lifecycle to the UI module.
  // The onDismiss callback handles state cleanup (non-DOM).
  if (typeof renderGbgTargets === 'function') {
    renderGbgTargets(message, guildBattlegroundState, () =>
      guildBattlegroundState?.setTargetMessageActive?.(false),
    );
  }
}

function getLatestMessage(msgs) {
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  let latest = msgs[0];
  let maxId = Number(latest?.id) || 0;
  for (let i = 1; i < msgs.length; i++) {
    const currentId = Number(msgs[i]?.id) || 0;
    if (currentId > maxId) {
      maxId = currentId;
      latest = msgs[i];
    }
  }
  return latest;
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

  let bestTargetMessage = null;
  let maxMsgId = -1;

  messages.forEach(function (message) {
    if (isTargetsTopic(message?.title)) {
      const msgId = Number(message?.lastMessage?.id || message?.id) || 0;
      if (msgId >= maxMsgId) {
        maxMsgId = msgId;
        bestTargetMessage = message;
      }
    }
  });

  if (bestTargetMessage) {
    if (bestTargetMessage.id) lastTargetsConversationId = bestTargetMessage.id;
    renderTargetMessage(bestTargetMessage);
  }

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
    const latestMsg = getLatestMessage(msgs);
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

function register(dispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return this;

  const targetConversationService =
    options.conversationService || conversationService;
  const targetGetConversation = options.getConversation || getConversation;
  const targetGetNewMessage =
    options.getNewMessage || getNewMessage || targetConversationService;

  dispatcher.register('ConversationService', 'getTeasers', (msg, req, ctx) =>
    targetConversationService(msg, req, ctx),
  );
  dispatcher.register('ConversationService', 'getCategory', (msg, req, ctx) =>
    targetConversationService(msg, req, ctx),
  );
  dispatcher.register(
    'ConversationService',
    'getOverviewForCategory',
    (msg, req, ctx) => targetConversationService(msg, req, ctx),
  );
  dispatcher.register('ConversationService', 'getOverview', (msg, req, ctx) =>
    targetConversationService(msg, req, ctx),
  );
  dispatcher.register('ConversationService', 'getNewMessage', (msg, req, ctx) =>
    targetGetNewMessage(msg, req, ctx),
  );
  dispatcher.register(
    'ConversationService',
    'getConversation',
    (msg, req, ctx) => targetGetConversation(msg, req, ctx),
  );

  logger?.debug?.('ConversationService registered RPC handlers');
  return this;
}

const conversationServiceExport = conversationService;
conversationServiceExport.register = register;

module.exports = {
  conversationService,
  ConversationService: conversationServiceExport,
  getConversation,
  getNewMessage,
  getLatestMessage,
  renderTargetMessage,
  extractRateFromTitle,
  setTargetsTopic,
  getTargetsTopic,
  isTargetsTopic,
  register,
};
module.exports.default = module.exports;

module.exports.configurePresentation = configurePresentation;
