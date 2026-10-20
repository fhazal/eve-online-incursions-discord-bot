// src/mappers/EmbedMessageMapper.ts
// -------------------------------------------------------------
// • Correct alliance-logo URL sizing (“…/<id>_<size>.png”)
// • Edencom / Triglavian route info *always* shown (None when empty)
// • 📦 Trade-hub line hyperlinks the jump count
// • Alliance name / ticker ALWAYS shown (cached or live)
// • Null-sec trade-hub distance calculated only vs MJ-5F9
// • 🪖 Fleet Info block (high-sec only)
// • Author icon = alliance logo for null-sec HQ spawns
// • ⛔ No right-hand thumbnail any more
// -------------------------------------------------------------

import { EmbedFieldData, MessageEmbed } from "discord.js";
import { MILIA_NAME } from "../version";

import ESIIncursionState      from "../models/esi/ESIIncursionState";
import IncursionsCacheEntry   from "../models/bot/IncursionsCacheEntry";

import { noIncursionIconUrl } from "../config/icon_urls.json";
import { getDockUpStation }   from "../utils/getDockUpStation";
import { getSystemIdByName }  from "../utils/getSystemIdByName";
import { getJumpsBetweenSystems } from "../utils/getJumpsBetweenSystems";
import { getCachedSystemSecurity } from "../utils/getCachedSystemSecurity";
import { getSovereigntyData }      from "../utils/getSovereigntyData";
import { getTrigEdencomSystemsInRoute } from "../utils/getTrigEdencomSystemsInRoute";

/* ---------- Trade-hub definitions ---------- */
const HIGHSEC_HUBS = [
  { name: "Jita",    systemId: 30000142 },
  { name: "Amarr",   systemId: 30002187 },
  { name: "Dodixie", systemId: 30002659 },
  { name: "Hek",     systemId: 30002053 },
  { name: "Rens",    systemId: 30002510 },
];
/* Sole hub for null-sec distance calculations */
const NULLSEC_HUB  = { name: "MJ-5F9", systemId: 30002765 };

const LOGO_SIZE = 64;                // 32 / 64 / 128 / 256

export default class EmbedMessageMapper {
/* ───────── static helpers ───────── */
  private static readonly COLOR = {
    green : 0x00b129,
    yellow: 0xff8000,
    red   : 0xb11500,
    purple: 0x5d0085,
  } as const;

  private static pad(n: number) { return n.toString().padStart(2, "0"); }
  private static eveTime(d: Date) {
    return (
      `${d.getUTCFullYear()}-${this.pad(d.getUTCMonth() + 1)}-${this.pad(d.getUTCDate())}` +
      ` at ${this.pad(d.getUTCHours())}:${this.pad(d.getUTCMinutes())} EVE Time`
    );
  }

/* ───────── misc helpers ───────── */
  private buildKundaliniTimer(created: Date, now: Date) {
    const spawn = new Date(created.getTime() + 70 * 3_600_000);
    const diff  = spawn.getTime() - now.getTime();
    if (diff <= 0) return "**Kundalini Manifest is active or spawning soon**";
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    return `Kundalini Manifest in: ${d}d ${h}h – Local Time: <t:${Math.floor(spawn.getTime() / 1000)}:f>`;
  }

  private securityColor(state: string) {
    switch (state) {
      case ESIIncursionState.ESTABLISHED.toString():
        return { color: EmbedMessageMapper.COLOR.green,  emoji: "🟢", label: "Combat Operations Ongoing" };
      case ESIIncursionState.MOBILIZING.toString():
        return { color: EmbedMessageMapper.COLOR.yellow, emoji: "🟠", label: "Fleet Mobilizing" };
      case ESIIncursionState.WITHDRAWING.toString():
        return { color: EmbedMessageMapper.COLOR.red,    emoji: "🔴", label: "Forces Withdrawing" };
      default:
        return { color: EmbedMessageMapper.COLOR.purple, emoji: "🛰️", label: state };
    }
  }

/* ───────── “No incursion” embed ───────── */
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
      .setAuthor({ name: "🔴 No incursion", url: "https://eve-incursions.de/", iconURL: noIncursionIconUrl })
      .setTitle("🚧 No active Sansha incursions in monitored sectors")
      .setDescription("CONCORD patrols report no hostile Sansha fleets in high-security space.")
      .setColor(EmbedMessageMapper.COLOR.purple)
      .addFields([spawnField])
      .setFooter({ text: `${MILIA_NAME} - ${EmbedMessageMapper.eveTime(now)}` });
  }

