import fetch from "node-fetch";

const ESI_BASE = "https://esi.evetech.net/latest";

interface DockUpInfo {
  name: string;
  systemName: string;
  stationId: number;
  systemId: number;
  factionId?: number;
}

/**
 * Returns the best dock-up station.
 * Priority:
 * 1. HQ system (even if no services)
 * 2. Any other system in constellation
 */
export async function getDockUpStation(
  constellationId: number,
  stagingSystemId?: number,
  hqSystemId?: number
): Promise<DockUpInfo | null> {
  try {
    const constellationRes = await fetch(`${ESI_BASE}/universe/constellations/${constellationId}/`);
    if (!constellationRes.ok) {
      console.error(`❌ Failed to fetch constellation ${constellationId}`);
      return null;
    }
    const { systems } = await constellationRes.json();

    const tryGetStationFromSystem = async (systemId: number): Promise<DockUpInfo | null> => {
      const systemRes = await fetch(`${ESI_BASE}/universe/systems/${systemId}/`);
      if (!systemRes.ok) {
        console.warn(`⚠️ Failed to fetch system ${systemId}`);
        return null;
      }
      const systemData = await systemRes.json();
      console.log(`🔎 Checking system ${systemId}: ${systemData.name}`);
      if (!systemData.stations?.length) {
        console.warn(`⚠️ No stations found in system ${systemData.name}`);
        return null;
      }

      for (const stationId of systemData.stations) {
        const stationRes = await fetch(`${ESI_BASE}/universe/stations/${stationId}/`);
        if (!stationRes.ok) {
          console.warn(`⚠️ Failed to fetch station ${stationId}`);
          continue;
        }
        const station = await stationRes.json();
        return {
          name: station.name,
          systemName: systemData.name,
          stationId,
          systemId,
          factionId: systemData.faction_id,
        };
      }
      return null;
    };

    // First try HQ system
    if (hqSystemId && systems.includes(hqSystemId)) {
      console.log(`🧪 Attempting to get dock-up from HQ system ${hqSystemId}`);
      const hqStation = await tryGetStationFromSystem(hqSystemId);
      if (hqStation) {
        console.log(`✅ Found dock-up station in HQ system ${hqSystemId}: ${hqStation.name}`);
        return hqStation;
      } else {
        console.warn(`⚠️ No valid station found in HQ system ${hqSystemId}`);
      }
    } else {
      console.warn(`⚠️ HQ system ID ${hqSystemId} is not in constellation ${constellationId}`);
    }

    // Then try other systems in constellation
    for (const systemId of systems) {
      if (systemId === hqSystemId || systemId === stagingSystemId) continue;
      const fallback = await tryGetStationFromSystem(systemId);
      if (fallback) {
        console.log(`⚠️ Fallback dock-up found in system ${systemId}: ${fallback.name}`);
        return fallback;
      }
    }

    console.warn(`❌ No stations found in constellation ${constellationId}`);
    return null;
  } catch (err) {
    console.error("❌ Error fetching dock-up station:", err);
    return null;
  }
}
