// src/services/IncursionsCacheService.ts
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from "fs";

import IncursionsCacheEntry from "../models/bot/IncursionsCacheEntry";
import IncursionsCache      from "../models/bot/IncursionsCache";

const CACHE_PATH = "incursions_cache.json";

class IncursionsCacheService {
  /* ------------------------------------------------------------------ */
  /*  In-memory copy of the JSON cache                                  */
  /* ------------------------------------------------------------------ */
  private incursionsCache: IncursionsCache = {
    noIncursionMessageId : null,
    lastHighSecIncursion : null,
    lastNullSecIncursion : null,
    currentIncursions    : [],
  };

  /* ------------------------------------------------------------------ */
  /*  ctor – try to load previous cache from disk                       */
  /* ------------------------------------------------------------------ */
  constructor() {
    try {
      const raw = readFileSync(CACHE_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<IncursionsCache>;

      /* ── migrate legacy single-bucket files on the fly ──────────── */
      if ((parsed as any).lastIncursion && !parsed.lastHighSecIncursion) {
        const legacy = (parsed as any).lastIncursion as IncursionsCacheEntry;
        if ((legacy.incursionInfo.headquarterSystemSecurity ?? 0.5) >= 0.5) {
          parsed.lastHighSecIncursion = legacy;
        } else {
          parsed.lastNullSecIncursion = legacy;
        }
        delete (parsed as any).lastIncursion;
      }

      this.incursionsCache = {
        noIncursionMessageId : parsed.noIncursionMessageId ?? null,
        lastHighSecIncursion : parsed.lastHighSecIncursion ?? null,
        lastNullSecIncursion : parsed.lastNullSecIncursion ?? null,
        currentIncursions    : parsed.currentIncursions    ?? [],
      };
    } catch {
      console.warn("⚠️  No previous incursion cache found – starting fresh.");
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Simple getters                                                    */
  /* ------------------------------------------------------------------ */
  findNoIncursionMessageId(): string | null {
    return this.incursionsCache.noIncursionMessageId;
  }

  /**
   * Return the *last despawned* HQ for the requested security band.
   * @param isNull  true → null-sec   |   false → high-sec
   */
  findLastIncursion(isNull: boolean): IncursionsCacheEntry | null {
    return isNull
      ? this.incursionsCache.lastNullSecIncursion
      : this.incursionsCache.lastHighSecIncursion;
  }

  findCurrentIncursions(): IncursionsCacheEntry[] {
    return this.incursionsCache.currentIncursions;
  }

  findCurrentIncursionByConstellationId(id: number): IncursionsCacheEntry | null {
    return (
      this.incursionsCache.currentIncursions.find(
        e => e.incursionInfo.constellationId === id
      ) ?? null
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Main rotation routine – call after every ESI refresh              */
  /* ------------------------------------------------------------------ */
  checkAndRotateCurrentIncursions(newIncursions: IncursionsCacheEntry[]) {
    /* ▲ 1) detect despawns ------------------------------------------ */
    const rotatedOut: IncursionsCacheEntry[] = [];

    for (const cached of this.incursionsCache.currentIncursions) {
      if (
        !newIncursions.find(
          n => n.incursionInfo.constellationId === cached.incursionInfo.constellationId
        )
      ) {
        rotatedOut.push(cached);
      }
    }

    /* ▲ 2) store newest despawn per security band ------------------- */
    if (rotatedOut.length) {
      rotatedOut.sort((a, b) => b.createdAt - a.createdAt);       // newest first
      const latest = rotatedOut[0];
      latest.updatedAt = Date.now();

      const isNull = (latest.incursionInfo.headquarterSystemSecurity ?? 0) <= 0;
      if (isNull) {
        this.incursionsCache.lastNullSecIncursion = latest;
      } else {
        this.incursionsCache.lastHighSecIncursion = latest;
      }
    }

    /* ▲ 3) remember previous HQ name for Edencom / Trig route scan -- */
    const lastHigh = this.incursionsCache.lastHighSecIncursion?.incursionInfo.headquarterSystem;
    const lastNull = this.incursionsCache.lastNullSecIncursion?.incursionInfo.headquarterSystem;

    const patched = newIncursions.map(e => {
      const isNull = (e.incursionInfo.headquarterSystemSecurity ?? 0) <= 0;
      return {
        ...e,
        lastHeadquarterSystem: isNull ? lastNull : lastHigh,
      };
    });

    /* ▲ 4) persist new “current” list ------------------------------- */
    this.incursionsCache.currentIncursions = patched;
    this.saveCacheToDisk();
  }

  /* ------------------------------------------------------------------ */
  /*  Misc helpers                                                      */
  /* ------------------------------------------------------------------ */
  clearNoIncursionMessageId(): void {
    this.incursionsCache.noIncursionMessageId = null;
    this.saveCacheToDisk();
  }

  saveNoIncursionMessageId(id: string): void {
    this.incursionsCache.noIncursionMessageId = id;
    this.saveCacheToDisk();
  }

  /* ------------------------------------------------------------------ */
  /*  Disk I/O                                                          */
  /* ------------------------------------------------------------------ */
  private saveCacheToDisk(): void {
    try {
      writeFileSync(
        CACHE_PATH,
        JSON.stringify(this.incursionsCache, null, 2),
        "utf8"
      );
    } catch (err) {
      console.error("❌ Failed to write incursion cache:", err);
    }
  }
}

export default IncursionsCacheService;
