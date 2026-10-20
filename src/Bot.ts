// ──────────────────────────────────────────────────────────────────────────────
//  Bot.ts – Main entry point for the M.I.L.I.A. Incursion Discord bot
//  • Preserves your original logic
//  • Adds a rotating status: Playing / Watching / Listening
//  • Compatible with discord.js v13
// ──────────────────────────────────────────────────────────────────────────────

import { Client, Intents, TextChannel } from "discord.js";

// Load secrets & channel IDs from config.json
import {
  token,
  highSecChannelId,
  nullSecChannelId,
} from "./config/config.json";

// Custom controller that posts incursion embeds, handles commands, etc.
import BotController from "./controllers/BotController";

// Utility that preloads a map of solar-system names for faster look-ups
import { preloadSystemNames } from "./utils/systemNameCache";

// Create the Discord client – add more intents if you later need them
const client = new Client({
  intents: [Intents.FLAGS.GUILDS],
  allowedMentions: { parse: ["everyone"] }, // Allow @everyone if required
});

// Will hold the controller instance once channels are bound
let botController: BotController;

// ──────────────────────────────────────────────────────────────────────────────
//  startBot(): wraps all startup logic so we can await and catch errors neatly
// ──────────────────────────────────────────────────────────────────────────────
async function startBot() {
  console.log("🔄 Preloading solar system names…");
  await preloadSystemNames(); // Load before doing anything else

  // Fires once, after the gateway says “ready”
  client.once("ready", async () => {
    console.log(`✅ Discord bot is ready as ${client.user?.tag}`);

    /* ------------------------------------------------------------------
       ROTATING PRESENCE – cycles every 5 minutes
       ------------------------------------------------------------------ */
    const presenceCycle = [
      { name: "Eve Online",  type: "PLAYING"   as const }, // Playing Eve Online
      { name: "the galaxy",  type: "WATCHING"  as const }, // Watching the galaxy
      { name: "fleet comms", type: "LISTENING" as const }, // Listening to fleet comms
    ];

    let index = 0;

    // Set initial presence
    client.user!.setPresence({
      activities: [presenceCycle[index]],
      status: "online", // Alternatives: 'idle', 'dnd', 'invisible'
    });

    // Rotate presence every 5 min (300 000 ms)
    setInterval(() => {
      index = (index + 1) % presenceCycle.length;
      client.user!.setPresence({
        activities: [presenceCycle[index]],
        status: "online",
      });
    }, 5 * 60 * 1000);
    /* ------------------------------------------------------------------ */

    try {
      // Resolve both channel IDs from Discord’s API
      const highSecChannel = await client.channels.fetch(highSecChannelId);
      const nullSecChannel = await client.channels.fetch(nullSecChannelId);

      // Ensure they exist and are *text* channels
      if (highSecChannel?.isText() && nullSecChannel?.isText()) {
        // Instantiate controller and pass the channels
        botController = new BotController(
          highSecChannel as TextChannel,
          nullSecChannel as TextChannel
        );
        console.log(`✅ Bound high-sec channel:  ${highSecChannelId}`);
        console.log(`✅ Bound null-sec channel: ${nullSecChannelId}`);
      } else {
        console.error("❌ One or both channels are invalid / not text channels.");
      }
    } catch (err) {
      console.error("❌ Failed to fetch channels:", err);
    }
  });

  // Listen for slash-command interactions
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "incursions") {
      // Delegate /incursions handling to the controller
      await botController.commandIncursions(interaction);
    }
  });

  // Finally, log the bot in with its token
  await client.login(token);
}

// Kick things off and surface any startup errors
startBot().catch((err) => {
  console.error("❌ Bot failed to start:", err);
});
