/**
 * MessagePriorityManager.js
 *
 * Manages dispatch priority rules and stable batch sorting for InnoGames RPC messages.
 * Encapsulates static metadata ordering invariants and custom priority overrides.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('PriorityManager');
} catch {}

class MessagePriorityManager {
  constructor() {
    this.priorities = new Map();
  }

  /**
   * Assign a dispatch priority to a specific method or entire class.
   * @param {string} requestClass
   * @param {string|null} [requestMethod]
   * @param {number} priority
   * @returns {MessagePriorityManager} this
   */
  setPriority(requestClass, requestMethod, priority) {
    if (!requestClass || typeof priority !== 'number') {
      return this;
    }
    const key =
      requestMethod ? `${requestClass}.${requestMethod}` : `${requestClass}.*`;
    this.priorities.set(key, priority);
    logger?.debug(`Set priority: ${key} = ${priority}`);
    return this;
  }

  /**
   * Calculate priority weight for a message (higher executes earlier).
   * @param {Object} msg
   * @returns {number}
   */
  getMessagePriority(msg) {
    if (!msg || typeof msg !== 'object') return 0;
    const specificKey = `${msg.requestClass}.${msg.requestMethod}`;
    if (this.priorities.has(specificKey)) {
      return this.priorities.get(specificKey);
    }
    const classKey = `${msg.requestClass}.*`;
    if (this.priorities.has(classKey)) {
      return this.priorities.get(classKey);
    }
    // InnoGames Invariant: StaticDataService metadata must load before StartupService data
    if (
      msg.requestClass === 'StaticDataService' &&
      msg.requestMethod === 'getMetadata'
    ) {
      return 100;
    }
    if (msg.requestClass === 'StaticDataService') {
      return 90;
    }
    return 0;
  }

  /**
   * Stably sort an array of messages by priority descending.
   * @param {Array} messages
   * @returns {Array}
   */
  sortBatch(messages) {
    if (!Array.isArray(messages) || messages.length <= 1) return messages;
    return messages
      .map((msg, index) => ({
        msg,
        index,
        priority: this.getMessagePriority(msg),
      }))
      .sort((a, b) => b.priority - a.priority || a.index - b.index)
      .map((item) => item.msg);
  }
}

module.exports = {
  MessagePriorityManager,
};
