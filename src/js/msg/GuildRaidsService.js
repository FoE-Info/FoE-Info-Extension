/**
 * GuildRaidsService.js
 *
 * Dedicated domain service for Forge of Empires Quantum Incursions (QI).
 * Handles GuildRaidsService.getMemberActivityOverview and RankingService.searchRanking (category: guild_raids),
 * tracking guild member progress diffs, action points spent, and championship rankings.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GuildRaidsService');
} catch {}

const { quantumState } = require('../state/QuantumState.js');

class GuildRaidsService {
  constructor() {
    this.memberActivity = [];
    this.leaderboard = [];
    this.lastSaved = null;
  }

  getMemberActivity() {
    return this.memberActivity;
  }

  getLeaderboard() {
    return this.leaderboard;
  }

  getLastSaved() {
    return this.lastSaved;
  }

  /**
   * Filter members to only those with active changes since last saved snapshot.
   * @param {Array} members
   * @returns {Array} members with non-zero progressDiff or actionPointsDiff
   */
  filterChangesOnly(members) {
    if (!Array.isArray(members)) return [];
    return members.filter(
      (m) =>
        (m.progressDiff && m.progressDiff > 0) ||
        (m.actionPointsDiff && m.actionPointsDiff > 0),
    );
  }

  /**
   * Handles GuildRaidsService.getMemberActivityOverview RPC payload.
   * Compares incoming progress and action points against the stored world snapshot.
   * @param {Object} msg JSON-RPC envelope
   * @param {Object} [storageAdapter] Storage interface with get/set methods
   */
  handleMemberActivityOverview(msg, storageAdapter) {
    const rawRows =
      Array.isArray(msg?.responseData?.rows) ? msg.responseData.rows
      : Array.isArray(msg?.responseData) ? msg.responseData
      : [];

    let savedList = [];
    if (storageAdapter && typeof storageAdapter.get === 'function') {
      savedList = storageAdapter.get('qiPerformance') || [];
    } else {
      try {
        const storage = require('../fn/storage.js');
        const defaultState = require('../vars/state.js');
        const key = (defaultState?.GameOrigin || 'default') + '_qiPerformance';
        savedList = storage.get(key) || [];
      } catch {}
    }

    const savedMap = new Map();
    if (Array.isArray(savedList)) {
      for (const item of savedList) {
        if (item?.name) savedMap.set(item.name, item);
        else if (item?.playerId) savedMap.set(String(item.playerId), item);
      }
    }

    const currentMembers = [];
    for (const row of rawRows) {
      const player = row?.player || {};
      const name = player.name || 'Unknown';
      const playerId = player.player_id ?? player.id ?? 0;
      const avatar = player.avatar || '';
      const era = player.era || '';
      const progressContribution = Number(row?.progressContribution) || 0;
      const actionPoints = Number(row?.actionPoints) || 0;

      const saved = savedMap.get(name) || savedMap.get(String(playerId));
      const savedProgress = Number(saved?.progressContribution) || 0;
      const savedAP = Number(saved?.actionPoints) || 0;

      const progressDiff =
        saved ? Math.max(0, progressContribution - savedProgress) : 0;
      const actionPointsDiff = saved ? Math.max(0, actionPoints - savedAP) : 0;

      currentMembers.push({
        playerId,
        name,
        avatar,
        era,
        progressContribution,
        actionPoints,
        progressDiff,
        actionPointsDiff,
      });
    }

    this.memberActivity = currentMembers;
    const now = Date.now();
    this.lastSaved = now;

    // Snapshot current performance into storage for future diffs
    const snapshot = currentMembers.map((m) => ({
      playerId: m.playerId,
      name: m.name,
      progressContribution: m.progressContribution,
      actionPoints: m.actionPoints,
    }));

    if (storageAdapter && typeof storageAdapter.set === 'function') {
      storageAdapter.set('qiPerformance', snapshot);
      storageAdapter.set('qiTime', now);
    } else {
      try {
        const storage = require('../fn/storage.js');
        const defaultState = require('../vars/state.js');
        const key = (defaultState?.GameOrigin || 'default') + '_qiPerformance';
        const timeKey = (defaultState?.GameOrigin || 'default') + '_qiTime';
        storage.set(key, snapshot);
        storage.set(timeKey, now);
      } catch {}
    }

    logger?.debug('Processed QI member activity overview', {
      count: currentMembers.length,
      hasChanges: currentMembers.some(
        (m) => m.progressDiff > 0 || m.actionPointsDiff > 0,
      ),
    });

    quantumState.setMemberActivity(currentMembers, now);

    return {
      success: true,
      totalMembers: currentMembers.length,
      members: currentMembers,
    };
  }

  /**
   * Handles RankingService.searchRanking for category 'guild_raids'.
   * @param {Object} msg JSON-RPC envelope
   */
  handleSearchRanking(msg) {
    const isQiRanking =
      msg?.requestData?.[0]?.value === 'guild_raids' ||
      msg?.requestData?.[0]?.category === 'guild_raids' ||
      msg?.responseData?.rankings?.[0]?.__class__ ===
        'GuildRaidsClanGlobalRanking';

    if (!isQiRanking) {
      return { ignored: true };
    }

    const rawRankings =
      Array.isArray(msg?.responseData?.rankings) ?
        msg.responseData.rankings
      : [];

    const rankings = rawRankings.map((r) => ({
      rank: Number(r.rank) || 0,
      clanId: r.clan?.id || 0,
      clanName: r.clan?.name || '',
      membersNum: Number(r.clan?.membersNum) || 0,
      points: Number(r.points) || 0,
      championshipsWon: Number(r.championshipsWon) || 0,
    }));

    this.leaderboard = rankings;

    logger?.debug('Processed QI championship rankings', {
      count: rankings.length,
      topClan: rankings[0]?.clanName,
    });

    quantumState.setLeaderboard(rankings);

    return {
      success: true,
      rankings,
    };
  }
}

const guildRaidsService = new GuildRaidsService();

module.exports = {
  GuildRaidsService,
  guildRaidsService,
};
module.exports.default = module.exports;
