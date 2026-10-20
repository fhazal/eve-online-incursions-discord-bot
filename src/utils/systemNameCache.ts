// src/utils/systemNameCache.ts
import fetch from "node-fetch";

const systemNameToIdMap: Map<string, number> = new Map();

export async function preloadSystemNames(): Promise<void> {
  try {
    const res = await fetch("https://esi.evetech.net/latest/universe/systems/");
    if (!res.ok) {
      throw new Error(`Failed to fetch system IDs: ${res.statusText}`);
    }

    const systemIds: number[] = await res.json();

    const batchSize = 1000;
    for (let i = 0; i < systemIds.length; i += batchSize) {
      const batch = systemIds.slice(i, i + batchSize);
      const batchRes = await fetch("https://esi.evetech.net/latest/universe/names/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });

      if (!batchRes.ok) {
        console.error(`❌ Failed to fetch names for batch starting at ${i}: ${batchRes.statusText}`);
        continue;
      }

      const names: { id: number; name: string; category: string }[] = await batchRes.json();

      for (const entry of names) {
        if (entry.category === "solar_system") {
          systemNameToIdMap.set(entry.name.toLowerCase(), entry.id);
        }
      }
    }

    console.log(`✅ Loaded ${systemNameToIdMap.size} solar systems into cache`);
  } catch (error) {
    console.error("❌ Error preloading solar system names:", error);
  }
}

export function getSystemIdCachedByName(name: string): number | undefined {
  return systemNameToIdMap.get(name.trim().toLowerCase());
}
