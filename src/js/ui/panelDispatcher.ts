/**
 * panelDispatcher.ts
 *
 * Container clearing dispatch routines and Guild Treasury card rendering.
 * Decoupled from monolithic src/js/index.js.
 *
 * Strongly-typed TypeScript source mirroring panelDispatcher.js (the CommonJS
 * runtime). Zero DOM library dependencies — vanilla DOM APIs only
 * (getElementById, querySelector, addEventListener, replaceChildren).
 */

import { createLogger } from '../utils/logger.js';
import { showOptions as liveShowOptions } from '../vars/showOptions.js';
import { setCurrentView } from './cardVisibility.js';

const logger = createLogger('PanelDispatcher');

/** Minimal structural type for a clearable panel container element. */
export interface ClearableElement {
  innerHTML: string;
  className?: string;
  replaceChildren?: () => void;
}

/** Named panel containers passed to every clear routine. */
export interface PanelContainers {
  [key: string]: ClearableElement | null | undefined;
  cityinvested?: ClearableElement | null;
  output?: ClearableElement | null;
  overview?: ClearableElement | null;
  alerts?: ClearableElement | null;
  cityrewards?: ClearableElement | null;
  donationDIV?: ClearableElement | null;
  incidents?: ClearableElement | null;
  donation2DIV?: ClearableElement | null;
  donationDIV2?: ClearableElement | null;
  greatbuilding?: ClearableElement | null;
  gbInfoDIV?: ClearableElement | null;
  targets?: ClearableElement | null;
  guild?: ClearableElement | null;
  debug?: ClearableElement | null;
  info?: ClearableElement | null;
  citystats?: ClearableElement | null;
  visitstats?: ClearableElement | null;
  cultural?: ClearableElement | null;
  friendsDiv?: ClearableElement | null;
  armyDIV?: ClearableElement | null;
  treasury?: ClearableElement | null;
  treasuryLog?: ClearableElement | null;
}

/** Mutable game state reset by clearStartup. */
export interface ResettableState {
  reset?: () => void;
  GuildDonations?: unknown[];
  GuildTreasury?: unknown[];
  GuildsGoods?: unknown[];
  Bonus?: {
    aid?: number;
    spoils?: number;
    diplomatic?: number;
    strike?: number;
  } | null;
  clearRewardsState?: () => void;
}

/** BigNumber-compatible amount holder. */
export interface NumericAmount {
  toNumber?: () => number;
}

/** Treasury resource collection: Map or plain record of amounts. */
export type TreasuryResources =
  | Map<string, NumericAmount | number | string>
  | Record<string, NumericAmount | number | string>
  | null
  | undefined;

/** Resource definition used for era-grouped treasury rows. */
export interface ResourceDef {
  id: string;
  era: string;
  name?: string;
}

/** Helper API surface consumed by the treasury renderer. */
export interface TreasuryHelper {
  numAges?: number;
  fLevelfromAge?: (era: string) => number;
  fGVGagesname?: (era: string) => string;
  escapeHTML?: (value: string) => string;
  fResourceShortName?: (id: string) => string | null;
}

/** AddElement builder API surface. */
export interface AddElementApi {
  close?: () => string;
  icon?: (iconId: string, targetId: string, collapsed: boolean) => string;
  copy?: (
    copyId: string,
    kind: string,
    side: string,
    collapsed: boolean,
  ) => string;
}

/** Collapse toggle API surface. */
export interface CollapseApi {
  collapseTreasury?: boolean;
  fCollapseTreasury?: () => void;
}

/** Clipboard API surface. */
export interface CopyApi {
  TreasuryCopy?: (event: Event) => void;
}

