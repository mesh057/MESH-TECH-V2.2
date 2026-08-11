# Regression investigation notes

Repository audited: https://github.com/mesh057/MESH-TECH-V2.2

## Findings

The command catalog itself was present and healthy: the loader reports **453 loaded command entries**, consisting of **397 unique commands and 56 aliases**. The user-facing symptom was caused by a fragile connection path: `BotInstance.connect()` assumed `this.commands` had already been initialized. That assumption is unsafe during adopted pairing sessions and reconnects, so the connection path now waits for the per-instance stores and reloads commands whenever the command map is absent or empty before registering `events/messages.js`.

The bot’s message handler also correctly defaults to public mode unless a per-instance setting changes it to private mode. In private mode, messages not sent by the bot itself are intentionally ignored. The active command prefix is read from each instance’s settings, defaulting to `.`; the welcome message now explicitly tells the owner to use the active prefix followed by `menu`.

The previous multi-instance welcome path had been reduced to a short self-chat message. It now sends an actionable post-connect message to the normalized bot self-JID, includes the active prefix and menu instruction, and logs any send failure instead of silently swallowing it.

## Fixes applied

`lib/BotInstance.js` now guarantees command loading during every connection and restores the useful post-pairing welcome guidance. `package.json` now exposes named regression scripts: `test:events`, `test:pairing`, `test:instances`, `test:multitenant`, `test:commands`, and the aggregate `test:regression`.

## Verification

All of the following passed after the fix:

```bash
npm run test:events
npm run test:pairing
npm run test:instances
npm run test:multitenant
npm run test:commands
npm run test:regression
```

The tests verify that a real `BotInstance` loads the command map and registers the message handler, sends the post-connect welcome message to the normalized self-JID, and repeats those assertions through the actual `adoptPairingSession()` path. They also verify that the real pairing manager and instance manager isolate different numbers and safely replace same-number pending sessions, that four concurrent HTTP pairing sessions reject cross-token access, and that the command catalog contains the required controls.

## Production note

The adoption-path test uses narrowly scoped Baileys transport and auto-join stubs for deterministic verification; it does not complete a live WhatsApp Web handshake. One real-number deployment test is still required to confirm network access, Baileys compatibility, persistent writable auth storage, and WhatsApp’s linked-device approval flow. If commands still appear silent after deployment, check the bot’s active prefix and whether that instance’s `mode` setting is `public` rather than `private`.
