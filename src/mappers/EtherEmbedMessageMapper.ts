// src/mappers/EmbedMessageMapper.ts
// -------------------------------------------------------------
// • Correct alliance-logo URL sizing (“…/<id>_<size>.png”)
// • Edencom / Triglavian route info always shown; “None” if empty  ←★
// • 📦 Trade-hub line hyperlinks the jump count
// • Alliance name / ticker displayed from cache or live lookup
// -------------------------------------------------------------

import { EmbedFieldData, MessageEmbed }    from "discord.js";
import { MILIA_NAME } from "../version";

import ESIIncursionState                   from "../models/esi/ESIIncursionState";
import IncursionsCacheEntry                from "../models/bot/IncursionsCacheEntry";

import { noIncursionIconUrl }              from "../config/icon_urls.json";
import { getDockUpStation }                from "../utils/getDockUpStation";
import { getSystemIdByName }               from "../utils/getSystemIdByName";
import { getJumpsBetweenSystems }          from "../utils/getJumpsBetweenSystems";
import { getCachedSystemSecurity }         from "../utils/getCachedSystemSecurity";
import { getSovereigntyData }              from "../utils/getSovereigntyData";
import { getTrigEdencomSystemsInRoute }    from "../utils/getTrigEdencomSystemsInRoute";

const LOGO_SIZE = 64;          // 32 / 64 / 128 / 256
const TRADE_HUBS = [
  { name: "Jita",    systemId: 30000142 },
  { name: "Amarr",   systemId: 30002187 },
  { name: "Dodixie", systemId: 30002659 },
  { name: "Hek",     systemId: 30002053 },
  { name: "Rens",    systemId: 30002510 },
];

export default class EmbedMessageMapper {
  /* ───────────────────────── Static helpers ────────────────────────── */
  private static readonly COLOR = {
    green:  0x00b129,
    yellow: 0xff8000,
    red:    0xb11500,
    purple: 0x5d0085,
  } as const;

  private static pad(n: number) { return n.toString().padStart(2, "0"); }

  private static eveTime(d: Date) {
    return (
      `${d.getUTCFullYear()}-${this.pad(d.getUTCMonth() + 1)}-${this.pad(d.getUTCDate())}` +
      ` at ${this.pad(d.getUTCHours())}:${this.pad(d.getUTCMinutes())} EVE Time`
    );
  }

  /* ────────────────────────── Small helpers ────────────────────────── */
  private buildKundaliniTimer(created: Date, now: Date) {
    const spawn = new Date(created.getTime() + 70 * 3_600_000);
    const diff  = spawn.getTime() - now.getTime();
    if (diff <= 0) return "**Kundalini Manifest is active or spawning soon**";
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    return `**Kundalini Manifest in:** ${d}d ${h}h – <t:${Math.floor(spawn.getTime() / 1000)}:f>`;
  }

  private securityColor(state: string) {
    switch (state) {
      case ESIIncursionState.ESTABLISHED.toString(): return { color: EmbedMessageMapper.COLOR.green,  emoji: "🟢", label: "Combat Operations Ongoing" };
      case ESIIncursionState.MOBILIZING.toString():  return { color: EmbedMessageMapper.COLOR.yellow, emoji: "🟠", label: "Fleet Mobilizing" };
      case ESIIncursionState.WITHDRAWING.toString(): return { color: EmbedMessageMapper.COLOR.red,    emoji: "🔴", label: "Forces Withdrawing" };
      default:                                       return { color: EmbedMessageMapper.COLOR.purple, emoji: "🛰️", label: state };
    }
  }

  /* ───────────────────────── “No incursion” ────────────────────────── */
  noIncursionToEmbedMessage(last: IncursionsCacheEntry | null): MessageEmbed {
    const now = new Date();
    const spawnField: EmbedFieldData = last
      ? (() => {
          const diff = last.updatedAt + 12 * 3_600_000 - now.getTime();
          return diff > 0
            ? { name: "⏳ Next spawn window:", value: `In ${Math.round(diff / 3_600_000)} hours` }
            : { name: "🚨 Spawn window active:", value: "Monitoring systems for Sansha resurgence." };
        })()
      : { name: "⛔️ Spawn window unavailable:", value: "Awaiting last incursion telemetry data." };

    return new MessageEmbed()
      .setAuthor({ name: "📡 M.I.L.I.A. Intelligence Report", url: "https://eve-incursions.de/", iconURL: noIncursionIconUrl })
      .setTitle("🚧 No active Sansha incursions in monitored sectors")
      .setDescription("CONCORD patrols report no hostile Sansha fleets in high-security space.")
      .setColor(EmbedMessageMapper.COLOR.purple)
      .addFields([spawnField])
      .setFooter({ text: `🤖 ${MILIA_NAME} 🕐 ${EmbedMessageMapper.eveTime(now)}` });
  }

