// src/models/bot/IncursionsCache.ts
// -------------------------------------------------------------
// Expanded “last-HQ” tracking:
//   • lastHighSecIncursion  – most-recent high-sec HQ
//   • lastNullSecIncursion  – most-recent null-sec HQ
// -------------------------------------------------------------

import IncursionsCacheEntry from "./IncursionsCacheEntry";

/**
 * Shape of the JSON cache saved on disk.
 *
 * We keep:
 *   • the message ID of the “no incursions” banner (if any)
 *   • the most-recent high-sec HQ                  (distance calc)
 *   • the most-recent null-sec HQ                 (distance calc)
 *   • the list of currently active incursions
 */
interface IncursionsCache {
  /** Discord message ID of the last “no incursions” banner, if still present */
  noIncursionMessageId: string | null;

  /** Last despawned HIGH-SEC incursion (for jump / route comparisons) */
  lastHighSecIncursion: IncursionsCacheEntry | null;

  /** Last despawned NULL-SEC incursion (for jump / route comparisons) */
  lastNullSecIncursion: IncursionsCacheEntry | null;

  /** Entries for every *currently active* incursion */
  currentIncursions: IncursionsCacheEntry[];
}

export default IncursionsCache;
