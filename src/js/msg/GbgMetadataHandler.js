/**
 * GbgMetadataHandler.js
 *
 * Dedicated ingestion module for Guild Battlegrounds map and building metadata.
 * Populates VolcanoProvinceDefs, WaterfallProvinceDefs, and BuildingDefs
 * while preserving sector definitions, connections, and numeric IDs (including id: 0).
 */

function handleBattlegroundMap(
  mapObj,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
) {
  if (!mapObj || typeof mapObj !== 'object') return;
  const mapId = String(
    mapObj.id ||
      mapObj.mapId ||
      mapObj.name ||
      (mapObj.map && mapObj.map.id) ||
      '',
  ).toLowerCase();
  const rawProvinces = mapObj.provinces || (mapObj.map && mapObj.map.provinces);
  if (!rawProvinces) return;

  const target =
    mapId.includes('volcano') ? VolcanoProvinceDefs
    : mapId.includes('waterfall') ? WaterfallProvinceDefs
    : null;

  if (!target) return;

  const provinceList =
    Array.isArray(rawProvinces) ? rawProvinces : (
      Object.entries(rawProvinces).map(([k, v]) => ({
        id: v.id !== undefined ? v.id : Number(k),
        ...v,
      }))
    );

  target.length = 0;
  for (const p of provinceList) {
    if (!p || typeof p !== 'object') continue;
    const provId =
      p.id !== undefined ? p.id
      : p.provinceId !== undefined ? p.provinceId
      : null;
    const normalized = {
      ...p,
      id: provId !== null ? provId : p.id,
      name: p.name || p.title || '',
      connections:
        Array.isArray(p.connections) ? p.connections
        : Array.isArray(p.connectedProvinces) ? p.connectedProvinces
        : [],
      totalBuildingSlots:
        p.totalBuildingSlots !== undefined ? p.totalBuildingSlots
        : p.slots !== undefined ? p.slots
        : 0,
    };
    target.push(normalized);
  }
}

function handleBattlegroundBuilding(b, BuildingDefs) {
  if (!b || typeof b !== 'object') return;
  const bId =
    b.id !== undefined ? b.id
    : b.buildingId !== undefined ? b.buildingId
    : b.identifier;
  if (bId === undefined || bId === null) return;

  const normalized = {
    ...b,
    id: bId,
    buildingId: b.buildingId !== undefined ? b.buildingId : bId,
    name: b.name || b.title || b.name_key || '',
  };

  const num = Number(bId);
  if (!Number.isNaN(num) && Number.isInteger(num) && num >= 0) {
    BuildingDefs[num] = normalized;
  } else {
    BuildingDefs[bId] = normalized;
    if (!BuildingDefs.includes(normalized)) {
      BuildingDefs.push(normalized);
    }
  }
}

function ingestBattlegroundMapMetadata(
  msg,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
) {
  const data = msg.responseData || msg;
  if (Array.isArray(data)) {
    data.forEach((m) =>
      handleBattlegroundMap(m, VolcanoProvinceDefs, WaterfallProvinceDefs),
    );
  } else if (Array.isArray(data.maps)) {
    data.maps.forEach((m) =>
      handleBattlegroundMap(m, VolcanoProvinceDefs, WaterfallProvinceDefs),
    );
  } else {
    handleBattlegroundMap(data, VolcanoProvinceDefs, WaterfallProvinceDefs);
  }
}

function ingestBattlegroundBuildingMetadata(msg, BuildingDefs) {
  const payload = msg.responseData || msg;
  if (Array.isArray(payload)) {
    payload.forEach((b) => handleBattlegroundBuilding(b, BuildingDefs));
  } else if (Array.isArray(payload.buildings)) {
    payload.buildings.forEach((b) =>
      handleBattlegroundBuilding(b, BuildingDefs),
    );
  } else if (payload.buildings && typeof payload.buildings === 'object') {
    Object.entries(payload.buildings).forEach(([k, v]) => {
      if (v && typeof v === 'object') {
        handleBattlegroundBuilding(
          { id: v.id !== undefined ? v.id : k, ...v },
          BuildingDefs,
        );
      }
    });
  } else if (
    payload.id !== undefined ||
    payload.buildingId !== undefined ||
    payload.name
  ) {
    handleBattlegroundBuilding(payload, BuildingDefs);
  }
}

module.exports = {
  handleBattlegroundMap,
  handleBattlegroundBuilding,
  ingestBattlegroundMapMetadata,
  ingestBattlegroundBuildingMetadata,
};