/* ───────── main embed builder ───────── */
  async incursionInfoToEmbedMessage(
    { incursionInfo, createdAt, lastHeadquarterSystem }: IncursionsCacheEntry
  ): Promise<MessageEmbed> {

    /* ---------- basics ---------- */
    const now     = new Date();
    const created = new Date(createdAt);

    const { color, emoji, label } = this.securityColor(incursionInfo.state);
    const hqName  = incursionInfo.headquarterSystem.trim();
    const secStat = incursionInfo.headquarterSystemSecurity ?? await getCachedSystemSecurity(hqName);

    const isNull = typeof secStat === "number" && secStat <= 0.0;
    const isHigh = typeof secStat === "number" && secStat >= 0.5;

    const title = isNull
      ? `🟥 Null-Sec Incursion Headquarter Detected: ${hqName}`
      : isHigh
      ? `🟩 High-Sec Incursion Headquarter Detected: ${hqName}`
      : `⚠️ Incursion Detected: ${hqName}`;

    /* ---------- helpers ---------- */
    const stagingId = await getSystemIdByName(incursionInfo.stagingSystem);
    const hqId      = await getSystemIdByName(hqName);
    const dock      = await getDockUpStation(incursionInfo.constellationId, stagingId, hqId);

    /* ---------- author icon: alliance logo for null-sec ---------- */
    let authorIcon = incursionInfo.regionIconUrl || noIncursionIconUrl;
    if (isNull) {
      let iconCandidate = incursionInfo.allianceLogoUrl ?? null;
      if (!iconCandidate && hqId) {
        const sov = await getSovereigntyData(hqId);
        if (sov?.logoUrl) iconCandidate = sov.logoUrl;
      }
      if (iconCandidate) {
        authorIcon = iconCandidate.replace(/(_\d+)?\.png$/, `_${LOGO_SIZE}.png`);
      }
    }

    /* ---------- trade-hub distance ---------- */
    type HubRoute = { name: string; jumps: number; url: string };
    let nearestHub: HubRoute = { name: "N/A", jumps: 0, url: "" };

    const HUBS = isNull ? [NULLSEC_HUB] : HIGHSEC_HUBS;
    if (hqId) {
      const routes: HubRoute[] = await Promise.all(
        HUBS.map(async hub => {
          const jumps = await getJumpsBetweenSystems(hub.systemId, hqId);
          return {
            name : hub.name,
            jumps,
            url  : `https://eve-gatecheck.space/eve/#${hub.name}:${hqName}:secure`,
          };
        })
      );
      nearestHub = routes.reduce((p, c) => (c.jumps < p.jumps ? c : p));
    }

    /* ---------- skeleton ---------- */
    const embed = new MessageEmbed()
      .setAuthor({
        name: `${emoji} ${incursionInfo.constellationName} – ${label}`,
        url : "https://eve-incursions.de/",
        iconURL: authorIcon,   // alliance logo in null-sec
      })
      .setTitle(title)
      .setDescription(`Initial detection: ${EmbedMessageMapper.eveTime(created)}`)
      .setColor(color);

    /* ---------- core fields ---------- */
    const fields: EmbedFieldData[] = [
      {
        name : "Operational Summary:",
        value: [
          `**Influence level:** ${Math.round(incursionInfo.influence * 100)}%`,
          `**Island constellation:** ${incursionInfo.isIslandConstellation}`,
          `**Last headquarter distance:** ${incursionInfo.numberOfJumpsFromLastIncursion}`,
        ].join("\n"),
        inline: true,
      },
      {
        name : "Constellation Layout:",
        value: [
          `**Headquarter:** ${incursionInfo.headquarterSystem}`,
          `**Staging:** ${incursionInfo.stagingSystem}`,
          `**Vanguards:** ${incursionInfo.vanguardSystems.join(", ")}`,
          `**Assaults:** ${incursionInfo.assaultSystems.join(", ")}`,
        ].join("\n"),
        inline: true,
      },
    ];

    /* ---------- Sovereignty block (null-sec) ---------- */
    if (isNull) {
      if (incursionInfo.allianceName && incursionInfo.allianceTicker) {
        fields.push({
          name : "<:Alliances:1387750819163803790> Sovereignty:",
          value: `${incursionInfo.allianceName} [${incursionInfo.allianceTicker}]`,
        });
      } else if (hqId) {
        const sov = await getSovereigntyData(hqId);
        fields.push({
          name : "<:Alliances:1387750819163803790> Sovereignty:",
          value: sov ? `${sov.allianceName} [${sov.allianceTicker}]` : "*Unknown alliance control*",
        });
      }
    }

    /* ---------- Edencom / Trig route scan (always present) ---------- */
    let edenRoute = "None";
    let trigRoute = "None";
    if (lastHeadquarterSystem && hqName !== lastHeadquarterSystem) {
      const scan = await getTrigEdencomSystemsInRoute(lastHeadquarterSystem, hqName);
      if (scan.edencom.length)    edenRoute = scan.edencom.join(", ");
      if (scan.triglavian.length) trigRoute = scan.triglavian.join(", ");
    }

    fields.push(
      { name: "<:ecom:1387758833853534240> Edencom In Route:",           value: edenRoute },
      { name: "<:triglavian_coll:1387750631439204474> Triglavian In Route:", value: trigRoute },
    );

    /* ---------- Fleet info (high-sec only) ---------- */
    if (isHigh) {
      fields.push({
        name : "<:Fleet:1387787010311327895> Fleet Info:",
        value: "WTM Fleet: [Waitlist](https://wl.warptome.net/)  | " +
               "TLA Fleet: [Waitlist](https://wl.tlaincursions.com/waitlist?wl=1) ",
      });
    }

    /* ---------- misc / footer ---------- */
    fields.push(
      { name: "<:sansha:1387786770535415932> Kundalini Manifest Timer:", value: this.buildKundaliniTimer(created, now) },
      { name: "<:concord:1387786922134601822> Dock-up:",                   value: dock ? dock.name : "*No recommended station found.*" },
      {
        name : "<:const:1387783210112516166> Nearest Trade-Hub:",
        value: nearestHub.jumps
          ? `Route from ${nearestHub.name}: [${nearestHub.jumps} jumps](${nearestHub.url})`
          : "N/A",
      },
    );

    embed.addFields(fields);
    embed.setFooter({
      text: `${MILIA_NAME} - ${EmbedMessageMapper.eveTime(now)}`
    });

    return embed;
  }
}
