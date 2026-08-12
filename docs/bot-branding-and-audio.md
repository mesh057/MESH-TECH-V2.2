# MESH-TECH branding and audio customization

The bot’s user-facing branding is **MESH-TECH MD**. The previous Isaac-branded text has been removed from command responses and media metadata covered by the branding audit.

## Menu contents

The `.menu` command builds a native WhatsApp command directory from the current per-instance command map. It groups commands by category, shows each command name and description, and displays the total number of unique loaded commands in the menu header. If the WhatsApp client rejects the native list payload, the bot sends the full categorized text menu instead. The command catalog is instance-local, so one tenant’s loaded commands are not used for another tenant’s menu.

## Replacing the alive or uptime song

The `.alive` command reads its optional audio clip from `assets/alive.m4a`. The `.uptime` command reads its optional audio clip from `assets/uptime.m4a`. If either file is absent, the text response still works and only the audio message is skipped.

Replacing the song requires a user-supplied audio file; a song title or streaming link alone is not enough for this local-asset path. Convert the chosen audio to an M4A/MP4 audio file compatible with WhatsApp, replace the corresponding asset while keeping the same filename, run the bot regression checks, and redeploy the bot service. If the desired song is provided as a legal downloadable file or an authorized source link, it can be converted before deployment. Do not commit copyrighted audio unless you have permission to distribute it.
