/**
 * Cached record for a single incursion message
 * ─────────────────────────────────────────────
 * 1)  The fully-hydrated incursionInfo payload
 * 2)  Discord / cache bookkeeping
 * 3)  Extra context (previous HQ system for route-scan)
 */
export default interface IncursionsCacheEntry {
  /* ─────────── 1) Main payload ─────────── */
  incursionInfo: {
    headquarterSystem: string;
    headquarterSystemId: number | null;
    headquarterSystemSecurity: number | null;

    stagingSystem: string;

    constellationId: number;
    constellationName: string;

    /** Region *ID* is now required for filtering & metadata */
    regionId: number;

    /** Region icon can legitimately be missing → null */
    regionIconUrl: string | null;

    assaultSystems: string[];
    vanguardSystems: string[];

    influence: number;
    state: string;

    isIslandConstellation: "Yes" | "No" | "N/A";

    numberOfJumpsFromLastIncursion: number;
    lastIncursionSystemName: string;

    /* ---- Sovereignty (null-sec only) ---- */
    allianceId: number | null;
    allianceName: string | null;
    allianceTicker: string | null;
    allianceLogoUrl: string | null;
  };

  /* ─────────── 2) Cache / Discord ─────────── */
  createdAt: number;
  updatedAt: number;
  messageId: string;

  /* ─────────── 3) Extra context ─────────── */
  lastHeadquarterSystem?: string;
}