  /* ──────────────────────── Incursion embed ────────────────────────── */
  async incursionInfoToEmbedMessage(
    { incursionInfo, createdAt, lastHeadquarterSystem }: IncursionsCacheEntry
  ): Promise<MessageEmbed> {

    /* ---------- Basic header ---------- */
    const now     = new Date();
    const created = new Date(createdAt);

    const { color, emoji, label } = this.securityColor(incursionInfo.state);
    const hqName  = incursionInfo.headquarterSystem.trim();
    const secStat = incursionInfo.headquarterSystemSecurity ?? await getCachedSystemSecurity(hqName);

    const isNull = typeof secStat === "number" && secStat <= 0.0;
    const isHigh = typeof secStat === "number" && secStat >= 0.5;

    const title = isNull
      ? `🟥 Null-Sec Incursion Detected: ${hqName}`
      : isHigh
      ? `🟩 High-Sec Incursion Detected: ${hqName}`
      : `⚠️ Incursion Detected: ${hqName}`;

    /* ---------- Helpers ---------- */
    const stagingId = await getSystemIdByName(incursionInfo.stagingSystem);
    const hqId      = await getSystemIdByName(hqName);

    const dock = await getDockUpStation(incursionInfo.constellationId, stagingId, hqId);

    /* ---------- Trade-hub hops with gate-check URLs ---------- */
    type HubRoute = { name: string; jumps: number; url: string };
    let nearestHub: HubRoute = { name: "N/A", jumps: 0, url: "" };

    if (hqId) {
      const routes: HubRoute[] = await Promise.all(
        TRADE_HUBS.map(async hub => {
          const jumps = await getJumpsBetweenSystems(hub.systemId, hqId);
          const url   = `https://eve-gatecheck.space/eve/#${hub.name}:${hqName}:secure`;
          return { name: hub.name, jumps, url };
        })
      );
      nearestHub = routes.reduce((p, c) => (c.jumps < p.jumps ? c : p));
    }

    /* ---------- Embed skeleton ---------- */
    const embed = new MessageEmbed()
      .setAuthor({
        name: `${emoji} ${incursionInfo.constellationName} – ${label}`,
        url:  "https://eve-incursions.de/",
        iconURL: incursionInfo.regionIconUrl || noIncursionIconUrl,
      })
      .setTitle(title)
      .setDescription(`Initial detection: ${EmbedMessageMapper.eveTime(created)}`)
      .setColor(color);

    /* ---------- Core fields ---------- */
    const fields: EmbedFieldData[] = [
      {
        name:  "📊 Operational Summary:",
        value: [
          `**Influence:** ${Math.round(incursionInfo.influence * 100)}%`,
          `**Island constellation:** ${incursionInfo.isIslandConstellation}`,
          `**Distance from last HQ:** ${incursionInfo.numberOfJumpsFromLastIncursion}`,
        ].join("\n"),
        inline: true,
      },
      {
        name:  "🪐 Constellation Layout:",
        value: [
          `**Headquarter:** ${incursionInfo.headquarterSystem}`,
          `**Staging:** ${incursionInfo.stagingSystem}`,
          `**Vanguards:** ${incursionInfo.vanguardSystems.join(", ")}`,
          `**Assaults:** ${incursionInfo.assaultSystems.join(", ")}`,
        ].join("\n"),
        inline: true,
      },
    ];

    /* ---------- Alliance / sovereignty thumbnail ---------- */
    if (isNull) {
      let thumbURL   = incursionInfo.allianceLogoUrl ?? null;
      let haveNames  = false;

      if (incursionInfo.allianceName && incursionInfo.allianceTicker) {
        fields.push({
          name: "🛡️ Sovereignty:",
          value: `**${incursionInfo.allianceName}** [${incursionInfo.allianceTicker}]`
        });
        haveNames = true;
      }

      if ((!thumbURL || !haveNames) && hqId) {
        const sov = await getSovereigntyData(hqId);
        if (sov) {
          if (!haveNames) {
            fields.push({
              name: "🛡️ Sovereignty:",
              value: `**${sov.allianceName}** [${sov.allianceTicker}]`
            });
          }
          thumbURL = sov.logoUrl;
        } else if (!haveNames) {
          fields.push({ name: "🛡️ Sovereignty:", value: "*Unknown alliance control*" });
        }
      }

      if (thumbURL) {
        thumbURL = thumbURL.replace(/(_\d+)?\.png$/, `_${LOGO_SIZE}.png`);
        embed.setThumbnail(thumbURL);
      }
    }

    /* ---------- Edencom / Trig route scan ---------- */
    let edenList: string[] = [];
    let trigList: string[] = [];

    if (lastHeadquarterSystem && hqName !== lastHeadquarterSystem) {
      const scan = await getTrigEdencomSystemsInRoute(lastHeadquarterSystem, hqName);
      edenList = scan.edencom;
      trigList = scan.triglavian;
    }

    // Always show the two fields
    fields.push(
      { name: "🔹 Edencom In Route:", value: edenList.length ? edenList.join(", ") : "None" },
      { name: "🔸 Trig Systems In Route:", value: trigList.length ? trigList.join(", ") : "None" },
    );

    /* ---------- Footer / misc ---------- */
    fields.push(
      { name: "☣️ Kundalini Manifest Timer:", value: this.buildKundaliniTimer(created, now) },
      { name: "⚓ Dock-up:",                  value: dock ? dock.name : "*No recommended station found.*" },
      {
        name:  "📦 Nearest Trade-Hub:",
        value: nearestHub.jumps
          ? `Route from ${nearestHub.name}: [${nearestHub.jumps} jumps](${nearestHub.url})`
          : "N/A",
      },
    );

    embed.addFields(fields);
    embed.setFooter({ text: `🤖 ${MILIA_NAME} 🕐 ${EmbedMessageMapper.eveTime(now)}` });
    return embed;
  }
}
