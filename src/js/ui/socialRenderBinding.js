/**
 * socialRenderBinding.js
 *
 * Subscribes the social lists panel renderer to the reactive SocialState.
 * Loaded for its side effect by renderBindings.js composition root.
 */

const { socialState } = require('../state/SocialState.js');
const { renderSocialListsPanel } = require('./renderSocialListsPanel.js');

let showOptionsPkg = null;
try {
  showOptionsPkg = require('../vars/showOptions.js');
} catch {}

let statePkg = null;
try {
  statePkg = require('../vars/state.js');
} catch {}

let globalsPkg = null;
try {
  globalsPkg = require('../fn/globals.js');
} catch {}

function bindSocialLists(
  state = socialState,
  {
    renderer = renderSocialListsPanel,
    showOptions = showOptionsPkg?.showOptions,
    CityProtections = statePkg?.CityProtections,
    toolOptions = globalsPkg?.toolOptions,
    setFriendsSize = globalsPkg?.setFriendsSize,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'lists' && channel !== 'all') return;
    const friends = snapshot.getFriends?.() || [];
    const guildMembers = snapshot.getGuildMembers?.() || [];
    const hoodlist = snapshot.getHoodlist?.() || [];
    const options = snapshot.getOptions?.() || {};
    renderer({
      friends,
      guildMembers,
      hoodlist,
      options,
      showOptions:
        typeof showOptions === 'function' ? showOptions() : showOptions,
      CityProtections,
      toolOptions,
      deps: { setFriendsSize },
    });
  });
}

bindSocialLists();

module.exports = { bindSocialLists };
module.exports.default = module.exports;
