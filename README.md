<h1 align="center">𝐌𝐄𝐒𝐇 𝐓𝐄𝐂𝐇 𝐌𝐃</h1>

<p align="center">
  <img
    src="https://i.postimg.cc/vHZz7VWG/bot-logo.png"
    alt="MESH TECH MD Banner"
    width="100%"
  />
</p>

<div align="center">
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Black+Ops+One&size=50&pause=1000&color=1BAFBAFF&center=true&width=910&height=100&lines=HELLO+THIS+IS+MESH+TECH+MD;MULTI+DEVICE+WHATSAPP+BOT;SCRIPTED+BY+MESH+TECH;FORK+AND+STAR+THE+REPO" alt="Typing SVG" />
  </a>

<h1>𝐒𝐄𝐓 𝐔𝐏</h1>

## ` Fork this repo`
<p align="centre">
<a href="https://github.com/mesh057/MESH-TECH-V2.2/fork"><img src="https://img.shields.io/badge/Fork%20Create-purple?style=for-the-badge&logo=github" alt="FORK MESH-TECH-MD" width="160"></a>
<p/>

Linking/Pairing:
## ` Pair onrender`
<p align="centre">
<a href="https://mesh-tech-v-2-1.onrender.com"><img height= "37" title="Session 1" src="https://img.shields.io/badge/Session%201-green?style=for-the-badge&logo=render"></a>
<a href="https://mesh-tech-v-2-1.onrender.com"><img height= "37" title="Session 2" src="https://img.shields.io/badge/Session%202-green?style=for-the-badge&logo=render"></a>
<p/>

## ` Deploy to heroku `

 [![Deploy](https://img.shields.io/badge/Deploy-MESH--TECH-7c3aed?style=for-the-badge&logo=heroku&logoColor=white)
](https://bot-monetization.onrender.com)

## PANEL DEPLOYMENT 

<p align="center">
      <b>
     Click below to Download latest MESH-TECH-MD zip.
      <br><br>
      <a href="https://github.com/mesh057/MESH-TECH-V2.2/archive/refs/heads/main.zip">
        <img src="https://img.shields.io/badge/download-zip-blue" alt="Download zip" width="200">
      </a>
    </p>

<p align="center">
  <a href="https://wa.me/254746844168?text=Hello%20Mesh%20Tech%2C%20I%20need%20help%20with%20MESH%20TECH%20MD.">
    <img src="https://img.shields.io/badge/Contact_Developer-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
</p>

<p align="center">
  <a href="https://chat.whatsapp.com/DM1JxxnOJFp0vsTHpej89M?s=cl&p=a&ilr=4">
    <img src="https://img.shields.io/badge/WhatsApp_Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
  <a href="https://whatsapp.com/channel/0029VbDeTrNEKyZ9GlUude2R">
    <img src="https://img.shields.io/badge/WhatsApp_Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
</p>

Modifying the bot structure is at your own risk. We won't offer technical support if errors occur.


## Command system

The command loader now registers **real command modules only**. The old generated catalog that replied with messages such as `is working under AUTOMATION` has been removed, so unavailable commands are no longer presented as if they were implemented.

Run the bot with the prefix configured in `.env` (the default is `.`). To see the commands that are actually loaded, send:

```text
.help
```

Use a command by sending its name followed by its arguments. Examples:

```text
.ping
.alive
.settings
.sticker
.song <song name>
.tiktok <url>
```

Some commands need a quoted message, media attachment, group-admin permission, or an external API key. If a command depends on an external service, configure the relevant key in `.env` before using it. Copy `.env.example` to `.env`, set `OWNER_NUMBER`, `BOT_PREFIX`, `TIMEZONE`, and any service keys required by the commands you plan to use. Never commit `.env`, `auth_info_baileys/`, or generated `data/` files.

### Enable or disable a command

The owner can control individual loaded commands without editing source code. The setting is saved through the existing settings store and remains active after a restart.

| Action | Command | Example |
| --- | --- | --- |
| Enable a command | `.enable <command>` | `.enable sticker` |
| Disable a command | `.disable <command>` | `.disable sticker` |
| Check one command | `.commandstatus <command>` | `.commandstatus sticker` |
| Check all disabled commands | `.commandstatus` | `.commandstatus` |

The aliases `.cmdon`, `.cmdoff`, and `.cmdstatus` are also available. Command names may be entered with or without the configured prefix. For example, `.disable .sticker` and `.disable sticker` refer to the same command.

When a command is disabled, the bot responds with a clear disabled message instead of executing it. The command-control commands remain available so the owner can turn commands back on. Use `.enable sticker` to restore a disabled command.

### Test the command loader

After installing dependencies, run:

```bash
npm run test:commands
```

This checks that command modules load successfully, that the enable/disable controls exist, and that the removed generated placeholder commands are not registered. It does not pair WhatsApp or call external APIs.

## Configuration

For local setup:

```bash
cp .env.example .env
npm install
npm run test:commands
npm start
```

The bot starts the WhatsApp connection and its pairing web server. Use the pairing page exposed by your hosting provider, or provide a previously saved `SESSION_ID`. The default HTTP port is `3000`; production hosts should inject their own `PORT` value.

### Multi-session deployment

V2.2 supports multiple independent WhatsApp accounts in one deployment. Each account is identified by its normalized phone number and receives its own `BotInstance`, authentication directory, settings store, group-settings store, owner context, presence manager, and reconnect lifecycle. Pairing one account does not replace another account’s credentials.

The default runtime layout is:

```text
auth_sessions/<phone-number>/
├── creds.json and Baileys key files
└── data/
    ├── settings.json
    └── group-settings.json
```

Set `MULTI_USER_AUTH_DIR` to the path of a persistent writable directory and set `MAX_BOT_INSTANCES` to the number of accounts the deployment can support safely. On Railway, attach persistent storage or use another durable storage strategy before accepting multiple production sessions; otherwise a redeploy can remove the local authentication folders and require users to pair again. The current default limit is 25 active instances, but the practical limit depends on available RAM, CPU, network capacity, and WhatsApp session load.

Other people who only want to **use** your bot do not need their own session ID. They can use the existing bot in public mode. A separate session ID is required only when a person wants to connect their own WhatsApp account as another bot instance.

Commands that use media conversion or downloads may also require a working FFmpeg binary and valid provider/API credentials. A command can load correctly while still requiring its external service configuration at runtime; the bot reports the service error instead of treating a generic placeholder response as success.
