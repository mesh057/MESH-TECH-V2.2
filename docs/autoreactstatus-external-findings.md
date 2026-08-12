# Autoreactstatus External Findings

The official Baileys broadcast/stories documentation states that status stories use the special JID `status@broadcast`, and the library exposes `isJidStatusBroadcast` for detection. It documents status sending with `sock.sendMessage('status@broadcast', content, options)`, but the required `statusJidList` applies to publishing a new status, not to reacting to an existing status. Source: https://whiskeysockets-baileys-85.mintlify.app/advanced/broadcast-stories

Baileys issue #32 records that status/broadcast support was added through a later pull request, so status behavior is version-sensitive. Source: https://github.com/WhiskeySockets/Baileys/issues/32

Baileys issue #2388 reports that some users do not receive `status@broadcast` data through `messages.upsert`; discussion identifies possible protocol filtering, event backpressure, and version differences as causes. This means the investigation must verify that Railway receives the status event before changing the reaction payload. Source: https://github.com/WhiskeySockets/Baileys/issues/2388

The local MESH-TECH handler currently recognizes `status@broadcast` and accepts both `notify` and `append` upsert types. It uses the per-instance `settings` store and sends `{ react: { text: emoji, key: msg.key } }` to `status@broadcast`. The focused suite covers notify and append fixtures, but a live event-delivery diagnostic is still required because passing fixtures do not prove Railway receives real status events.
