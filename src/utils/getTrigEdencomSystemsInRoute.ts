// src/utils/getTrigEdencomSystemsInRoute.ts
// -----------------------------------------------------------------------------
//  ⛑  Return any EDENCOM / Triglavian systems on the route between 2 systems
// -----------------------------------------------------------------------------

import axios from "axios";
import { getSystemIdByName } from "./getSystemIdByName";
import rawEdencom from "../data/edencom_systems.json";
import rawTrig from "../data/triglavian_systems.json";

export interface RouteScanResult {
  edencom: string[];
  triglavian: string[];
}

/* ───────────────────────── Helpers ────────────────────────── */

// Normalise JSON that might be { edencom_systems: [...] } *or* plain array
function normaliseList(data: any, key: string): string[] {
  if (Array.isArray(data)) return data.map((s) => s.toLowerCase());

  const arr = Array.isArray(data?.[key]) ? data[key] : [];
  return arr.map((s: string) => s.toLowerCase());
}

const EDENCOM_SET = new Set(normaliseList(rawEdencom, "edencom_systems"));
const TRIG_SET    = new Set(normaliseList(rawTrig,    "triglavian_systems"));

/** Minimal in-memory cache for system-ID → name look-ups */
const nameCache: Record<number, string> = {};
async function idToName(id: number): Promise<string | null> {
  if (nameCache[id]) return nameCache[id];

  try {
    const { data } = await axios.get<{ name: string }>(
      `https://esi.evetech.net/latest/universe/systems/${id}/`
    );
    nameCache[id] = data.name;
    return data.name;
  } catch {
    return null;
  }
}

/* ───────────────────────── Main util ───────────────────────── */

/**
 * Scan the stargate route from `fromSystem` to `toSystem` (ESI secure flag)
 * and list any EDENCOM / Triglavian systems found along the path.
 */
export async function getTrigEdencomSystemsInRoute(
  fromSystem: string,
  toSystem: string
): Promise<RouteScanResult> {
  const fromId = await getSystemIdByName(fromSystem);
  const toId   = await getSystemIdByName(toSystem);
  if (!fromId || !toId) return { edencom: [], triglavian: [] };

  // ESI /route returns an array of system-IDs (origin & destination included)
  let routeIds: number[];
  try {
    const { data } = await axios.get<number[]>(
      `https://esi.evetech.net/latest/route/${fromId}/${toId}/?flag=secure`
    );
    routeIds = data;
  } catch {
    return { edencom: [], triglavian: [] };
  }

  const edencom: string[]   = [];
  const triglavian: string[] = [];

  for (const id of routeIds) {
    const name = await idToName(id);
    if (!name) continue;

    const key = name.toLowerCase();
    if (EDENCOM_SET.has(key))   edencom.push(name);
    if (TRIG_SET.has(key))      triglavian.push(name);
  }

  return { edencom, triglavian };
}
