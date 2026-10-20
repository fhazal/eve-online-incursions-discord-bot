import axios from "axios";

export async function getRoute(fromSystem: string, toSystem: string): Promise<string[]> {
  try {
    const res = await axios.get(
      `https://esi.evetech.net/latest/route/${fromSystem}/${toSystem}/?datasource=tranquility`
    );

    const systemIds = res.data.map((entry: any) => entry.system_id);
    
    const systemNames = await Promise.all(systemIds.map(async (id: number) => {
      const systemRes = await axios.get(`https://esi.evetech.net/latest/universe/systems/${id}/`);
      return systemRes.data.name;
    }));

    return systemNames;
  } catch (err) {
    console.error("⚠️ Error fetching route:", err);
    return [];
  }
}
