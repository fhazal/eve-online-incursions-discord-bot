import axios from "axios";

interface SovInfo {
  allianceId: number;
  allianceName: string;
  allianceTicker: string;
  logoUrl: string;
}

class SovereigntyService {
  private systemToAlliance: Map<number, number> | null = null;
  private allianceCache: Map<number, SovInfo> = new Map();

  /** One-shot load of /sovereignty/map */
  private async loadMap() {
    if (this.systemToAlliance) return;
    const { data } = await axios.get<{ system_id: number; alliance_id?: number }[]>(
      "https://esi.evetech.net/latest/sovereignty/map/"
    );
    this.systemToAlliance = new Map(
      data.filter((row) => row.alliance_id).map((row) => [row.system_id, row.alliance_id!])
    );
  }

  private async fetchAlliance(allianceId: number): Promise<SovInfo | null> {
    if (this.allianceCache.has(allianceId)) return this.allianceCache.get(allianceId)!;

    const { data } = await axios.get<{ name: string; ticker: string }>(
      `https://esi.evetech.net/latest/alliances/${allianceId}/`
    );
    const info: SovInfo = {
      allianceId,
      allianceName: data.name,
      allianceTicker: data.ticker,
      logoUrl: `https://images.evetech.net/Alliance/${allianceId}_128.png`,
    };
    this.allianceCache.set(allianceId, info);
    return info;
  }

  /** Public helper */
  async getSovForSystem(systemId: number | null): Promise<SovInfo | null> {
    if (!systemId) return null;
    await this.loadMap();

    const allianceId = this.systemToAlliance?.get(systemId);
    if (!allianceId) return null;

    return this.fetchAlliance(allianceId);
  }
}

export default new SovereigntyService();
