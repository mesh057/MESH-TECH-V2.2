# Autoreactstatus External Findings

The official Baileys broadcast/stories documentation states that status stories use the special JID `status@broadcast`, and the library exposes `isJidStatusBroadcast` for detection. It documents status sending with `sock.sendMessage('status@broadcast', content, options)`, but the required `statusJidList` applies to publishing a new status, not to reacting to an existing status. Source: https://whiskeysockets-baileys-85.mintlify.app/advanced/broadcast-stories

Baileys issue #32 records that status/broadcast support was added through a later pull request, so status behavior is version-sensitive. Source: https://github.com/WhiskeySockets/Baileys/issues/32

Baileys issue #2388 reports that some users do not receive `status@broadcast` data through `messages.upsert`; discussion identifies possible protocol filtering, event backpressure, and version differences as causes. This means the investigation must verify that Railway receives the status event before changing the reaction payload. Source: https://github.com/WhiskeySockets/Baileys/issues/2388

The local MESH-TECH handler currently recognizes `status@broadcast` and accepts both `notify` and `append` upsert types. It uses the per-instance `settings` store and sends `{ react: { text: emoji, key: msg.key } }` to `status@broadcast`. The focused suite covers notify and append fixtures, but a live event-delivery diagnostic is still required because passing fixtures do not prove Railway receives real status events.

## Production visibility symptom

The user confirmed that the second WhatsApp account cannot see the reaction, despite Railway logging `Status event received` followed by `Auto status reaction sent: ❤️`. This separates local handler execution from WhatsApp-visible delivery.

## Status-reaction compatibility evidence

Baileys issue #1029 includes the commonly used pattern of sending a reaction to `message.key.remoteJid` with `{ react: { key: message.key, text: '💚' } }` and options containing `statusJidList: [message.key.participant, conn.user.id]`. The current implementation sends to the fixed `status@broadcast` JID with the reaction payload but no `statusJidList`. The issue also shows errors when `message.key.participant` is missing, so the real participant field must be logged and validated. Source: https://github.com/WhiskeySockets/Baileys/issues/1029

Baileys discussion #2424 describes the same symptom reported here: logs indicate a status reaction was sent, but WhatsApp does not show it. Source: https://github.com/WhiskeySockets/Baileys/discussions/2424

The official Baileys stories documentation confirms `status@broadcast` as the stories JID and documents `statusJidList` as required for publishing statuses. It does not explicitly document whether that option is required for reactions, so the issue example is evidence to test rather than an unconditional guarantee. Source: https://whiskeysockets-baileys-85.mintlify.app/advanced/broadcast-stories
