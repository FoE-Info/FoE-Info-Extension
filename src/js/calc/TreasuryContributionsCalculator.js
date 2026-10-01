const BigNumber = require('bignumber.js');
const zero = () => new BigNumber(0);
const MEMBER_FIELDS = [
  'medalsSpent',
  'medalsReturned',
  'medalsDonated',
  'goodsSpentGvg',
  'goodsReturnedGvg',
  'goodsSpentGbg',
  'goodsSpentGe',
  'goodsBuilding',
  'goodsManual',
];

function calculateTreasuryContributions(
  logs = [],
  reserves = new Map(),
  definitions = [],
  roster = [],
) {
  const members = new Map();
  const resources = new Map();
  const defs = new Map(definitions.map((def) => [def.id, def]));
  const eras = new Set(definitions.map((def) => def.era).filter(Boolean));
  for (const player of roster) {
    const name = player.name || player.player?.name;
    if (name)
      members.set(name, {
        ...Object.fromEntries(MEMBER_FIELDS.map((key) => [key, zero()])),
        eras: new Map(),
      });
  }
  const reserveEntries =
    reserves instanceof Map ? reserves : Object.entries(reserves || {});
  const resource = (id) => {
    if (!resources.has(id))
      resources.set(id, {
        id,
        definition: defs.get(id),
        balance: zero(),
        donations: zero(),
        ge: zero(),
        gvg: zero(),
        gbg: zero(),
        net: zero(),
      });
    return resources.get(id);
  };
  for (const [id, amount] of reserveEntries)
    resource(id).balance = new BigNumber(amount || 0);
  for (const entry of logs) {
    const name = entry.playerName || entry.player?.name || '';
    if (!name) continue;
    if (!members.has(name))
      members.set(name, {
        ...Object.fromEntries(MEMBER_FIELDS.map((key) => [key, zero()])),
        eras: new Map(),
      });
    const member = members.get(name);
    const id = entry.resource;
    const amount = new BigNumber(entry.amount || 0);
    const action = String(entry.action || '').toLowerCase();
    const returned = action === 'guild continent: grant freedom';
    const gvg =
      action === 'siege army deployment' ||
      action === 'guild continent: slot unlocked';
    const gbg = action === 'battlegrounds: place building';
    const ge = action === 'guild expedition: difficulty unlocked';
    const building =
      action === 'building production' ||
      action === 'great building production';
    const manual = action.includes('donation');
    if (id === 'medals') {
      const key =
        returned ? 'medalsReturned'
        : gvg ? 'medalsSpent'
        : manual ? 'medalsDonated'
        : null;
      if (key) {
        member[key] = member[key].plus(amount);
        const row = resource(id);
        if (manual) row.donations = row.donations.plus(amount);
        if (gvg) row.gvg = row.gvg.plus(amount);
        if (returned) row.gvg = row.gvg.minus(amount);
        row.net = row.net.plus(returned || manual ? amount : amount.negated());
      }
      continue;
    }
    const key =
      returned ? 'goodsReturnedGvg'
      : gvg ? 'goodsSpentGvg'
      : gbg ? 'goodsSpentGbg'
      : ge ? 'goodsSpentGe'
      : building ? 'goodsBuilding'
      : manual ? 'goodsManual'
      : null;
    if (!key) continue;
    member[key] = member[key].plus(amount);
    if (manual && defs.get(id)?.era) {
      const era = defs.get(id).era;
      eras.add(era);
      member.eras.set(era, (member.eras.get(era) || zero()).plus(amount));
    }
    const row = resource(id);
    if (building || manual) row.donations = row.donations.plus(amount);
    if (ge) row.ge = row.ge.plus(amount);
    if (gvg) row.gvg = row.gvg.plus(amount);
    if (returned) row.gvg = row.gvg.minus(amount);
    if (gbg) row.gbg = row.gbg.plus(amount);
    row.net = row.net.plus(
      returned || building || manual ? amount : amount.negated(),
    );
  }
  return { members, resources, eras: [...eras], memberFields: MEMBER_FIELDS };
}
module.exports = { calculateTreasuryContributions };
