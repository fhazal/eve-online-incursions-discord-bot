/**
 * Represents a fully-enriched incursion entry used by the bot layer.
 *
 * • All numbers from ESI stay numbers (use –1 for unknown).
 * • All strings use "N/A" when data is unavailable.
 */

export default interface IncursionInfo {
  /* ─────────────── Core positional info ─────────────── */
  constellationName: string;
  constellationId:   number;

  headquarterSystem:         string;
  headquarterSystemId:       number | null;
  headquarterSystemSecurity: number | null;   // ≥ 0.5 = high-sec, ≤ 0.0 = null-sec
  stagingSystem:             string;

  /* ─────────────── Site layout details ─────────────── */
  assaultSystems:  string[];
  vanguardSystems: string[];

  /* ─────────────── Dynamic state ─────────────── */
  influence: number;   // 0 – 1  (0 = cleared, 1 = fresh)
  state:     string;   // "mobilizing" | "withdrawing" | …

  /** Jumps from previous HQ → this HQ. Use –1 when unknown. */
  numberOfJumpsFromLastIncursion: number;
  lastIncursionSystemName:        string;

  /* ─────────────── Region & constellation metadata ─────────────── */
  regionId:          number;      // ← NEW (field used for Etherium Reach filter)
  regionIconUrl:     string;
  isIslandConstellation: "Yes" | "No" | "N/A";

  /* ─────────────── Sovereignty (null-sec only) ─────────────── */
  allianceId:     number | null;
  allianceName:   string | null;
  allianceTicker: string | null;
  allianceLogoUrl:string | null;
}
