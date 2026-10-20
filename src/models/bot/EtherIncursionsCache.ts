import IncursionsCacheEntry from "./IncursionsCacheEntry";

/**
 * Represents the full incursion cache object stored on disk.
 *
 * We now track **two** “last incursion” records so high-sec and
 * null-sec jump-distance calculations are independent:
 *
 *   • `lastHighSecIncursion` – latest HQ with security ≥ 0.5  
 *   • `lastNullSecIncursion` – latest HQ with security ≤ 0.0
 *
 * Anything in 0.1-0.4 (low-sec) is ignored by the bot’s logic,
 * so we don’t store a separate record for that case.
 */
export default interface IncursionsCache {
  /** Discord message ID of the most-recent “no incursions” embed */
  noIncursionMessageId: string | null;

  /** Latest **high-sec** incursion seen (or `null` if none yet) */
  lastHighSecIncursion: IncursionsCacheEntry | null;

  /** Latest **null-sec** incursion seen (or `null` if none yet) */
  lastNullSecIncursion: IncursionsCacheEntry | null;

  /** Array of currently-active incursions (high-sec + null-sec) */
  currentIncursions: IncursionsCacheEntry[];
}
