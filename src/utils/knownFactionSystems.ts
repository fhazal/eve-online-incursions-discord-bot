// ✅ src/utils/knownFactionSystems.ts

export const TRIG_SYSTEMS = new Set([
  "Sasta", "Barira", "Jark", "Pertnineere", "Boystin"
  // Add more trig systems here
]);

export const EDENCOM_SYSTEMS = new Set([
  "Odin", "Raravoss", "Archee"
  // Add more Edencom systems here
]);

// ✅ src/utils/getRoute.ts

import axios from "axios";
import { getSystemIdByName, getSystemNameById } from "../data/sdeHelpers";

/** Try high-sec-only route first, fall back to shortest. */
export async function getRoute(
  fromSystem: string,
  toSystem: string,
  secureOnly = true
): Promise<string[]> {
  const fromId = getSystemIdByName(fromSystem);
  const toId   = getSystemIdByName(toSystem);

  const tryFlag = async (flag: "secure" | "shortest") => {
    const url = `https://esi.evetech.net/latest/route/${fromId}/${toId}/?flag=${flag}`;
    const res = await axios.get<number[]>(url).catch(() => null);
    return res?.data ?? null;
  };

  if (secureOnly) {
    const secure = await tryFlag("secure");
    if (secure && secure.length) return secure.map(getSystemNameById);
  }

  const shortest = await tryFlag("shortest");
  return shortest ? shortest.map(getSystemNameById) : [];
}

// ✅ src/utils/generateSafeRouteIntel.ts

import { getRoute } from "./getRoute";
import { TRIG_SYSTEMS, EDENCOM_SYSTEMS } from "./knownFactionSystems";
import { getCachedSystemSecurity } from "./getCachedSystemSecurity";

export interface SafeRouteIntel {
  isIsland: boolean;
  route: string[];
  trigSystems: string[];
  edencom: boolean;
}

export async function generateSafeRouteIntel(
  lastHQ: string,
  newHQ: string
): Promise<SafeRouteIntel> {
  const route = await getRoute(lastHQ, newHQ, true); // secure only
  const isIsland = route.length === 0;

  if (isIsland) {
    return { isIsland: true, route: [], trigSystems: [], edencom: false };
  }

  const midRoute = route.slice(1, -1);

  const trigSystems  = midRoute.filter(s => TRIG_SYSTEMS.has(s));
  const edencom      = midRoute.some(s => EDENCOM_SYSTEMS.has(s));

  const stillHighSec = await Promise.all(
    midRoute.map(async s => (await getCachedSystemSecurity(s))! >= 0.5)
  );

  const island = stillHighSec.includes(false);

  return {
    isIsland: island,
    route: island ? [] : midRoute,
    trigSystems,
    edencom
  };
}
