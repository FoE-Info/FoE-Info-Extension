/**
 * TreasuryService.js
 *
 * Decoupled domain service for Forge of Empires Guild Treasury.
 * Handles ClanService.getTreasuryLogs and ResourceService.getTreasuryBag RPC payloads,
 * tracking guild treasury reserves, member donations, and expenditures with BigNumber precision.
 */

const BigNumber = require('bignumber.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');
const { treasuryState } = require('../state/TreasuryState.js');

let showOptions = { showTreasury: true };

// Bound accumulated pagination so a full treasury history (tens of thousands
// of entries) cannot exhaust memory in the DevTools panel.
const MAX_TREASURY_LOGS = 2000;

if (typeof __webpack_require__ !== 'undefined') {
  try {
    const showOptMod = require('../vars/showOptions.js');
    if (showOptMod?.showOptions) showOptions = showOptMod.showOptions;
  } catch {}
}

class TreasuryLogEntry {
  constructor(raw = {}) {
    this.action = raw.action || '';
    this.resource = raw.resource || '';
    this.amount = new BigNumber(raw.amount || 0);
    this.playerId = raw.player?.player_id ?? raw.player?.id ?? 0;
    this.playerName = raw.player?.name || '';
    this.avatar = raw.player?.avatar || '';
    this.date = raw.createdAt || raw.date || raw.time || 0;
    this.raw = raw;
  }

  isDonation() {
    const act = this.action.toLowerCase();
    return act.includes('donation') || act.includes('building production');
  }

  isExpenditure() {
    const act = this.action.toLowerCase();
    return (
      act.includes('spent') ||
      act.includes('unlocked') ||
      act.includes('deployment') ||
      act.includes('place building')
    );
  }
}

