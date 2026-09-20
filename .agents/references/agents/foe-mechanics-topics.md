# FoE Mechanics Topic Profiles

Use these profiles with `foe-economy-analyst` or `foe-combat-analyst`. Load only the references selected by the dispatch.

## Economy topics

| Topic               | Reference                                                            | Verification / stop condition                                                                           |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `great-buildings`   | [Great Buildings engineering](../foe/great-buildings-engineering.md) | Recompute rounding boundaries with BigNumber; stop on disagreement with captured construction payloads. |
| `sniping`           | [Sniping](../foe/sniping.md)                                         | Verify lock and owner-safe-add formulas against fixtures; never round a funded lock down.               |
| `settlements`       | [Cultural settlements](../foe/cultural-settlements.md)               | Treat event IDs and costs as dynamic; stop when the current payload shape is unknown.                   |
| `historical-allies` | [Historical Allies](../foe/historical-allies.md)                     | Verify room, rarity, compatibility, and boost IDs from metadata or RPC data.                            |

## Combat topics

| Topic           | Reference                                                                    | Verification / stop condition                                                                                                                |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `combat-boosts` | [Combat boosts](../foe/combat-boosts.md)                                     | Preserve attack/defense and attacking/defending army dimensions; stop on unknown boost categories.                                           |
| `gbg`           | [Guild Battlegrounds engineering](../foe/guild-battlegrounds-engineering.md) | Keep state, building, signal, and timer services routed independently; do not collapse unlike RPC methods into one handler.                  |
| `ge`            | [Guild Expedition](../foe/guild-expedition.md)                               | Verify trial level, negotiation, relic, and fortification semantics from observed payloads.                                                  |
| `qi`            | [Quantum Incursions](../foe/quantum-incursions.md)                           | Preserve the distinction among GuildRaids state, map, contribution, production, and node-target methods; never map QI solely from UI labels. |
| `pvp`           | [PvP](../foe/pvp.md)                                                         | Separate arena attempts, neighborhood battles, and plundering; stop when matchmaking inputs are not observable.                              |

All profiles are observation-only. User guides define terminology, but live payloads, metadata, source, and tests decide implementation truth.
