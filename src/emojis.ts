import { EmbedFieldData } from "discord.js";

/**
 * M.I.L.I.A.'s own app emojis (Developer Portal → M.I.L.I.A. → Emojis), which
 * work on every server the bot is in. Icons from PhobiaCide/eve-icons (EVE
 * Online UI art © CCP).
 */
export const EMOJI = {
  warReport: "<:milia_warreport:1562155945935642655>",
  constellationMap: "<:milia_map:1562155942911414383>",
};

/** An empty inline field: puts a gap between two side-by-side fields. */
export const SPACER_FIELD: EmbedFieldData = { name: "​", value: "​", inline: true };
