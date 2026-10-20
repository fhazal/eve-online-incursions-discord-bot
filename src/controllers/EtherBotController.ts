/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CommandInteraction, TextChannel } from "discord.js";
import { EmbedBuilder }                     from "@discordjs/builders";

import ESIService             from "../services/ESIService";
import IncursionLayoutService from "../services/IncursionLayoutService";
import RegionIconService      from "../services/RegionIconService";
import IncursionInfoService   from "../services/IncursionInfoService";
import IncursionsCacheService from "../services/IncursionsCacheService";

import IncursionsCacheEntry   from "../models/bot/IncursionsCacheEntry";
import EmbedMessageMapper     from "../mappers/EmbedMessageMapper";

/* ────────────────────────────────────────────────
 *  Null-sec region allow-list (CCP region-IDs)
 * ──────────────────────────────────────────────── */
const ALLOWED_NULLSEC_REGION_IDS = new Set<number>([
  10000063, // Etherium Reach
  10000014, // Great Wildlands
  10000082, // Insmother
  10000059, // Malpais
  10000070, // Perrigen Falls
  10000002, // The Forge
  10000054, // The Kalevala Expanse
  10000065, // The Spire
  10000055  // Oasa
]);

class BotController {
  /* ───────── DI ───────── */
  private readonly highSecChannel : TextChannel;
  private readonly nullSecChannel : TextChannel;

  private readonly mapper   = new EmbedMessageMapper();
  private readonly esi      = new ESIService();
  private readonly layouts  = new IncursionLayoutService();
  private readonly icons    = new RegionIconService();
  private readonly cache    = new IncursionsCacheService();
  private readonly infoSvc  = new IncursionInfoService(this.esi, this.icons, this.layouts);

  private incursionLoopId? : NodeJS.Timeout;

  constructor(highSec: TextChannel, nullSec: TextChannel) {
    this.highSecChannel = highSec;
    this.nullSecChannel = nullSec;
    this.startIncursionLoop(1_000);
  }

  /* ───────── helpers ───────── */
  private isLowSecOrUnknown(sec: number | null | undefined): boolean {
    return sec == null || (sec < 0.5 && sec > 0.0);
  }

  /** Debug-aware allow-list filter for null-sec incursions */
  private isAllowedNullSec(entry: IncursionsCacheEntry): boolean {
    const sec     = entry.incursionInfo.headquarterSystemSecurity ?? 1;
    const region  = entry.incursionInfo.regionId;
    const hq      = entry.incursionInfo.headquarterSystem;

    if (sec > 0) return false;                        // sanity-check: not null-sec

    const allowed = ALLOWED_NULLSEC_REGION_IDS.has(region);

    /* ────── DEBUG LOG ────── */
    console.log(
      `[NS-SCAN] ${allowed ? "✅ KEEP" : "⛔ SKIP"}  ` +
      `HQ "${hq}"  |  regionId=${region}`
    );

    return allowed;
  }

  /* ───────── scheduler ───────── */
  private startIncursionLoop(delayMs: number) {
    this.incursionLoopId = setTimeout(async () => {
      let next = 10_000;
      try {
        await this.loopIncursions();
        next = this.infoSvc.getEsiIncursionCacheExpireDate().getTime() - Date.now();
        console.log(`⏱️  Next refresh in ${(next / 1_000).toFixed(0)} s`);
      } catch (err) {
        console.error("Loop error – retrying in 10 s:", err);
      }
      this.startIncursionLoop(Math.max(1_000, next));
    }, delayMs);
  }

