/**
 * networkContentReader.js
 *
 * DevTools request content retrieval, async streaming extraction,
 * and content-type parsing. Extracted from networkListener.js.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkContentReader');
} catch {}

let postBackgroundTask = (fn) => setTimeout(fn, 0);
try {
  const scheduler = require('../utils/scheduler.js');
  if (typeof scheduler.postBackgroundTask === 'function') {
    postBackgroundTask = scheduler.postBackgroundTask;
  }
} catch {}

/**
 * Normalizes content-type header string into standard identifier.
 *
 * @param {string} type
 * @returns {string}
 */
function getType(type) {
  if (!type || typeof type !== 'string') return '';
  return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1');
}

/**
 * Checks whether the URL matches Forge of Empires RPC or metadata endpoints.
 *
 * @param {string} reqUrl
 * @returns {boolean}
 */
function isFoeNetworkUrl(reqUrl) {
  if (!reqUrl || typeof reqUrl !== 'string') return false;
  return (
    reqUrl.includes('/game/json') ||
    reqUrl.includes('metadata?id=') ||
    reqUrl.includes('/metadata') ||
    reqUrl.includes('/start/metadata')
  );
}

/**
 * Safely extracts body content from DevTools network request, supporting
 * both modern Promise-based and legacy callback-based getContent implementations.
 * Defers retries to background tasks if initial body is empty.
 *
 * @param {Object} request - Chrome DevTools network request object
 * @param {Function} processContent - Callback receiving (content, encoding)
 */
function safeProcessContent(request, processContent) {
  if (!request || typeof request.getContent !== 'function') return;
  try {
    let called = false;
    const safeProcess = (content, encoding) => {
      if (called) return;
      if (!content) {
        setTimeout(() => {
          if (called) return;
          postBackgroundTask(() => {
            try {
              let p;
              try {
                p = request.getContent();
              } catch (e) {
                request.getContent((retryContent, retryEncoding) => {
                  if (retryContent) {
                    called = true;
                    processContent(retryContent, retryEncoding);
                  }
                });
                return;
              }
              if (p && typeof p.then === 'function') {
                p.then((res) => {
                  const [retryContent, retryEncoding] =
                    Array.isArray(res) ? res : [res, ''];
                  if (retryContent) {
                    called = true;
                    processContent(retryContent, retryEncoding);
                  }
                }).catch(() => {});
              }
            } catch (e) {
              logger?.debug('Error during background getContent retry', e);
            }
          });
        }, 150);
        return;
      }
      called = true;
      processContent(content, encoding);
    };

    let res;
    try {
      res = request.getContent();
    } catch (err) {
      res = request.getContent((content, encoding) => {
        safeProcess(content, encoding);
      });
    }

    if (res && typeof res.then === 'function') {
      res
        .then((args) => {
          if (Array.isArray(args)) safeProcess(args[0], args[1]);
          else safeProcess(args, '');
        })
        .catch((err) => {
          logger?.error('getContent promise error', err);
          console.error('getContent promise error', err);
        });
    }
  } catch (e) {
    logger?.error('Error in safeProcessContent', e);
    console.error('Error in safeProcessContent', e);
  }
}

module.exports = {
  safeProcessContent,
  getType,
  isFoeNetworkUrl,
};
module.exports.default = module.exports;
