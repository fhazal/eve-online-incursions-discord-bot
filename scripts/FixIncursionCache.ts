import fs from "fs";
import path from "path";

const CACHE_PATH = path.join(__dirname, "../incursions_cache.json");

interface FixedIncursionInfo {
  regionIconUrl?: string;
  constellationName: string;
  constellationId: number;
  headquarterSystem: string;
  headquarterSystemId: number | null;
  headquarterSystemSecurity?: number;
  stagingSystem: string;
  assaultSystems: string[];
  vanguardSystems: string[];
  influence: number;
  state: string;
  numberOfJumpsFromLastIncursion: number | null;
  lastIncursionSystemName: string;
  isIslandConstellation: boolean | null;
  allianceId: number | null;
  allianceName: string | null;
  allianceTicker: string | null;
  allianceLogoUrl: string | null;
}

interface FixedEntry {
  createdAt: number;
  updatedAt: number;
  messageId: string;
  incursionInfo: FixedIncursionInfo;
}

interface FixedCache {
  noIncursionMessageId: string | null;
  lastIncursion: FixedEntry;
  currentIncursions: FixedEntry[];
}

function parseJumps(value: any): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseBoolean(value: any): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "yes") return true;
    if (lower === "no") return false;
  }
  return null;
}

function fixEntry(entry: any): FixedEntry {
  const info = entry.incursionInfo;

  const fixed: FixedIncursionInfo = {
    regionIconUrl: info.regionIconUrl ?? "",
    constellationName: info.constellationName,
    constellationId: info.constellationId,
    headquarterSystem: info.headquarterSystem,
    headquarterSystemId: info.headquarterSystemId ?? null,
    headquarterSystemSecurity: info.headquarterSystemSecurity,
    stagingSystem: info.stagingSystem,
    assaultSystems: Array.isArray(info.assaultSystems) ? info.assaultSystems : [],
    vanguardSystems: Array.isArray(info.vanguardSystems) ? info.vanguardSystems : [],
    influence: typeof info.influence === "number" ? info.influence : 0,
    state: info.state,
    numberOfJumpsFromLastIncursion: parseJumps(info.numberOfJumpsFromLastIncursion),
    lastIncursionSystemName: info.lastIncursionSystemName ?? "N/A",
    isIslandConstellation: parseBoolean(info.isIslandConstellation),
    allianceId: info.allianceId ?? null,
    allianceName: info.allianceName ?? null,
    allianceTicker: info.allianceTicker ?? null,
    allianceLogoUrl: info.allianceLogoUrl ?? null,
  };

  return {
    createdAt: entry.createdAt ?? Date.now(),
    updatedAt: entry.updatedAt ?? Date.now(),
    messageId: entry.messageId ?? "",
    incursionInfo: fixed,
  };
}

function main() {
  const raw = fs.readFileSync(CACHE_PATH, "utf8");
  const original = JSON.parse(raw);

  const fixed: FixedCache = {
    noIncursionMessageId: original.noIncursionMessageId ?? null,
    lastIncursion: fixEntry(original.lastIncursion),
    currentIncursions: Array.isArray(original.currentIncursions)
      ? original.currentIncursions.map(fixEntry)
      : [],
  };

  fs.writeFileSync(CACHE_PATH, JSON.stringify(fixed, null, 2));
  console.log("✅ incursions_cache.json cleaned and fixed.");
}

main();
