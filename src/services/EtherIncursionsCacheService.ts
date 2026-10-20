import { readFileSync, writeFileSync } from "fs";
import IncursionsCacheEntry from "../models/bot/IncursionsCacheEntry";
import IncursionsCache      from "../models/bot/IncursionsCache";

class IncursionsCacheService {
  /* ────────────────────────────── setup ───────────────────────────── */
  private readonly incursionCacheFilePath = "incursions_cache.json";

  private incursionsCache: IncursionsCache = {
    noIncursionMessageId : null,
    lastHighSecIncursion : null,
    lastNullSecIncursion : null,
    currentIncursions    : [],
  };

  constructor() {
    try {
      const raw = readFileSync(this.incursionCacheFilePath, "utf8");
      this.incursionsCache = JSON.parse(raw);
    } catch {
      /* first run / corrupt file → start clean */
      console.warn("⚠️  Incursion cache missing or unreadable – creating fresh file.");
      this.saveCacheToFile();
    }
  }

  /* ────────────────────────── basic getters ───────────────────────── */

  findNoIncursionMessageId(): string | null {
    return this.incursionsCache.noIncursionMessageId;
  }

  /**
   * Returns the **latest high-sec** incursion by default.
   * Pass `true` to fetch the latest null-sec record instead.
   */
  findLastIncursion(isNullSec = false): IncursionsCacheEntry | null {
    return isNullSec
      ? this.incursionsCache.lastNullSecIncursion
      : this.incursionsCache.lastHighSecIncursion;
  }

  findCurrentIncursions(): IncursionsCacheEntry[] {
    return this.incursionsCache.currentIncursions;
  }

  findCurrentIncursionByConstellationId(id: number): IncursionsCacheEntry | null {
    return this.incursionsCache.currentIncursions.find(
      (e) => e.incursionInfo.constellationId === id
    ) ?? null;
  }

  /* ─────────────────── high-level rotation helper ─────────────────── */

  /**
   * Replace `currentIncursions` with the fresh set received from ESI.
   * Any constellation that disappears is treated as “ended” and becomes
   * the new ‘last incursion’ for its security class.
   */
  checkAndRotateCurrentIncursions(newSet: IncursionsCacheEntry[]) {
    const ended: IncursionsCacheEntry[] = [];

    for (const cached of this.incursionsCache.currentIncursions) {
      if (!newSet.some(n => n.incursionInfo.constellationId === cached.incursionInfo.constellationId)) {
        ended.push(cached);
      }
    }

    if (ended.length) {
      // latest ended = newest by createdAt
      ended.sort((a, b) => b.createdAt - a.createdAt);
      const latest = { ...ended[0], updatedAt: Date.now() };

      const sec = latest.incursionInfo.headquarterSystemSecurity ?? 0;
      if (sec >= 0.5) {
        this.incursionsCache.lastHighSecIncursion = latest;
      } else if (sec <= 0.0) {
        this.incursionsCache.lastNullSecIncursion = latest;
      }
    }

    /* store ‘previous HQ’ name on every fresh entry               */
    /* (needed for Edencom / Trig route scan in Embed generator)   */
    const lastHigh   = this.incursionsCache.lastHighSecIncursion?.incursionInfo.headquarterSystem;
    const lastNull   = this.incursionsCache.lastNullSecIncursion?.incursionInfo.headquarterSystem;

    const patched = newSet.map(e => {
      const sec = e.incursionInfo.headquarterSystemSecurity ?? 0;
      const prev = sec >= 0.5 ? lastHigh
                : sec <= 0.0 ? lastNull
                : undefined;
      return { ...e, lastHeadquarterSystem: prev };
    });

    this.incursionsCache.currentIncursions = patched;
    this.saveCacheToFile();
  }

  /* ─────────────────────────── misc helpers ───────────────────────── */

  constellationIsInCurrentIncursions(id: number): boolean {
    return this.incursionsCache.currentIncursions.some(
      (e) => e.incursionInfo.constellationId === id
    );
  }

  clearNoIncursionMessageId() {
    this.incursionsCache.noIncursionMessageId = null;
    this.saveCacheToFile();
  }

  saveNoIncursionMessageId(id: string) {
    this.incursionsCache.noIncursionMessageId = id;
    this.saveCacheToFile();
  }

  /* ───────────────────────── file persistence ─────────────────────── */

  private saveCacheToFile() {
    try {
      writeFileSync(
        this.incursionCacheFilePath,
        JSON.stringify(this.incursionsCache, null, 2),
        "utf8"
      );
    } catch (err) {
      console.error("❌ Failed saving incursion cache:", err);
    }
  }
}

export default IncursionsCacheService;
