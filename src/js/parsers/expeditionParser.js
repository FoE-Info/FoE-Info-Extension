/**
 * expeditionParser.js
 *
 * Pure parsers for Guild Expedition payloads. Extracted from
 * ui/expeditionTables.js so the service layer no longer reaches into the UI
 * layer for parsing.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('ExpeditionParser');
} catch {}

function extractTrialLevel(entry) {
  if (!entry || typeof entry !== 'object') return 1;
  const val =
    entry.currentTrial ??
    entry.trial ??
    entry.trialLevel ??
    entry.state?.currentTrial ??
    entry.state?.trial ??
    1;
  const num = Number(val);
  return Number.isNaN(num) || num <= 0 ? 1 : num;
}

function extractInternationalExpeditionEntries(data) {
  if (!data) return [];
  const payload = data.responseData || data;

  if (payload.ranking && payload.participants) {
    const rankMap = new Map();
    const rankingArr = Array.isArray(payload.ranking) ? payload.ranking : [];
    for (const r of rankingArr) {
      const id = r?.participantId ?? r?.guildId ?? r?.id;
      if (id !== undefined) rankMap.set(String(id), r);
    }

    const participants =
      Array.isArray(payload.participants) ? payload.participants : [];
    const entries = participants
      .map((p, idx) => {
        const id = p.id ?? p.guildId ?? p.participantId;
        const info = rankMap.get(String(id)) || {};
        return {
          rank: info.rank ?? p.rank ?? idx + 1,
          name: p.name || info.name || 'Unknown',
          server:
            p.worldName || p.worldId || info.worldName || info.worldId || '',
          points: info.points ?? p.points ?? info.progress ?? p.progress ?? 0,
        };
      })
      .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
    logger?.debug('Parsed international expedition entries', {
      count: entries.length,
    });
    return entries;
  }

  const list =
    Array.isArray(payload) ? payload
    : Array.isArray(payload.participants) ? payload.participants
    : Array.isArray(payload.ranking) ? payload.ranking
    : [];

  const entries = list
    .map((item, idx) => ({
      rank: item.rank ?? idx + 1,
      name: item.name || item.guildName || 'Unknown',
      server: item.worldName || item.server || item.worldId || '',
      points: item.points ?? item.progress ?? 0,
    }))
    .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
  logger?.debug('Parsed international expedition entries', {
    count: entries.length,
  });
  return entries;
}

module.exports = {
  extractTrialLevel,
  extractInternationalExpeditionEntries,
};
module.exports.default = module.exports;
