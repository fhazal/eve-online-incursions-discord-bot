// src/services/IncursionInfoService.ts
// ─────────────────────────────────────────────────────────────
// Builds fully-enriched IncursionInfo objects, including sovereignty data
// and (optionally) re-computes jump distance vs. a supplied “last HQ”.
// ─────────────────────────────────────────────────────────────

import ESISystem                    from "../models/esi/ESISystem";
import ESIConstellation             from "../models/esi/ESIConstellation";
import ESIIncursion                 from "../models/esi/ESIIncursion";
import ESIService                   from "./ESIService";
import RegionIconService            from "./RegionIconService";
import IncursionLayoutService       from "./IncursionLayoutService";
import SovereigntyService           from "./SovereigntyService";

import IncursionConstellationLayout from "../models/bot/IncursionConstellationLayout";
import IncursionInfo                from "../models/bot/IncursionInfo";
import ESIResponse                  from "../models/esi/ESIResponse";

import { highSecOnly }              from "../config/config.json";

class IncursionInfoService {
  /* ───────── injected helpers ───────── */
  private readonly esiService:             ESIService;
  private readonly regionIconService:      RegionIconService;
  private readonly incursionLayoutService: IncursionLayoutService;

  /* ───────── local caches ───────── */
  private readonly esiSystemById:   Record<number, ESISystem>        = {};
  private readonly esiSystemByName: Record<string, ESISystem>        = {};
  private readonly esiConstById:    Record<number, ESIConstellation> = {};

  private esiIncursionCacheExpireDate: Date = new Date();

  constructor(
    esiService: ESIService,
    regionIconService: RegionIconService,
    incursionLayoutService: IncursionLayoutService
  ) {
    this.esiService             = esiService;
    this.regionIconService      = regionIconService;
    this.incursionLayoutService = incursionLayoutService;
  }

  /* ────────────────────── PUBLIC API ────────────────────── */

  /** Fetch, enrich and return every *current* incursion. */
  async findAllIncursionsInfo(
    lastIncursionInfo: IncursionInfo | null
  ): Promise<IncursionInfo[] | null> {

    const esiResponse: ESIResponse<ESIIncursion[]> | null =
      await this.esiService.getIncursionsInfo();

    if (!esiResponse) {
      // ESI down? retry in one minute
      this.esiIncursionCacheExpireDate = new Date(Date.now() + 60_000);
      return null;
    }

    const esiIncursions = esiResponse.data;
    this.esiIncursionCacheExpireDate   = new Date(esiResponse.headers.expires);

    await this.preloadBulkData(esiIncursions);

    const enriched: IncursionInfo[] = [];
    await Promise.all(
      esiIncursions.map(async raw => {
        const info = await this.buildIncursionInfo(raw, lastIncursionInfo);
        if (info) enriched.push(info);
      })
    );

    return enriched;
  }

  getEsiIncursionCacheExpireDate(): Date {
    return this.esiIncursionCacheExpireDate;
  }

  /* ────────────────────── INTERNALS ────────────────────── */

  /** Cache all constellation + system records we’ll need. */
  private async preloadBulkData(incursions: ESIIncursion[]) {
    const jobs: Promise<void>[] = [];

    for (const inc of incursions) {
      // constellation
      jobs.push(
        this.esiService.getConstellationInfo(inc.constellation_id).then(res => {
          if (res) this.esiConstById[res.data.constellation_id] = res.data;
        })
      );

      // staging system
      jobs.push(
        this.esiService.getSystemInfo(inc.staging_solar_system_id).then(res => {
          if (res) {
            this.esiSystemById[res.data.system_id] = res.data;
            this.esiSystemByName[res.data.name]    = res.data;
          }
        })
      );

      // all infested systems (HQ / assault / vanguard)
      for (const sysId of inc.infested_solar_systems) {
        jobs.push(
          this.esiService.getSystemInfo(sysId).then(res => {
            if (res) {
              this.esiSystemById[res.data.system_id] = res.data;
              this.esiSystemByName[res.data.name]    = res.data;
            }
          })
        );
      }
    }

    await Promise.all(jobs);
  }

