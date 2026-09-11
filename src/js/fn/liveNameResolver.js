const { metadataStore } = require('../state/MetadataStore.js');
const { onMetadataUpdated } = require('../msg/MetadataService.js');

let logger = null;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('LiveNameResolver');
} catch {}

let helper = null;
try {
  helper = require('./helper.js');
} catch {}

function resolveLiveName(id) {
  const helperName = helper?.fEntityNameTrim?.(id);
  if (helperName && helperName !== id) return helperName;
  return metadataStore?.getEntity?.(id)?.name || '';
}

function formatLiveName(id, resolvedName = '') {
  const name = resolvedName || resolveLiveName(id);
  return name && name !== id ?
      name
    : `<span class="pending-name" data-id="${id}">${id}</span>`;
}

function backfillPendingNames(container = null) {
  const root = container || (typeof document !== 'undefined' ? document : null);
  const pending = root?.querySelectorAll?.('.pending-name') || [];
  let resolved = 0;
  for (const span of pending) {
    const id = span.dataset?.id;
    const name = id ? resolveLiveName(id) : '';
    if (name && name !== id) {
      span.textContent = name;
      span.classList?.remove('pending-name');
      resolved += 1;
    }
  }
  logger?.info(
    `[NAME-BACKFILL] scan complete | pending = ${pending.length} | resolved = ${resolved} | left = ${pending.length - resolved}`,
  );
}

onMetadataUpdated(() => backfillPendingNames());
logger?.info('[NAME-BACKFILL] subscription registered');

module.exports = { resolveLiveName, formatLiveName, backfillPendingNames };
module.exports.default = module.exports;
