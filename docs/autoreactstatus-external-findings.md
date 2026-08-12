# Autoreactstatus external findings

## Latest production rejection analysis

Railway commit 5fc451bc received status events, including events with a real participant JID and events with `participant=unknown`. The handler attempted the exact-device, normalized-device, and owner-only `statusJidList` variants, but WhatsApp returned `not-acceptable` for each attempt. The deployed log therefore confirms transport receipt but not acceptance by WhatsApp.

The Baileys status-reaction issue documents the standard shape as `sendMessage(message.key.remoteJid, { react: { text, key: message.key } }, { statusJidList: [message.key.participant, conn.user.id] })`. The official stories documentation states that `statusJidList` is required for status traffic, and WhatsApp status visibility is subject to contact and privacy constraints. The current implementation already follows the documented reaction shape; the remaining live hypothesis is that the bot account is not an eligible status recipient for the test account, for example because the bot number is not saved or the status privacy setting excludes it. Events with unknown participants must not be reacted to because there is no valid status owner JID.

References:

- https://github.com/WhiskeySockets/Baileys/issues/1029
- https://whiskeysockets-baileys-85.mintlify.app/advanced/broadcast-stories
- https://faq.whatsapp.com/1691088408081689

## Supplied archive comparison — 2026-08-12

Static inspection of the user-supplied `STUDIO-MD-V3.zip` and `ISAAC-main.zip` found the same status-reaction pattern in both reference implementations: after receiving a status message with a valid `msg.key.participant`, they call `sendMessage('status@broadcast', { react: { text: emoji, key: msg.key } }, { statusJidList: [msg.key.participant] })`. Neither reference adds the bot JID, a normalized bot JID, or multiple retry recipient lists. MESH-TECH's broader participant-list fallback therefore differs from both references and is a credible source of the live `not-acceptable` rejection.

Reference materials consulted: Baileys stories documentation at https://whiskeysockets-baileys-85.mintlify.app/advanced/broadcast-stories and the Baileys status-reaction discussion at https://github.com/WhiskeySockets/Baileys/issues/1196. These findings are comparative evidence only; archive code was not executed.
