export default interface IncursionsCacheEntry {
  /* ─────────────────────────────────────────────
   * 1) Main payload – sovereignty + jump distance
   * ──────────────────────────────────────────── */
  incursionInfo: {
    headquarterSystem:         string;
    headquarterSystemId:       number | null;
    headquarterSystemSecurity: number | null;

    stagingSystem: string;

    constellationId:   number;
    constellationName: string;
    regionId:          number;            // ← NEW
    regionIconUrl:     string | null;     // icon is absent for some null-sec regions

    assaultSystems:  string[];
    vanguardSystems: string[];

    influence: number;
    state:     string;

    isIslandConstellation: "Yes" | "No" | "N/A";

    numberOfJumpsFromLastIncursion: number;
    lastIncursionSystemName:        string;

    /* --------- Sovereignty (null-sec only) --------- */
    allianceId:     number | null;
    allianceName:   string | null;
    allianceTicker: string | null;
    allianceLogoUrl:string | null;
  };

  /* ─────────────────────────────────────────────
   * 2) Cache / Discord bookkeeping
   * ──────────────────────────────────────────── */
  createdAt: number;        // first detection (ms)
  updatedAt: number;        // last ESI refresh (ms)
  messageId: string;        // Discord message ID

  /* ─────────────────────────────────────────────
   * 3) Extra context
   * ──────────────────────────────────────────── */
  /** HQ system from the previous incursion, if any */
  lastHeadquarterSystem?: string;
}