  /** Build a single, fully-hydrated IncursionInfo from raw ESI data. */
  private async buildIncursionInfo(
    inc: ESIIncursion,
    lastIncursion: IncursionInfo | null
  ): Promise<IncursionInfo | null> {
    const constellation = this.esiConstById[inc.constellation_id];
    const stagingSys    = this.esiSystemById[inc.staging_solar_system_id];
    if (!constellation || !stagingSys) return null;

    // Honour high-sec-only mode
    if (highSecOnly && stagingSys.security_status < 0.45) return null;

    const regionIconUrl =
      this.regionIconService.findRegionIconUrl(constellation.region_id) ?? "";

    /* ── Layout enrichment ── */
    let stagingSystem         = stagingSys.name;
    let headquarterSystem     = stagingSys.name;
    let headquarterSystemId   = stagingSys.system_id;
    let headquarterSec        = stagingSys.security_status;
    let vanguardSystems       = ["N/A"];
    let assaultSystems        = ["N/A"];
    let isIslandConstellation: "Yes" | "No" | "N/A" = "N/A";

    const layout: IncursionConstellationLayout | null =
      this.incursionLayoutService.findIncursionLayout(constellation.name);

    if (layout) {
      stagingSystem         = layout.staging_system;
      headquarterSystem     = layout.headquarter_system;
      headquarterSystemId   = this.esiSystemByName[headquarterSystem]?.system_id ?? null;
      headquarterSec        = this.esiSystemByName[headquarterSystem]?.security_status ?? null;
      vanguardSystems       = layout.vanguard_systems;
      assaultSystems        = layout.assault_systems;
      isIslandConstellation = layout.is_island_constellation ? "Yes" : "No";
    }

    /* ── Distance from *tentative* previous HQ ── */
    let lastIncursionSystemName = "N/A";
    let numberOfJumpsFromLastIncursion = -1;

    if (lastIncursion?.headquarterSystemId && headquarterSystemId) {
      const routeRes = await this.esiService.getRouteInfo(
        lastIncursion.headquarterSystemId,
        headquarterSystemId
      );
      if (routeRes) {
        numberOfJumpsFromLastIncursion = routeRes.data.length - 1;
        lastIncursionSystemName        = lastIncursion.headquarterSystem;
      }
    }

    /* ── Sovereignty (null-sec only) ── */
    const sov = await SovereigntyService.getSovForSystem(headquarterSystemId);

    /* ── Assemble ── */
    return {
      /* ➜ IDs & names */
      constellationName: constellation.name,
      constellationId:   constellation.constellation_id,
      regionId:          constellation.region_id,   // ★ new
      regionIconUrl,

      /* ➜ HQ info */
      headquarterSystem,
      headquarterSystemId,
      headquarterSystemSecurity: headquarterSec,

      /* ➜ layout */
      stagingSystem,
      vanguardSystems,
      assaultSystems,

      /* ➜ state */
      influence: 1 - inc.influence,
      state:     inc.state,

      /* ➜ distance / route */
      numberOfJumpsFromLastIncursion,
      lastIncursionSystemName,

      /* ➜ meta */
      isIslandConstellation,

      /* ➜ sovereignty */
      allianceId:     sov?.allianceId     ?? null,
      allianceName:   sov?.allianceName   ?? null,
      allianceTicker: sov?.allianceTicker ?? null,
      allianceLogoUrl:sov?.logoUrl        ?? null,
    };
  }

  /* ────────────────────────────────────────────────────────
   * EXTRA: re-evaluate distance vs. a supplied “last HQ”
   * (high-sec or null-sec) without touching other fields.
   * ──────────────────────────────────────────────────────── */
  async buildIncursionInfoFromBase(
    info: IncursionInfo,
    lastIncursion: IncursionInfo | null
  ): Promise<IncursionInfo> {

    let jumps    = -1;
    let lastName = "N/A";

    if (
      lastIncursion?.headquarterSystemId &&
      info.headquarterSystemId &&
      lastIncursion.headquarterSystemId !== info.headquarterSystemId
    ) {
      try {
        const res = await this.esiService.getRouteInfo(
          lastIncursion.headquarterSystemId,
          info.headquarterSystemId
        );
        if (res) {
          jumps    = res.data.length - 1;
          lastName = lastIncursion.headquarterSystem;
        }
      } catch {
        /* keep defaults on ESI failure */
      }
    }

    return {
      ...info,
      numberOfJumpsFromLastIncursion: jumps,
      lastIncursionSystemName:        lastName,
    };
  }
}

export default IncursionInfoService;