class TreasuryService {
  constructor() {
    this.reserves = new Map();
    this.logs = [];
    this.logsByIndex = new Map();
    this.totalLogCount = 0;
    this.totalMedalsDonated = new BigNumber(0);
    this.totalMedalsSpent = new BigNumber(0);
    this.totalGoodsDonated = new BigNumber(0);
    this.playerDonations = new Map();
    this.lastUpdated = null;

    this.getTreasuryLogs = this.getTreasuryLogs.bind(this);
    this.getTreasuryBag = this.getTreasuryBag.bind(this);
    this.getTreasury = this.getTreasury.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('ClanService', 'getTreasury', this.getTreasury);
      dispatcher.register(
        'ClanService',
        'getTreasuryLogs',
        this.getTreasuryLogs,
      );
      dispatcher.register('ClanService', 'getTreasuryBag', this.getTreasuryBag);
      dispatcher.register(
        'ResourceService',
        'getTreasuryBag',
        this.getTreasuryBag,
      );
    }
    return this;
  }

  getTreasury(msg) {
    const data = msg?.responseData || {};
    const resources = data.resources || data;

    if (resources && typeof resources === 'object') {
      for (const [key, val] of Object.entries(resources)) {
        this.reserves.set(key, new BigNumber(val || 0));
      }
      this.lastUpdated = Date.now();
      treasuryState.setReserves(this.reserves);
    }

    return {
      success: true,
      totalReserves: this.reserves.size,
      reserves: this.reserves,
    };
  }

  getTreasuryBag(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];

    for (const item of rawList) {
      if (!item) continue;
      const bagType =
        typeof item.type === 'object' ? item.type?.value : item.type;
      if (
        !bagType ||
        bagType === 'ClanMain' ||
        String(bagType).toLowerCase().includes('clan') ||
        String(bagType).toLowerCase().includes('treasury')
      ) {
        const resources = item.resources?.resources || item.resources || {};
        for (const [key, val] of Object.entries(resources)) {
          this.reserves.set(key, new BigNumber(val || 0));
        }
      }
    }
    this.lastUpdated = Date.now();
    treasuryState.setReserves(this.reserves);

    return {
      success: true,
      totalReserves: this.reserves.size,
      reserves: this.reserves,
    };
  }

  getTreasuryLogs(msg) {
    const rawLogs =
      Array.isArray(msg?.responseData?.logs) ? msg.responseData.logs
      : Array.isArray(msg?.responseData) ? msg.responseData
      : [];

    // Real ClanService.getTreasuryLogs requestData is [clanId, offset, bagType].
    const offset =
      Array.isArray(msg?.requestData) && msg.requestData.length > 1 ?
        Number(msg.requestData[1]) || 0
      : Number(msg?.offset) || 0;

    // A fresh offset-0 request starts a new scan; later offsets append.
    if (offset === 0) this.logsByIndex.clear();

    rawLogs.forEach((raw, index) => {
      this.logsByIndex.set(offset + index, new TreasuryLogEntry(raw));
    });

    this.logs = [...this.logsByIndex.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, MAX_TREASURY_LOGS)
      .map(([, entry]) => entry);

    this.totalLogCount = Number(msg?.responseData?.count) || this.logs.length;

    this.recomputeTotals();
    this.lastUpdated = Date.now();
    treasuryState.setLogs(
      this.logs,
      {
        totalGoodsDonated: this.totalGoodsDonated,
        totalMedalsDonated: this.totalMedalsDonated,
        totalMedalsSpent: this.totalMedalsSpent,
        totalLogCount: this.totalLogCount,
      },
      { showTreasury: showOptions?.showTreasury !== false },
    );

    return {
      success: true,
      totalLogs: this.logs.length,
      totalLogCount: this.totalLogCount,
      totalMedalsDonated: this.totalMedalsDonated,
      totalMedalsSpent: this.totalMedalsSpent,
      totalGoodsDonated: this.totalGoodsDonated,
    };
  }

  recomputeTotals() {
    this.totalMedalsDonated = new BigNumber(0);
    this.totalMedalsSpent = new BigNumber(0);
    this.totalGoodsDonated = new BigNumber(0);
    this.playerDonations.clear();

    for (const entry of this.logs) {
      const isMedals = entry.resource === 'medals';
      const pName = entry.playerName || 'Unknown';

      if (!this.playerDonations.has(pName)) {
        this.playerDonations.set(pName, {
          medalsDonated: new BigNumber(0),
          medalsSpent: new BigNumber(0),
          goodsDonated: new BigNumber(0),
          goodsSpent: new BigNumber(0),
        });
      }
      const playerStat = this.playerDonations.get(pName);

      if (isMedals) {
        if (entry.isDonation()) {
          this.totalMedalsDonated = this.totalMedalsDonated.plus(entry.amount);
          playerStat.medalsDonated = playerStat.medalsDonated.plus(
            entry.amount,
          );
        } else {
          this.totalMedalsSpent = this.totalMedalsSpent.plus(entry.amount);
          playerStat.medalsSpent = playerStat.medalsSpent.plus(entry.amount);
        }
      } else {
        if (entry.isDonation()) {
          this.totalGoodsDonated = this.totalGoodsDonated.plus(entry.amount);
          playerStat.goodsDonated = playerStat.goodsDonated.plus(entry.amount);
        } else {
          playerStat.goodsSpent = playerStat.goodsSpent.plus(entry.amount);
        }
      }
    }
  }

  getReserve(resourceId) {
    return this.reserves.get(resourceId) || new BigNumber(0);
  }

  getTreasuryReserves() {
    return this.reserves;
  }

  getLogs() {
    return this.logs;
  }

  getTotalLogCount() {
    return this.totalLogCount;
  }

  getTotalMedalsDonated() {
    return this.totalMedalsDonated;
  }

  getTotalMedalsSpent() {
    return this.totalMedalsSpent;
  }

  getTotalGoodsDonated() {
    return this.totalGoodsDonated;
  }

  getDonationsByPlayer(playerName) {
    return (
      this.playerDonations.get(playerName) || {
        medalsDonated: new BigNumber(0),
        medalsSpent: new BigNumber(0),
        goodsDonated: new BigNumber(0),
        goodsSpent: new BigNumber(0),
      }
    );
  }
}

const treasuryService = new TreasuryService();

module.exports = {
  TreasuryService,
  TreasuryLogEntry,
  treasuryService,
  getTreasuryLogs: treasuryService.getTreasuryLogs,
  getTreasuryBag: treasuryService.getTreasuryBag,
};
module.exports.default = treasuryService;