  /* ───────── main loop ───────── */
  private async loopIncursions() {
    const incursions = await this.fetchIncursions();
    if (!incursions) return;

    const active = incursions.filter(e => {
      if (this.isLowSecOrUnknown(e.incursionInfo.headquarterSystemSecurity)) return false;
      if ((e.incursionInfo.headquarterSystemSecurity ?? 1) >= 0.5) return true; // high-sec
      return this.isAllowedNullSec(e);                                          // null-sec
    });

    const tasks: Promise<unknown>[] = [];

    if (active.length) {
      this.cache.clearNoIncursionMessageId();
      this.mergeWithCache(active);

      for (const [idx, entry] of active.entries()) {
        const embed   = await this.mapper.incursionInfoToEmbedMessage(entry);
        const channel = entry.incursionInfo.headquarterSystemSecurity! <= 0
          ? this.nullSecChannel
          : this.highSecChannel;

        tasks.push(
          channel.messages
            .fetch(entry.messageId)
            .then(m => m.edit({ embeds: [embed] }))
            .catch(() =>
              channel
                .send({
                  content: `@everyone New spawn in ${entry.incursionInfo.constellationName}!`,
                  embeds : [embed],
                })
                .then(m => { active[idx].messageId = m.id; })
            )
        );
      }
    } else {
      const embed = this.mapper.noIncursionToEmbedMessage(
        this.cache.findLastIncursion(false)
      );

      const id = this.cache.findNoIncursionMessageId();
      tasks.push(
        id
          ? this.highSecChannel.messages
              .fetch(id)
              .then(m => m.edit({ embeds: [embed] }))
              .catch(() =>
                this.highSecChannel
                  .send({ embeds: [embed] })
                  .then(m => this.cache.saveNoIncursionMessageId(m.id))
              )
          : this.highSecChannel
              .send({ embeds: [embed] })
              .then(m => this.cache.saveNoIncursionMessageId(m.id))
      );
    }

    await Promise.all(tasks);
    this.cache.checkAndRotateCurrentIncursions(active);
  }

  /* ───────── /incursions command ───────── */
  async commandIncursions(interaction: CommandInteraction) {
    const loading = new EmbedBuilder().setDescription("Retrieving incursions …").data;
    await interaction.reply({ embeds: [loading] });

    const incursions =
      (await this.fetchIncursions())?.filter(e => {
        if (this.isLowSecOrUnknown(e.incursionInfo.headquarterSystemSecurity)) return false;
        if ((e.incursionInfo.headquarterSystemSecurity ?? 1) >= 0.5) return true;
        return this.isAllowedNullSec(e);
      }) ?? [];

    this.mergeWithCache(incursions);

    for (const entry of incursions) {
      const embed = await this.mapper.incursionInfoToEmbedMessage(entry);
      await interaction.channel?.send({ embeds: [embed] });
    }

    if (!incursions.length) {
      const embed = this.mapper.noIncursionToEmbedMessage(
        this.cache.findLastIncursion(false)
      );
      await interaction.channel?.send({ embeds: [embed] });
    }

    this.cache.checkAndRotateCurrentIncursions(incursions);
    await interaction.deleteReply();
  }

  /* ───────── util helpers ───────── */
  private mergeWithCache(list: IncursionsCacheEntry[]) {
    for (const [i, entry] of list.entries()) {
      const cached = this.cache.findCurrentIncursionByConstellationId(
        entry.incursionInfo.constellationId
      );
      if (cached) {
        list[i].createdAt = cached.createdAt;
        list[i].messageId = cached.messageId;
      }
    }
  }

  private async fetchIncursions(): Promise<IncursionsCacheEntry[] | null> {
    const infos = await this.infoSvc.findAllIncursionsInfo(null);
    if (!infos) return null;

    return infos.map(info => {
      const isNull = (info.headquarterSystemSecurity ?? 0) <= 0.0;
      const last   = this.cache.findLastIncursion(isNull);

      return {
        createdAt : Date.now(),
        updatedAt : Date.now(),
        messageId : "",
        incursionInfo: {
          headquarterSystem        : info.headquarterSystem,
          headquarterSystemId      : info.headquarterSystemId,
          headquarterSystemSecurity: info.headquarterSystemSecurity ?? null,
          stagingSystem            : info.stagingSystem,

          constellationId   : info.constellationId,
          constellationName : info.constellationName,
          regionId          : info.regionId,
          regionIconUrl     : info.regionIconUrl ?? null,

          assaultSystems : info.assaultSystems,
          vanguardSystems: info.vanguardSystems,

          influence: info.influence,
          state    : info.state,

          isIslandConstellation      : info.isIslandConstellation,
          numberOfJumpsFromLastIncursion: info.numberOfJumpsFromLastIncursion,
          lastIncursionSystemName       : info.lastIncursionSystemName,

          allianceId     : info.allianceId,
          allianceName   : info.allianceName,
          allianceTicker : info.allianceTicker,
          allianceLogoUrl: info.allianceLogoUrl,
        },
        lastHeadquarterSystem: last?.incursionInfo.headquarterSystem,
      } as IncursionsCacheEntry;
    });
  }
}

export default BotController;
