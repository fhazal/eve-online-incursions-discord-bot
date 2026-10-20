// src/utils/getSystemIdByName.ts
import { getSystemIdCachedByName } from "./systemNameCache";

export async function getSystemIdByName(name: string): Promise<number | undefined> {
  const cached = getSystemIdCachedByName(name);
  if (!cached) {
    console.warn(`⚠️ System "${name}" not found in preloaded cache.`);
  }
  return cached;
}