/** Injected dependencies for renderTreasuryPanel (all optional in tests). */
export interface RenderTreasuryDeps {
  containers?: PanelContainers;
  showOptions?: { showTreasury?: boolean } | null;
  document?: Document | null;
  treasury?: (ClearableElement & Element) | null;
  element?: AddElementApi | null;
  collapse?: CollapseApi | null;
  toolOptions?: { treasurySize?: number } | null;
  helper?: TreasuryHelper | null;
  ResourceDefs?: ResourceDef[] | null;
  copy?: CopyApi | null;
  ResizeObserver?: typeof ResizeObserver | null;
  setTreasurySize?: (height: number) => void;
  translateContainer?: (el: Element) => void;
  initTreasury?: (resources: TreasuryResources) => void;
  bindResizableCollapse?: (options: {
    element: Element;
    initialSize: number;
    minSize: number;
    onResize: (height: number) => void;
    ResizeObserverClass: typeof ResizeObserver | null;
  }) => void;
}

let defaultElement: AddElementApi | null = null;
let defaultCollapse: CollapseApi | null = null;
let defaultCopy: CopyApi | null = null;
let defaultHelper: TreasuryHelper | null = null;
let defaultSetTreasurySize: ((height: number) => void) | null = null;
let defaultResourceDefs: ResourceDef[] | null = null;
let defaultTranslateContainer: ((el: Element) => void) | null = null;

try {
  defaultElement = require('../fn/AddElement.js') as AddElementApi;
} catch {
  defaultElement = null;
}
try {
  defaultCollapse = require('../fn/collapse.js') as CollapseApi;
} catch {
  defaultCollapse = null;
}
try {
  defaultCopy = require('../fn/copy.js') as CopyApi;
} catch {
  defaultCopy = null;
}
try {
  defaultHelper = require('../fn/helper.js') as TreasuryHelper;
} catch {
  defaultHelper = null;
}
try {
  const globalsModule = require('../fn/globals.js') as {
    setTreasurySize?: (height: number) => void;
  };
  defaultSetTreasurySize = globalsModule.setTreasurySize ?? null;
} catch {
  defaultSetTreasurySize = null;
}
try {
  const resModule = require('../msg/ResourceService.js') as {
    ResourceDefs?: ResourceDef[];
  };
  defaultResourceDefs = resModule.ResourceDefs ?? null;
} catch {
  defaultResourceDefs = null;
}
try {
  const i18nModule = require('../fn/i18n.js') as {
    translateContainer?: (el: Element) => void;
  };
  defaultTranslateContainer = i18nModule.translateContainer ?? null;
} catch {
  defaultTranslateContainer = null;
}
let defaultBindResizableCollapse: NonNullable<
  RenderTreasuryDeps['bindResizableCollapse']
> | null = null;
try {
  const panelResizeModule = require('./panelResize.js') as {
    bindResizableCollapse?: NonNullable<
      RenderTreasuryDeps['bindResizableCollapse']
    >;
  };
  defaultBindResizableCollapse =
    panelResizeModule.bindResizableCollapse ?? null;
} catch {
  defaultBindResizableCollapse = null;
}

let renderSequence = 0;

export function clearElement(
  el: ClearableElement | null | undefined,
  resetClass = false,
): void {
  if (!el) return;
  if (typeof el.replaceChildren === 'function') {
    el.replaceChildren();
  }
  el.innerHTML = '';
  if (resetClass) {
    el.className = '';
  }
}

export function clearVisitPlayer(containers: PanelContainers = {}): void {
  const seq = ++renderSequence;
  logger.debug('UI clear & re-render triggered: VisitPlayer', {
    seq,
    timestamp: Date.now(),
  });
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.donationDIV);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

export function clearExpedition(containers: PanelContainers = {}): void {
  logger.debug('UI clear & re-render triggered: Expedition');
  clearElement(containers.cityinvested);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

export function clearForBattleground(containers: PanelContainers = {}): void {
  setCurrentView('GBG');
  clearExpedition(containers);
}

export function clearForMainCity(containers: PanelContainers = {}): void {
  setCurrentView('CITY');
  const seq = ++renderSequence;
  logger.debug('UI clear & re-render triggered: MainCity', {
    seq,
    timestamp: Date.now(),
  });
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.targets);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.donationDIV);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

