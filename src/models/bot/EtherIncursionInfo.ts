/**
 * Represents a fully-enriched incursion entry used by the bot layer.
 *
 * • All numeric values from ESI are preserved as numbers.
 * • Use -1 for unknown numeric values.
 * • All string fields use "N/A" when data is unavailable.
 */

export default interface IncursionInfo {
  /* ─────────────── Core positional info ─────────────── */
  constellationName: string;
  constellationId:   number;

  headquarterSystem:         string;
  headquarterSystemId:       number | null;
  headquarterSystemSecurity: number | null;  // ≥ 0.5 = high-sec, ≤ 0 = null-sec

  /* ─────────────── Site layout details ─────────────── */
  assaultSystems:  string[];
  vanguardSystems: string[];
  stagingSystem:   string;

  /* ─────────────── Dynamic state ─────────────── */
  influence: number;   // 0 – 1  (0 = cleared, 1 = fresh)
  state:     string;   // "mobilizing" | "withdrawing" | …

  /** Jumps from previous HQ → this HQ. -1 when unknown. */
  numberOfJumpsFromLastIncursion: number;
  lastIncursionSystemName:        string;

  /* ─────────────── Region & constellation metadata ─────────────── */
  regionId:      number;          // ← NEW
  regionIconUrl: string;          // may be the empty string
  isIslandConstellation: "Yes" | "No" | "N/A";

  /* ─────────────── Sovereignty (null-sec only) ─────────────── */
  allianceId:     number | null;
  allianceName:   string | null;
  allianceTicker: string | null;
  allianceLogoUrl:string | null;
}
