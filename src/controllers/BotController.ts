// src/controllers/BotController.ts
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CommandInteraction, Message, TextChannel } from "discord.js";
import { EmbedBuilder } from "@discordjs/builders";

import ESIService             from "../services/ESIService";
import IncursionLayoutService from "../services/IncursionLayoutService";
import RegionIconService      from "../services/RegionIconService";
import IncursionInfoService   from "../services/IncursionInfoService";
import IncursionsCacheService from "../services/IncursionsCacheService";

import IncursionsCacheEntry   from "../models/bot/IncursionsCacheEntry";
import IncursionInfo          from "../models/bot/IncursionInfo";
import EmbedMessageMapper     from "../mappers/EmbedMessageMapper";

class BotController {
  /* ───────── channels & helpers ───────── */
  private readonly highSecChannel: TextChannel;
  private readonly nullSecChannel: TextChannel;

  private readonly mapper   = new EmbedMessageMapper();
  private readonly esi      = new ESIService();
  private readonly layouts  = new IncursionLayoutService();
  private readonly icons    = new RegionIconService();
  private readonly cache    = new IncursionsCacheService();
  private readonly infoSvc  = new IncursionInfoService(this.esi, this.icons, this.layouts);

  private incursionLoopId?: NodeJS.Timeout;

  constructor(highSec: TextChannel, nullSec: TextChannel) {
    this.highSecChannel = highSec;
    this.nullSecChannel = nullSec;
    this.startIncursionLoop(1_000);                  // first run in 1 s
  }

  /* ───────── small helpers ───────── */
  private isLowSecOrUnknown(sec: number | null | undefined): boolean {
    return sec == null || (sec < 0.5 && sec > 0.0);
  }

  /* ───────── scheduler ───────── */
  private startIncursionLoop(delayMs: number) {
    this.incursionLoopId = setTimeout(async () => {
      let next = 10_000;
      try {
        await this.loopIncursions();
        next =
          this.infoSvc.getEsiIncursionCacheExpireDate().getTime() - Date.now();
        console.log(`⏱️  Next refresh in ${(next / 1_000).toFixed(0)} s`);
      } catch (err) {
        console.error("Loop error – retrying in 10 s:", err);
      }
      this.startIncursionLoop(Math.max(1_000, next));
    }, delayMs);
  }

  /* ───────── MAIN LOOP ───────── */
  private async loopIncursions() {
    const incursions = await this.fetchIncursions();
    if (!incursions) return;

    const active = incursions.filter(
      (e) => !this.isLowSecOrUnknown(e.incursionInfo.headquarterSystemSecurity)
    );

    const jobs: Promise<Message | void>[] = [];

    if (active.length) {
      this.cache.clearNoIncursionMessageId();
      this.mergeWithCache(active);

      for (const [idx, entry] of active.entries()) {
        const embed   = await this.mapper.incursionInfoToEmbedMessage(entry);
        const channel =
          entry.incursionInfo.headquarterSystemSecurity! <= 0
            ? this.nullSecChannel
            : this.highSecChannel;

        jobs.push(
          channel.messages
            .fetch(entry.messageId)
            .then((m) => m.edit({ content: null, embeds: [embed] }))
            .catch(() =>
              channel
                .send({
                  content: `@everyone New spawn in ${entry.incursionInfo.constellationName}!`,
                  embeds : [embed],
                })
                .then((m) => {
                  active[idx].messageId = m.id;
                })
            )
        );
      }
    } else {
      /* show / update “no incursions” banner */
      const embed = this.mapper.noIncursionToEmbedMessage(
        this.cache.findLastIncursion(false)          // last *high-sec* HQ
      );

      const id = this.cache.findNoIncursionMessageId();
      jobs.push(
        id
          ? this.highSecChannel.messages
              .fetch(id)
              .then((m) => m.edit({ embeds: [embed] }))
              .catch(() =>
                this.highSecChannel
                  .send({ embeds: [embed] })
                  .then((m) => this.cache.saveNoIncursionMessageId(m.id))
              )
          : this.highSecChannel
              .send({ embeds: [embed] })
              .then((m) => this.cache.saveNoIncursionMessageId(m.id))
      );
    }

    await Promise.all(jobs);
    this.cache.checkAndRotateCurrentIncursions(active);
  }

  /* ───────── slash /incursions ───────── */
  async commandIncursions(interaction: CommandInteraction) {
    const loading = new EmbedBuilder().setDescription("Retrieving incursions …").data;
    await interaction.reply({ embeds: [loading] });

    const incursions =
      (await this.fetchIncursions())?.filter(
        (e) => !this.isLowSecOrUnknown(e.incursionInfo.headquarterSystemSecurity)
      ) ?? [];

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

  /* ───────── utilities ───────── */
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

  /* ───────── fetch & transform ───────── */
  private async fetchIncursions(): Promise<IncursionsCacheEntry[] | null> {
    const infos = await this.infoSvc.findAllIncursionsInfo(null);
    if (!infos) return null;

    const entries: IncursionsCacheEntry[] = [];

    for (const info of infos) {
      const isNull = (info.headquarterSystemSecurity ?? 0) <= 0;
      const last   = this.cache.findLastIncursion(isNull);

      /* ---- sanitise “last” so it matches IncursionInfo type ---- */
      let lastInfo: IncursionInfo | null = null;
      if (last) {
        lastInfo = {
          ...last.incursionInfo,
          /* ensure non-null string (type guarantee) */
          regionIconUrl: last.incursionInfo.regionIconUrl ?? "",
        };
      }

      const enriched = await this.infoSvc.buildIncursionInfoFromBase(
        info,
        lastInfo
      );

      entries.push({
        createdAt : Date.now(),
        updatedAt : Date.now(),
        messageId : "",
        incursionInfo: {
          headquarterSystem         : enriched.headquarterSystem,
          headquarterSystemId       : enriched.headquarterSystemId,
          headquarterSystemSecurity : enriched.headquarterSystemSecurity ?? null,
          stagingSystem             : enriched.stagingSystem,

          constellationId   : enriched.constellationId,
          constellationName : enriched.constellationName,
          regionId          : enriched.regionId,
          regionIconUrl     : enriched.regionIconUrl ?? null,

          assaultSystems    : enriched.assaultSystems,
          vanguardSystems   : enriched.vanguardSystems,

          influence : enriched.influence,
          state     : enriched.state,

          isIslandConstellation      : enriched.isIslandConstellation as
                                        "Yes" | "No" | "N/A",
          numberOfJumpsFromLastIncursion: enriched.numberOfJumpsFromLastIncursion,
          lastIncursionSystemName       : enriched.lastIncursionSystemName,

          allianceId     : enriched.allianceId,
          allianceName   : enriched.allianceName,
          allianceTicker : enriched.allianceTicker,
          allianceLogoUrl: enriched.allianceLogoUrl,
        },
        lastHeadquarterSystem: last?.incursionInfo.headquarterSystem,
      });
    }

    return entries;
  }
}

export default BotController;