export function clearStartup(
  containers: PanelContainers = {},
  resetState: ResettableState = {},
): void {
  setCurrentView('CITY');
  const seq = ++renderSequence;
  logger.debug('UI clear & re-render triggered: Startup', {
    seq,
    timestamp: Date.now(),
  });
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.cityrewards);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.citystats);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.armyDIV);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);

  if (typeof resetState.reset === 'function') {
    resetState.reset();
  }
  if (Array.isArray(resetState.GuildDonations)) {
    resetState.GuildDonations.length = 0;
  }
  if (Array.isArray(resetState.GuildTreasury)) {
    resetState.GuildTreasury.length = 0;
  }
  if (Array.isArray(resetState.GuildsGoods)) {
    resetState.GuildsGoods.length = 0;
  }
  if (resetState.Bonus && typeof resetState.Bonus === 'object') {
    resetState.Bonus.aid = 0;
    resetState.Bonus.spoils = 0;
    resetState.Bonus.diplomatic = 0;
    resetState.Bonus.strike = 0;
  }
  if (typeof resetState.clearRewardsState === 'function') {
    resetState.clearRewardsState();
  }
}

export function clearCultural(containers: PanelContainers = {}): void {
  logger.debug('UI clear & re-render triggered: Cultural');
  clearElement(containers.cityinvested);
  clearElement(containers.overview);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.armyDIV);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

export function clearForTreasury(containers: PanelContainers = {}): void {
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
}

