/**
 * quantumRenderBinding.js
 *
 * Subscribes the Quantum Incursions cards to the reactive QuantumState.
 * Members and leaderboard repaint independently so a member update never
 * clears the leaderboard. Loaded for its side effect by the panel entry.
 */

const { quantumState } = require('../state/QuantumState.js');
const panels = require('./renderQuantumPanels.js');

function bindQuantumPanels(
  state = quantumState,
  {
    renderContributions = panels.renderQuantumContributionsCard,
    renderLeaderboard = panels.renderQuantumLeaderboardCard,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, changed) => {
    if (changed === 'members' || changed === 'all') {
      renderContributions(snapshot.members, snapshot.lastSaved);
    }
    if (changed === 'leaderboard' || changed === 'all') {
      renderLeaderboard(snapshot.leaderboard);
    }
  });
}

bindQuantumPanels();

module.exports = { bindQuantumPanels };
module.exports.default = module.exports;
