// src/utils/getSovereigntyData.ts
import axios from "axios";

export interface SovInfo {
  allianceId: number;
  allianceName: string;
  allianceTicker: string;
  logoUrl: string;
}

export async function getSovereigntyData(systemId: number): Promise<SovInfo | null> {
  try {
    const { data: map } = await axios.get(
      "https://esi.evetech.net/latest/sovereignty/map/?datasource=tranquility"
    );

    const entry = map.find((row: any) => row.system_id === systemId);
    if (!entry?.alliance_id) return null;

    const allianceId = entry.alliance_id;

    const { data: allianceInfo } = await axios.get(
      `https://esi.evetech.net/latest/alliances/${allianceId}/`
    );

    return {
      allianceId,
      allianceName: allianceInfo.name,
      allianceTicker: allianceInfo.ticker,
      logoUrl: `https://images.evetech.net/alliances/${allianceId}/logo?size=64`, // ✅ lowercase & correct path
    };
  } catch (err) {
    console.error("⚠️ getSovereigntyData error:", err);
    return null;
  }
}
