# Changelog

M.I.L.I.A. (Malaya Interstellar Integrated Assistant), the EVE Online incursions bot by BajuBesi Labs. The version is in the footer of every card: new features raise the middle number (1.1.0), fixes only the last (1.0.1). Releases are tagged `milia-v<version>`; the plain `v1.0.x` tags belong to the original bot.

## 1.1.0 · 21 October 2026

- **Icons on the card's first two blocks:** *Operational Summary* gets a war-report icon and *Constellation Layout* a constellation-map icon, EVE interface icons from [PhobiaCide/eve-icons](https://github.com/PhobiaCide/eve-icons). They are M.I.L.I.A.'s own app emojis, so they show on every server the bot is in.
- **More room between them:** the two blocks no longer sit right against each other on PC (phones show them one under the other, as before).
- Same on the Ether, small-alliance and big-alliance layouts.

## 1.0.0 · 21 October 2026

The first numbered release of M.I.L.I.A., built on [Olivier Pelletier's eve-online-incursions-discord-bot](https://github.com/OlivierPelletier/eve-online-incursions-discord-bot) 1.0.3. Everything below is new compared to the original.

- **High-sec and null-sec channels:** incursions are posted to two channels instead of one (`highSecChannelId`, `nullSecChannelId`), with a `highSecOnly` switch.
- **Status at a glance:** cards are coloured by the incursion's state (🟢 Combat Operations Ongoing, 🟠 Fleet Mobilizing, 🔴 Forces Withdrawing), and the title says whether the HQ is in high-sec (🟩) or null-sec (🟥).
- **Sovereignty:** null-sec cards show the alliance holding the space, with its logo.
- **Route intel:** jumps from the nearest trade hub (Jita, Amarr, Dodixie, Hek, Rens, or MJ-5F9 for null-sec), and any EDENCOM or Triglavian systems on the route.
- **Dock-up advice:** a recommended station near the staging and HQ systems.
- **Kundalini Manifest timer** on live cards, and **fleet waitlist links**.
- **No-incursion card:** a themed card with the next spawn window.
- **EVE time** for first detection and in the footer, which now shows the version.
- **Richer cache:** region, HQ security, the previous HQ and the alliance are kept for each incursion.
- **Data and scripts:** EDENCOM and Triglavian system lists, every system's security, and scripts to repair the cache and rebuild the data.
- **Layouts for other alliances:** Ether, rosak, small alliance, big alliance and HS/NS/Sap versions of the card.
- **Docker Compose** setup that builds from this repository.
