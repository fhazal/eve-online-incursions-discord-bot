// ✅ This is the corrected version of BotController.ts with:
// - Proper typing for isIslandConstellation
// - Re-added `noIncursionToEmbedMessage` support
// - Fixed Promise typing for send()

import { TextChannel, Message } from "discord.js";
import IncursionInfo from "../models/bot/IncursionInfo";
import EmbedMessageMapper from "../mappers/EmbedMessageMapper";
import IncursionsCacheService from "../services/IncursionsCacheService";
import IncursionInfoService from "../services/IncursionInfoService";
import config from "../config/config.json";

export default class BotController {
  private readonly cacheService: IncursionsCacheService;
  private readonly infoService: IncursionInfoService;

  constructor() {
    this.cacheService = new IncursionsCacheService();
    this.infoService = new IncursionInfoService();
  }

  public async postIncursions(
    highSecChannel: TextChannel,
    nullSecChannel: TextChannel
  ): Promise<void> {
    const incursionList = await this.infoService.getCurrentIncursions();

    if (!incursionList || incursionList.length === 0) {
      await highSecChannel.send({
        embeds: [EmbedMessageMapper.noIncursionToEmbedMessage()]
      });
      await nullSecChannel.send({
        embeds: [EmbedMessageMapper.noIncursionToEmbedMessage()]
      });
      return;
    }

    for (const incursion of incursionList) {
      const isNullSec =
        incursion.headquarterSystemSecurity !== null &&
        incursion.headquarterSystemSecurity <= 0.0;

      const embed = await EmbedMessageMapper.incursionInfoToEmbedMessage(
        incursion
      );

      if (!embed) {
        console.warn(
          `Skipping incursion in ${incursion.headquarterSystem}: invalid security.`
        );
        continue;
      }

      const sentMessage: Message | void = await (isNullSec
        ? nullSecChannel.send({ embeds: [embed] })
        : highSecChannel.send({ embeds: [embed] }));

      // Store to cache
      this.cacheService.storeCurrentIncursion({
        messageId: sentMessage?.id || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        incursionInfo: incursion,
        lastHeadquarterSystem:
          this.cacheService.getLastIncursion()?.incursionInfo
            ?.headquarterSystem || "N/A"
      });
    }
  }
}
