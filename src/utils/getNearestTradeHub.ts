import axios from "axios";
import { getSystemIdByName } from "./getSystemIdByName";

const tradeHubs = [
  { name: "Jita", id: 30000142 },
  { name: "Amarr", id: 30002187 },
  { name: "Dodixie", id: 30002659 },
  { name: "Rens", id: 30002510 },
  { name: "Hek", id: 30002053 },
];

export async function getNearestTradeHub(targetSystemId: number): Promise<{ name: string, jumps: number } | null> {
  try {
    let closestHub = null;
    let minJumps = Infinity;

    for (const hub of tradeHubs) {
      const res = await axios.get(`https://esi.evetech.net/latest/route/${hub.id}/${targetSystemId}/`);
      const hops = res.data.length;
      if (hops < minJumps) {
        minJumps = hops;
        closestHub = { name: hub.name, jumps: hops };
      }
    }

    return closestHub;
  } catch (err) {
    console.error("❌ Error fetching route from trade hubs:", err);
    return null;
  }
}
