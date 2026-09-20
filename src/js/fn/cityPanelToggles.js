/**
 * cityPanelToggles.js
 *
 * Collapse toggles for city, social, and economic panels.
 * Extracted from src/js/fn/collapse.js.
 */

import { createToggle } from '../ui/collapseToggleRunner.js';
import { createLogger } from '../utils/logger.js';
import {
  collapseBonus,
  collapseBuildings,
  collapseClipboard,
  collapseCultural,
  collapseFriends,
  collapseGalaxy,
  collapseGoods,
  collapseGuild,
  collapseHood,
  collapseIncidents,
  collapseLists,
  collapseStats,
  setCollapse,
} from './collapseState.js';

const logger = createLogger('CityPanelToggles');
logger.debug('CityPanelToggles initialized');

export const fCollapseFriends = createToggle({
  get: () => collapseFriends,
  set: (v) => setCollapse('collapseFriends', v),
  copyEls: [{ id: 'friendsCopyID', display: 'inline-block' }],
  icons: [{ iconId: 'friendsicon', targetId: 'friendsText' }],
});

export const fCollapseLists = createToggle({
  get: () => collapseLists,
  set: (v) => setCollapse('collapseLists', v),
  icons: [{ iconId: 'listsicon', targetId: 'listsText' }],
});

export const fCollapseHood = createToggle({
  get: () => collapseHood,
  set: (v) => setCollapse('collapseHood', v),
  copyEls: [{ id: 'hoodCopyID', display: 'inline-block' }],
  icons: [{ iconId: 'hoodicon', targetId: 'hoodText' }],
});

export const fCollapseGalaxy = createToggle({
  get: () => collapseGalaxy,
  set: (v) => setCollapse('collapseGalaxy', v),
  icons: [{ iconId: 'galaxyicon', targetId: 'galaxyText' }],
});

export const fCollapseGuild = createToggle({
  get: () => collapseGuild,
  set: (v) => setCollapse('collapseGuild', v),
  copyEls: [{ id: 'guildCopyID', display: 'inline-block' }],
  icons: [
    { iconId: 'guildicon', targetId: 'guildText' },
    { iconId: 'guildOverviewIcon', targetId: 'guildOverviewText' },
  ],
});

export const fCollapseIncidents = createToggle({
  get: () => collapseIncidents,
  set: (v) => setCollapse('collapseIncidents', v),
  hideTooltips: true,
  icons: [{ iconId: 'incidentsicon', targetId: 'incidentsText' }],
});

export const fCollapseGoods = createToggle({
  get: () => collapseGoods,
  set: (v) => setCollapse('collapseGoods', v),
  copyEls: ['goodsCopyID'],
  icons: [{ iconId: 'goodsicon', targetId: 'goodsText' }],
});

export const fCollapseStats = createToggle({
  get: () => collapseStats,
  set: (v) => setCollapse('collapseStats', v),
  hideTooltips: true,
  copyEls: ['citystatsCopyID'],
  icons: [{ iconId: 'citystatsicon', targetId: 'citystatsText' }],
});

export const fCollapseBuildings = createToggle({
  get: () => collapseBuildings,
  set: (v) => setCollapse('collapseBuildings', v),
  icons: [{ iconId: 'buildingsicon', targetId: 'buildingsText' }],
});

export const fCollapseBonus = createToggle({
  get: () => collapseBonus,
  set: (v) => setCollapse('collapseBonus', v),
  icons: [{ iconId: 'bonusicon', targetId: 'bonusText' }],
});

export const fCollapseCultural = createToggle({
  get: () => collapseCultural,
  set: (v) => setCollapse('collapseCultural', v),
  icons: [{ iconId: 'culturalicon', targetId: 'culturalText' }],
});

export const fCollapseClipboard = createToggle({
  get: () => collapseClipboard,
  set: (v) => setCollapse('collapseClipboard', v),
  key: 'collapseClipboard',
  persist: true,
  copyEls: ['clipboardCopyID'],
  icons: [{ iconId: 'clipboardicon', targetId: 'clipboardText' }],
});