export function getResourceAmount(res: TreasuryResources, id: string): number {
  if (!res) return 0;
  const val =
    res instanceof Map ?
      res.get(id)
    : (res as Record<string, NumericAmount | number | string>)[id];
  if (val == null) return 0;
  if (typeof val === 'object' && typeof val.toNumber === 'function') {
    return val.toNumber();
  }
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

export function renderTreasuryPanel(
  resources: TreasuryResources,
  deps: RenderTreasuryDeps & { containers?: PanelContainers } & Record<
      string,
      unknown
    > = {},
): void {
  if (!resources) return;
  const containers =
    (deps.containers as PanelContainers) || (deps as PanelContainers);
  if (containers && typeof containers === 'object') {
    clearForTreasury(containers);
  }

  const showOpts =
    (deps.showOptions as RenderTreasuryDeps['showOptions']) ||
    (liveShowOptions as unknown as { showTreasury?: boolean });
  if (showOpts && showOpts.showTreasury === false) return;

  const doc: Document | null =
    (deps.document as Document | null) ||
    (typeof document !== 'undefined' ? document : null);
  const treasuryContainer = ((deps.treasury as Element | null) ||
    containers.treasury ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasury')
    : null)) as (ClearableElement & Element) | null;
  if (!treasuryContainer) return;

  if (treasuryContainer.classList?.contains('d-none')) {
    treasuryContainer.classList.remove('d-none');
  }
  if ((treasuryContainer as Element & { style?: CSSStyleDeclaration }).style) {
    (
      treasuryContainer as Element & { style: CSSStyleDeclaration }
    ).style.display = '';
  }

  let elem = (deps.element as AddElementApi | null) || defaultElement;
  if (!elem) {
    try {
      elem = require('../fn/AddElement.js') as AddElementApi;
    } catch {
      elem = null;
    }
  }
  elem = elem || {};

  let col = (deps.collapse as CollapseApi | null) || defaultCollapse;
  if (!col) {
    try {
      col = require('../fn/collapse.js') as CollapseApi;
    } catch {
      col = null;
    }
  }
  col = col || {};

  let toolOpts = (deps.toolOptions as { treasurySize?: number } | null) || null;
  if (!toolOpts) {
    try {
      const globalsModule = require('../fn/globals.js') as {
        toolOptions?: { treasurySize?: number };
      };
      toolOpts = globalsModule.toolOptions ?? null;
    } catch {
      toolOpts = null;
    }
  }
  toolOpts = toolOpts || {};

  let help = (deps.helper as TreasuryHelper | null) || defaultHelper;
  if (!help) {
    try {
      help = require('../fn/helper.js') as TreasuryHelper;
    } catch {
      help = null;
    }
  }
  help = help || {};

  let rssDefs =
    (deps.ResourceDefs as ResourceDef[] | null) || defaultResourceDefs;
  if (!rssDefs || rssDefs.length === 0) {
    try {
      const resModule = require('../msg/ResourceService.js') as {
        ResourceDefs?: ResourceDef[];
      };
      rssDefs = resModule.ResourceDefs ?? null;
    } catch {
      rssDefs = null;
    }
  }
  if (!rssDefs || rssDefs.length === 0) {
    try {
      const stateModule = require('../state/state.js') as {
        ResourceDefs?: ResourceDef[];
      };
      rssDefs = stateModule.ResourceDefs ?? null;
    } catch {
      rssDefs = null;
    }
  }
  rssDefs = rssDefs || [];

  let cpy = (deps.copy as CopyApi | null) || defaultCopy;
  if (!cpy) {
    try {
      cpy = require('../fn/copy.js') as CopyApi;
    } catch {
      cpy = null;
    }
  }
  cpy = cpy || {};

  const ResizeObs =
    (deps.ResizeObserver as typeof ResizeObserver | null) ||
    (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);
  let setTreasuryHeight =
    (deps.setTreasurySize as ((height: number) => void) | null) ||
    defaultSetTreasurySize;
  if (!setTreasuryHeight) {
    try {
      const globalsModule = require('../fn/globals.js') as {
        setTreasurySize?: (height: number) => void;
      };
      setTreasuryHeight = globalsModule.setTreasurySize ?? null;
    } catch {
      setTreasuryHeight = null;
    }
  }
  setTreasuryHeight = setTreasuryHeight || (() => {});

  let translate =
    (deps.translateContainer as ((el: Element) => void) | null) ||
    defaultTranslateContainer;
  if (!translate) {
    try {
      translate = require('../fn/i18n.js').translateContainer as (
        el: Element,
      ) => void;
    } catch {
      translate = null;
    }
  }
  translate = translate || (() => {});

  const closeHtml =
    typeof elem.close === 'function' ?
      elem.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const isCollapsed = Boolean(col.collapseTreasury);
  const iconHtml =
    typeof elem.icon === 'function' ?
      elem.icon('treasuryicon', 'treasuryText', isCollapsed)
    : '';
  const copyHtml =
    typeof elem.copy === 'function' ?
      elem.copy('treasuryCopyID', 'success', 'right', isCollapsed)
    : '';
  const rawTreasuryHeight = toolOpts.treasurySize;
  const treasuryHeight =
    typeof rawTreasuryHeight === 'number' && rawTreasuryHeight >= 80 ?
      rawTreasuryHeight
    : 200;

  let treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
	${closeHtml}<p id="treasuryTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#treasuryText" aria-expanded="${!isCollapsed}" aria-controls="treasuryText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  treasuryHTML += iconHtml;
  treasuryHTML += `<strong><span data-i18n="treasury">Guild Treasury:</span></strong></p>`;
  treasuryHTML += copyHtml;
  treasuryHTML += `<div id="treasuryText" style="height: ${treasuryHeight}px" class="overflow-y resize collapse ${
    isCollapsed ? '' : 'show'
  }"><table id="treasurytable" class="goods-table w-100"><thead><tr><th class="text-start"><span data-i18n="type">Type</span></th><th class="text-end"><span data-i18n="amount">Amount</span></th></tr></thead><tbody>`;

  if (typeof deps.initTreasury === 'function') {
    (deps.initTreasury as (res: TreasuryResources) => void)(resources);
  }

  const numAges = help.numAges ?? 0;
  const matchedIds = new Set<string>(['medals']);
  for (let i = 0; i < numAges; i++) {
    let eraTreasuryText = '';
    let currentEraName = '';
    rssDefs.forEach((rssDef) => {
      const amount = getResourceAmount(resources, rssDef.id);
      if (
        typeof help?.fLevelfromAge === 'function' &&
        help.fLevelfromAge(rssDef.era) == numAges - i &&
        amount > 0
      ) {
        matchedIds.add(rssDef.id);
        if (typeof help.fGVGagesname === 'function') {
          currentEraName = help.fGVGagesname(rssDef.era);
        }
        if (!currentEraName) {
          currentEraName = rssDef.era;
        }
        const displayName = rssDef.name || rssDef.id;
        const safeName =
          typeof help.escapeHTML === 'function' ?
            help.escapeHTML(displayName)
          : displayName;
        eraTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    });
    if (eraTreasuryText) {
      treasuryHTML += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraTreasuryText}`;
    }
  }

  const medals = getResourceAmount(resources, 'medals');
  if (medals > 0) {
    treasuryHTML += `<tr><td class="text-start">Medals</td><td class="text-end">${medals.toLocaleString()}</td></tr>`;
  }

  let otherTreasuryText = '';
  const allEntries: Array<[string, unknown]> =
    resources instanceof Map ?
      Array.from(resources.entries())
    : Object.entries(resources);
  for (const [resId] of allEntries) {
    if (!matchedIds.has(resId)) {
      const amount = getResourceAmount(resources, resId);
      if (amount > 0) {
        const displayName =
          (typeof help?.fResourceShortName === 'function' ?
            help.fResourceShortName(resId)
          : null) || resId;
        const safeName =
          typeof help?.escapeHTML === 'function' ?
            help.escapeHTML(displayName)
          : displayName;
        otherTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    }
  }
  if (otherTreasuryText) {
    treasuryHTML += `<tr><td colspan="2" class="goods-era-header">Other</td></tr>${otherTreasuryText}`;
  }

  treasuryContainer.innerHTML = treasuryHTML + `</tbody></table></div></div>`;

  const queryInContainer = (selector: string): Element | null =>
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector(selector)
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById(selector.replace(/^#/, ''))
    : null);

  const copyBtn = queryInContainer('#treasuryCopyID');
  if (copyBtn && typeof cpy.TreasuryCopy === 'function') {
    copyBtn.addEventListener('click', cpy.TreasuryCopy);
  }

  const labelBtn = queryInContainer('#treasuryTextLabel');
  if (labelBtn && typeof col.fCollapseTreasury === 'function') {
    const collapseFn = col.fCollapseTreasury;
    labelBtn.addEventListener('click', (e) => {
      if (
        (e?.target as Element | null) &&
        typeof (e.target as Element).closest === 'function' &&
        (e.target as Element).closest('#treasuryicon')
      ) {
        return;
      }
      collapseFn();
    });
  }
  const iconBtn = queryInContainer('#treasuryicon');
  if (
    iconBtn &&
    iconBtn !== labelBtn &&
    typeof col.fCollapseTreasury === 'function'
  ) {
    const collapseFn = col.fCollapseTreasury;
    iconBtn.addEventListener('click', () => {
      collapseFn();
    });
  }

  const treasuryDiv = queryInContainer('#treasuryText');
  if (treasuryDiv) {
    const bindFn =
      (deps.bindResizableCollapse as RenderTreasuryDeps['bindResizableCollapse']) ||
      defaultBindResizableCollapse;
    if (bindFn) {
      bindFn({
        element: treasuryDiv,
        initialSize: treasuryHeight,
        minSize: 80,
        onResize: setTreasuryHeight,
        ResizeObserverClass: ResizeObs,
      });
    } else if (ResizeObs) {
      try {
        const resizeObserver = new ResizeObs((entries) => {
          for (const entry of entries) {
            const height = entry.contentRect?.height;
            const isCollapsing =
              treasuryDiv.classList?.contains('collapsing') ||
              (treasuryDiv.classList &&
                !treasuryDiv.classList.contains('show'));
            if (typeof height === 'number' && height >= 80 && !isCollapsing) {
              setTreasuryHeight(height);
            }
          }
        });
        resizeObserver.observe(treasuryDiv);
      } catch (err) {
        logger.debug('Failed to observe treasuryDiv resize', { err });
      }
    }
  }

  if (doc && doc.body) {
    translate(doc.body);
  } else {
    translate(treasuryContainer);
  }
}

export const panelDispatcher = {
  clearVisitPlayer,
  clearExpedition,
  clearForBattleground,
  clearForMainCity,
  clearStartup,
  clearCultural,
  renderTreasuryPanel,
};

export default panelDispatcher;
