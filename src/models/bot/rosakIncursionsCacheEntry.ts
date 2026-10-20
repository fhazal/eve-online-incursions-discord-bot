/**
 * Cached record for a single incursion message.
 * ───────────────────────────────────────────────
 * We store two things:
 *   1.  The rich `incursionInfo` payload (HQ, sovereignty, etc.).
 *   2.  Metadata—timestamps, Discord message ID, and the HQ system of the
 *       *previous* incursion (`lastHeadquarterSystem`) so we can compute
 *       jump routes for Edencom / Trig scanning.
 */

export default interface IncursionsCacheEntry {
  /* --------------------------------------------------------
   * 1) Main payload – includes sovereignty + jump distance
   * ------------------------------------------------------ */
  incursionInfo: {
    headquarterSystem: string;
    headquarterSystemId: number | null;
    headquarterSystemSecurity: number | null;

    stagingSystem: string;

    constellationId: number;
    constellationName: string;
    regionIconUrl: string;
    regionId: number; // ← NEW: Needed for regional filtering (e.g. Etherium Reach)

    assaultSystems: string[];
    vanguardSystems: string[];

    influence: number;
    state: string;

    /**
     * `"Yes" | "No" | "N/A"`
     * We keep it a *string* so it lines up with the IncursionInfo model
     * returned by IncursionInfoService.
     */
    isIslandConstellation: string;

    /**
     * Distance, in jumps, from the previous HQ to this one.
     * `-1` means “unknown / not computed”.
     */
    numberOfJumpsFromLastIncursion: number;
    lastIncursionSystemName: string;

    /* --------- Sovereignty (null-sec only) --------- */
    allianceId: number | null;
    allianceName: string | null;
    allianceTicker: string | null;
    allianceLogoUrl: string | null;
  };

  /* --------------------------------------------------------
   * 2) Cache / Discord bookkeeping
   * ------------------------------------------------------ */
  createdAt: number;   // first time we detected the spawn (ms)
  updatedAt: number;   // last refresh from ESI (ms)
  messageId: string;   // Discord message ID we edit

  /* --------------------------------------------------------
   * 3) Extra context
   * ------------------------------------------------------ */
  /** HQ system name from the previous incursion, if any. */
  lastHeadquarterSystem?: string;
}
