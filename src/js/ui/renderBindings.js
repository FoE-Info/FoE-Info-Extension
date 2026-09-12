/**
 * renderBindings.js
 *
 * Single composition root wiring the reactive state stores to their panel
 * renderers. Imported for its side effect by the panel entry so every binding
 * subscribes exactly once.
 */

require('./armyRenderBinding.js');
require('./bonusRenderBinding.js');
require('./quantumRenderBinding.js');
require('./startupRenderBinding.js');
require('./treasuryRenderBinding.js');
require('./gbgRenderBinding.js');

module.exports = {};
module.exports.default = module.exports;
