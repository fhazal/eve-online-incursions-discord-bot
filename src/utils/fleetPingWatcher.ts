import axios from "axios";
import { TextChannel, Client, MessageEmbed } from "discord.js";
import * as cheerio from "cheerio";

let lastFleetStatus = false; // Track last known fleet state

export async function startFleetPingWatcher(discordClient: Client, channelId: string) {
  setInterval(async () => {
    try {
      const { data } = await axios.get("https://wl.tlaincursions.com/waitlist?wl=1", {
        headers: {
          "User-Agent": "M.I.L.I.A. Fleet Watcher Bot",
        },
      });

      const $ = cheerio.load(data);

      // More flexible detection of fleet up status
      const fleetIndicator = $('body').text().toLowerCase();
      const fleetUp =
        fleetIndicator.includes("online") &&
        fleetIndicator.includes("fleet") &&
        !fleetIndicator.includes("offline");

      if (fleetUp && !lastFleetStatus) {
        const channel = discordClient.channels.cache.get(channelId) as TextChannel;
        if (channel) {
          const embed = new MessageEmbed()
            .setTitle("🚀 TLA Incursion Fleet is Now Online!")
            .setDescription("A new fleet is available for capsuleers. Prepare your ships and join the waitlist.")
            .setColor("#00b0f4")
            .addField("🔗 Waitlist Link", "[Join Now](https://wl.tlaincursions.com/waitlist?wl=1)", false)
            .setFooter({ text: "M.I.L.I.A. Automated Fleet Monitor" })
            .setTimestamp();

          await channel.send({ content: "@everyone", embeds: [embed] });
          lastFleetStatus = true;
        }
      } else if (!fleetUp && lastFleetStatus) {
        lastFleetStatus = false; // Reset flag if fleet goes offline
      }
    } catch (err) {
      console.error("❌ Failed to fetch or parse TLA waitlist page:", err.message);
    }
  }, 60_000); // Check every 60 seconds
}
