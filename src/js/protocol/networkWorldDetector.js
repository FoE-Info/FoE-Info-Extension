/**
 * networkWorldDetector.js
 *
 * Inspects incoming network request URLs to identify game origin and world server,
 * enforces inspected world isolation, and coordinates storage and UI settings.
 * Extracted from networkListener.js.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkWorldDetector');
} catch {}

/**
 * Detects world and origin from request URL, verifies matching inspected world,
 * and synchronizes state, storage, and UI options.
 *
 * @param {string} reqUrl
 * @param {Object} deps
 * @returns {{ accepted: boolean, detectedWorld?: string, origin?: string }}
 */
function detectAndSyncWorldOrigin(reqUrl, deps = {}) {
  if (!reqUrl) return { accepted: true };

  const originMatch = reqUrl.match(/^(https?:\/\/[^/]+)/i);
  if (originMatch) {
    const worldMatch = originMatch[1].match(
      /https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i,
    );
    if (worldMatch && worldMatch[1]) {
      const detectedWorld = worldMatch[1].toLowerCase();
      const inspectedWorld =
        typeof deps.getInspectedWorldId === 'function' ?
          deps.getInspectedWorldId()
        : (deps.inspectedWorldId ?? null);

      if (inspectedWorld && detectedWorld !== inspectedWorld) {
        if (inspectedWorld.endsWith('0') || inspectedWorld === 'www') {
          logger?.debug('Updating inspected world from portal/landing ID', {
            inspectedWorld,
            detectedWorld,
          });
          if (typeof deps.setInspectedWorldId === 'function') {
            deps.setInspectedWorldId(detectedWorld);
          }
        } else {
          logger?.debug('Ignored network entry: inspected world mismatch', {
            inspectedWorld,
            detectedWorld,
          });
          return { accepted: false, detectedWorld };
        }
      }

      if (typeof deps.setGameOrigin === 'function') {
        deps.setGameOrigin(originMatch[1]);
      }

      const storage = deps.storage;
      if (storage) {
        if (
          typeof storage.getCurrentWorld === 'function' &&
          storage.getCurrentWorld() !== detectedWorld
        ) {
          if (typeof storage.setWorld === 'function') {
            storage.setWorld(detectedWorld);
          }
          if (typeof storage.getWorldSettings === 'function') {
            Promise.resolve(storage.getWorldSettings(detectedWorld)).then(
              (worldSettings) => {
                if (
                  worldSettings?.showOptions &&
                  typeof deps.setOptions === 'function'
                ) {
                  deps.setOptions('showOptions', worldSettings.showOptions);
                  if (typeof deps.applyCardVisibility === 'function') {
                    deps.applyCardVisibility();
                  }
                }
              },
            );
          }
        }
        if (typeof storage.registerKnownWorld === 'function') {
          storage.registerKnownWorld(detectedWorld);
        }
      }

      return { accepted: true, detectedWorld, origin: originMatch[1] };
    }
  }

  return { accepted: true };
}

module.exports = {
  detectAndSyncWorldOrigin,
};
module.exports.default = module.exports;
