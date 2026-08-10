# MESH-TECH-V2.2 — Working Tracker

## What is already verified
- **453 command entries loaded / 397 unique commands / 56 aliases** (test-commands.js passes, exit 0)
- Status suite: `.autolike`, `.autoview`, `.autoreply` (all working — toggleable in events/messages.js)
- New status toggles added: `.autostatus` (auto-view contacts' status), `.autoreact` (auto-react to messages), `.autogreet` (store toggle, hook pending)
- `.vv` / `.vv2` open view-once messages — working
- Fake typing (`.autotyping` on) / fake recording (`.autorecording` on) — working
- Always online: `wapresence` loop in index.js sends `available` every 30s when enabled — working
- DP download in DM: `.getpfp` downloads anyone's profile picture — working

## Real-time stats (fixed)
- `media/menu.js` now shows **live** counts:
  - 📌 Commands loaded (counted at menu render time)
  - 👥 Users active (real-time, last 5 min — from `utils/activeTracker.js`)
  - 🤖 Bots connected (live process count)
- `.listactive` lists users who triggered commands recently

## Items to test together on the real WhatsApp session
These load correctly and have real implementations, but need live testing to fine-tune:
1. **Download commands** — `.mediafire`, `.song2`, `.img`: depend on external APIs (iamtkm.vercel.app for YouTube, Mediafire extractor, DuckDuckGo instant answers). If an endpoint dies we swap it together.
2. **AI commands** — `.llama`, `.mistral`, `.deepseek`, `.chatgpt`, `.chatbot`: use apis.davidcyril.name.ng endpoints.
3. **Anime/react commands** — `.neko`, `.hug`, `.kiss`, `.waifu`, `.animegirl`, etc.: use nekos.best + pollinations.ai.
4. **Games** — `.flag`, `.math`, `.guessnumber`, `.scramble`, `.riddle`: answer-checking wired into events/messages.js.
5. **Group commands** — `.kickall`, `.promoteall`, `.demoteall`, `.closetime`, `.antilinkick`, `.antibug`, `.adminkill`, `.leave`: need a test group.
6. **GitHub commands** — `.gitfollow`, `.gitfollowers`, `.gitrepos`, `.gitstarred`, `.github`.
7. **Owner commands** — `.setbio`, `.setname`, `.setpp`, `.botname`, `.shutdown` (use with care).

## Nice-to-have hooks (already added in code, verify behaviour)
- `antibug`: removes members sending >4000-char or zalgo-heavy messages (when `.antibug on` in group)
- `antilinkick`: group-level kick-on-link (`.antilinkick on`)
- `autoreact`: reacts with random emoji to every incoming message (`.autoreact on`)
- `autostatus`: auto-views contacts' WhatsApp statuses (`.autostatus on`)

## Notes
- Some reference-file commands share names with existing repo commands; repo versions were kept to avoid duplicates.
- `media/TECH.jpg` is the menu cover image; replace it for your own branding.
