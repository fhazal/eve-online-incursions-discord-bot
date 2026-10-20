<div align="center">

# 🛰️ M.I.L.I.A.

**Malaya Interstellar Integrated Assistant: an EVE Online incursions bot for Discord.**<br>
Live incursion cards for high-sec and null-sec, with route intel, spawn windows and dock-up advice.

[![Version 1.0.0](https://img.shields.io/badge/M.I.L.I.A.-v1.0.0-8b5cf6)](CHANGELOG.md)
![TypeScript](https://img.shields.io/badge/TypeScript-4.7-3178c6?logo=typescript&logoColor=white)
![discord.js 13](https://img.shields.io/badge/discord.js-13-5865f2?logo=discord&logoColor=white)
![Docker](https://img.shields.io/badge/docker-compose-2496ed?logo=docker&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-e8b04b)](LICENSE)
[![Fork of Olivier Pelletier's bot](https://img.shields.io/badge/fork%20of-eve--online--incursions--discord--bot-555)](https://github.com/OlivierPelletier/eve-online-incursions-discord-bot)

[![Join our Discord](https://img.shields.io/badge/Discord-Join%20BajuBesi-5865f2?logo=discord&logoColor=white&style=for-the-badge)](https://discord.gg/TCmm8cH3GE)

</div>

> [!NOTE]
> M.I.L.I.A. is **BajuBesi Labs'** take on [Olivier Pelletier's EVE Online incursions Discord bot](https://github.com/OlivierPelletier/eve-online-incursions-discord-bot). The original idea, the ESI scanning and the incursion cache are his work; this fork adds the features below.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🛰️ Live incursion cards
Every active Sansha incursion gets its own card that **updates in place**, coloured by its state (🟢 Combat Operations Ongoing, 🟠 Fleet Mobilizing, 🔴 Forces Withdrawing): HQ (🟩 high-sec or 🟥 null-sec), influence %, staging, vanguard and assault systems, and when it was first detected (EVE time).

</td>
<td width="50%" valign="top">

### 🌌 High-sec and null-sec channels
High-sec and null-sec incursions go to **separate channels**, so each community sees its own. Null-sec cards show the **alliance holding sovereignty** with its logo.

</td>
</tr>
<tr>
<td valign="top">

### 🧭 Route intel
Jumps to the HQ from the nearest trade hub (**Jita, Amarr, Dodixie, Hek, Rens**, or **MJ-5F9** for null-sec), and any **EDENCOM** or **Triglavian** systems on the way.

</td>
<td valign="top">

### ⏳ Spawn windows
When nothing is up, the card says when the **next spawn window** opens or that one is active. Live cards carry a **Kundalini Manifest** timer.

</td>
</tr>
<tr>
<td valign="top">

### ⚓ Dock-up advice
A recommended **station to dock** near the staging and HQ systems.

</td>
<td valign="top">

### 🤝 Fleet links
Quick links to community fleets and their waitlists, right on the card.

</td>
</tr>
</table>

Slash command: **`/incursions`** shows the current incursions in any channel.

---

## 🚀 Run it

You need **Docker** with Compose, and a Discord bot from the [Developer Portal](https://discord.com/developers/applications) ([guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html)).

```bash
git clone https://github.com/fhazal/eve-online-incursions-discord-bot.git
cd eve-online-incursions-discord-bot

cp example/config.json config.json                    # then fill it in
cp example/incursions_cache.json incursions_cache.json
docker compose up -d --build
docker compose logs -f
```

The container registers `/incursions` and starts posting. Invite the bot with (replace `<CLIENT_ID>`):

```
https://discord.com/api/oauth2/authorize?client_id=<CLIENT_ID>&permissions=534723951680&scope=bot%20applications.commands
```

> [!IMPORTANT]
> Build from this repository as above. The ready-made `opetdev/…` image from the original project doesn't include this fork's features.

<details>
<summary><b>⚙️ config.json</b></summary>

| Key | What it is |
| --- | --- |
| `clientId` | Your Discord application's id |
| `token` | Your bot's token. **Keep it secret**: `config.json` is ignored by git, never commit it |
| `guildId` | Your Discord server's id |
| `highSecChannelId` | Channel for high-sec incursions |
| `nullSecChannelId` | Channel for null-sec incursions |
| `highSecOnly` | `true` to post high-sec only |

Ids: turn on **Developer Mode** in Discord, then right-click a server or channel → **Copy ID**.

</details>

<details>
<summary><b>🛠️ Development</b></summary>

Node.js 16 and Yarn 1.

```bash
yarn install
yarn run deploy   # register the slash command
yarn run bot      # start the bot
```

`scripts/` has maintenance helpers (cache repair, jump counts, and `generateSystemSecurity.ts`, which rebuilds `src/data/system_security.json` from `mapSolarSystems.csv`).

</details>

---

## 🙏 Credits

- **[Olivier Pelletier](https://github.com/OlivierPelletier)**: the original [eve-online-incursions-discord-bot](https://github.com/OlivierPelletier/eve-online-incursions-discord-bot) (MIT), and its sponsor Kevin "Twiggys" T.
- Incursion and universe data from **EVE Online's ESI**, by CCP Games.
- Fork maintained by **BajuBesi Labs**. Released under the [MIT licence](LICENSE); Olivier's copyright notice is kept.

## CCP Copyright Notice

EVE Online and the EVE logo are the registered trademarks of CCP hf. All rights are reserved worldwide. All other trademarks are the property of their respective owners. EVE Online, the EVE logo, EVE and all associated logos and designs are the intellectual property of CCP hf. All artwork, screenshots, characters, vehicles, storylines, world facts or other recognizable features of the intellectual property relating to these trademarks are likewise the intellectual property of CCP hf. CCP hf. has granted permission to EVE Online incursions Discord bot to use EVE Online and all associated logos and designs for promotional and information purposes on its website but does not endorse, and is not in any way affiliated with, EVE Online incursions Discord bot. CCP is in no way responsible for the content on or functioning of this website, nor can it be liable for any damage arising from the use of this website.

<div align="center">

<sub>Made with ☕ by <b>BajuBesi Labs</b> · EVE Online belongs to CCP Games</sub>

</div>
