# MESH-TECH V2.2 Bot Readiness Audit

## Audit scope

This audit covers the repository at `mesh057/MESH-TECH-V2.2`, with emphasis on concurrent bot instances, pairing-session access control, and the WhatsApp pairing lifecycle.

## Verified behavior

The repository is **multi-instance by normalized phone number**. `utils/instanceManager.js` maintains a separate `BotInstance` for each phone number, persists credentials under `auth_sessions/<phone-number>`, prevents duplicate live instances for the same number, and enforces `MAX_BOT_INSTANCES`.

The HTTP pairing layer issues a unique access token for each pairing request. The existing concurrent API test verifies four simultaneous requests, successful polling, unique tokens, rejection of a token belonging to another pairing session, and rejection of polling without a token. The new `scripts/test-instance-manager-isolation.js` exercises the actual `InstanceManager` class with only the WhatsApp transport stubbed; it verifies that concurrent phone-number instances remain distinct and that duplicate starts reuse the existing instance.

The current local verification commands are:

```bash
node scripts/test-instance-manager-isolation.js
npm run test:multitenant
npm run test:commands
```

## Important boundary

The automated tests do **not** complete a real WhatsApp Web handshake. A real pairing confirmation still requires a reachable production runtime, compatible Baileys dependencies, valid network access to WhatsApp, and a real phone number that can approve the linked-device request. Therefore, the repository is structurally prepared for multiple concurrent phone-number instances, but no responsible audit can claim that live pairing is problem-free without completing an actual WhatsApp pairing in the deployed environment.

The current implementation is also not tenant-aware beyond the phone-number pairing token. The standalone bot repository does not identify an authenticated platform user, so two requests for the same phone number replace the previous pending pairing session. Full account-level tenant isolation belongs in the monetization platform backend, where the authenticated user ID must be associated with the bot instance and session record.

## Operational requirements

Production pairing requires persistent writable storage for `auth_sessions` and `temp_sessions`, a stable Node.js process, a deployment-provided `PORT`, a suitable `MAX_BOT_INSTANCES` value, outbound WebSocket/HTTPS access to WhatsApp, and a process supervisor that does not terminate the bot during the pairing handshake. The full-stack monetization website must use a compatible public Node backend; the static preview cannot execute pairing, database, payment, or WhatsApp operations.
