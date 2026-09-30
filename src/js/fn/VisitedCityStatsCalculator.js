/**
 * VisitedCityStatsCalculator.js (Legacy compatibility shim)
 *
 * Re-exports from modular src/js/calc/VisitedCityStatsCalculator.js.
 *
 * Composition point for the shared singleton. calc/ no longer builds one,
 * because doing so would require capturing `../state/MetadataStore.js` at
 * module load — the calc -> state edge this shim now owns. The store is
 * resolved lazily so a test that imports the shim before the state layer is
 * ready still gets a usable instance.
 */

const {
  VisitedCityStatsCalculator,
} = require('../calc/VisitedCityStatsCalculator.js');

let metadataStore = null;
try {
  metadataStore = require('../state/MetadataStore.js').metadataStore;
} catch {
  // State layer unavailable (headless/unit contexts). calculateVisitedCityStats
  // throws loudly if entities arrive without a store, rather than returning
  // quietly wrong totals.
}

const visitedCityStatsCalculator = new VisitedCityStatsCalculator(
  metadataStore,
);

module.exports = {
  VisitedCityStatsCalculator,
  visitedCityStatsCalculator,
  calculateVisitedCityStats:
    visitedCityStatsCalculator.calculateVisitedCityStats.bind(
      visitedCityStatsCalculator,
    ),
};
module.exports.default = visitedCityStatsCalculator;
