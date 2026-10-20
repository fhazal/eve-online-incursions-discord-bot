// src/config/config.ts
import cfg from "./config.json";

export const clientId          = cfg.clientId;
export const token             = cfg.token;
export const guildId           = cfg.guildId;

export const highSecChannelId  = cfg.highSecChannelId;
export const nullSecChannelId  = cfg.nullSecChannelId;

/** ⚠️ Temporary fallback so old code that imports `channelId` still compiles.
  * Remove every `channelId` import later and delete this line.            */
export const channelId         = cfg.highSecChannelId;

export const highSecOnly       = cfg.highSecOnly ?? true;
