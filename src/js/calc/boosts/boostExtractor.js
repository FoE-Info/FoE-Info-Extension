/**
 * boostExtractor.js
 *
 * Extracts military and economic boost entries from entities and metadata.
 */

function extractEntityBoosts(
  entity,
  meta,
  rawBoosts,
  qiBoosts,
  prodBoosts,
  targetEra,
  tallySingleBoost,
  adjCount = 0,
) {
  const boostEntries = [];

  if (Array.isArray(entity?.abilities)) {
    for (const ab of entity.abilities) {
      if (ab.boost) boostEntries.push(ab.boost);
      if (Array.isArray(ab.bonuses)) {
        for (const b of ab.bonuses) {
          if (b.type && b.value != null) boostEntries.push(b);
        }
      }
    }
  }

  if (Array.isArray(meta?.abilities)) {
    for (const ab of meta.abilities) {
      if (Array.isArray(ab.boostHints)) {
        for (const bh of ab.boostHints) {
          const hintMap = bh.boostHintEraMap;
          if (hintMap) {
            const hint = hintMap[targetEra] || hintMap.AllAge;
            if (hint && hint.type && hint.value != null) {
              boostEntries.push(hint);
            }
          }
        }
      }
      if (
        (ab.__class__ === 'BonusOnSetAdjacencyAbility' || ab.setId) &&
        Array.isArray(ab.bonuses) &&
        adjCount > 0
      ) {
        for (let i = 0; i < Math.min(adjCount, ab.bonuses.length); i++) {
          const bonus = ab.bonuses[i];
          const hint = bonus?.boost?.[targetEra] || bonus?.boost?.AllAge;
          if (hint && hint.type && hint.value != null) boostEntries.push(hint);
        }
      }
      if (ab.__class__ === 'ChainLinkAbility' && Array.isArray(ab.bonuses)) {
        for (const bonus of ab.bonuses) {
          const hint = bonus?.boost?.[targetEra] || bonus?.boost?.AllAge;
          if (hint && hint.type && hint.value != null) boostEntries.push(hint);
        }
      }
    }
  }

  const eraComp = meta?.components?.[targetEra] || meta?.components?.AllAge;
  if (Array.isArray(eraComp?.boosts?.boosts)) {
    boostEntries.push(...eraComp.boosts.boosts);
  }
  if (
    eraComp !== meta?.components?.AllAge &&
    Array.isArray(meta?.components?.AllAge?.boosts?.boosts)
  ) {
    boostEntries.push(...meta.components.AllAge.boosts.boosts);
  }

  if (Array.isArray(eraComp?.set_bonuses) && adjCount > 0) {
    for (let i = 0; i < Math.min(adjCount, eraComp.set_bonuses.length); i++) {
      const sb = eraComp.set_bonuses[i];
      if (Array.isArray(sb?.boosts?.boosts))
        boostEntries.push(...sb.boosts.boosts);
    }
  }
  if (
    eraComp !== meta?.components?.AllAge &&
    Array.isArray(meta?.components?.AllAge?.set_bonuses) &&
    adjCount > 0
  ) {
    for (
      let i = 0;
      i < Math.min(adjCount, meta.components.AllAge.set_bonuses.length);
      i++
    ) {
      const sb = meta.components.AllAge.set_bonuses[i];
      if (Array.isArray(sb?.boosts?.boosts))
        boostEntries.push(...sb.boosts.boosts);
    }
  }

  if (meta?.entity_levels && entity?.level != null) {
    const lvl = meta.entity_levels[entity.level];
    if (Array.isArray(lvl?.bonuses)) {
      boostEntries.push(...lvl.bonuses);
    }
  }

  for (const b of boostEntries) {
    tallySingleBoost(b, rawBoosts, qiBoosts, prodBoosts);
  }
}

module.exports = {
  extractEntityBoosts,
};
module.exports.default = extractEntityBoosts;
