'use strict';

const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const logger = require('./logger');

const PAIRING_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const sessions = new Map();

/**
 * Normalizes a phone number to digits only.
 */
function normalizePhoneNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

/**
 * Starts a temporary pairing session for a phone number.
 */
async function startPairing(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  if (!/^\d{8,15}$/.test(number)) {
    throw new Error('Enter a valid phone number with country code.');
  }

  // If there's an existing session for this number, clean it up first
  if (sessions.has(number)) {
    await cleanup(number);
  }

  const tempAuthFolder = path.join(__dirname, '../temp_sessions', `${number}_${Date.now()}`);
  fs.mkdirSync(tempAuthFolder, { recursive: true });

  const session = {
    number,
    tempAuthFolder,
    status: 'initializing',
    code: null,
    sessionId: null,
    error: null,
    expiresAt: Date.now() + PAIRING_TIMEOUT_MS,
    sock: null,
    timeoutHandle: null,
    codePromise: null,
  };

  sessions.set(number, session);

  // The HTTP endpoint can wait briefly for the code, so users see it as soon
  // as it is generated instead of seeing a stale "requesting" message.
  let resolveCode;
  let rejectCode;
  session.codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  // Set timeout to cleanup stale sessions
  session.timeoutHandle = setTimeout(() => {
    if (sessions.has(number) && sessions.get(number).status !== 'success') {
      cleanup(number);
    }
  }, PAIRING_TIMEOUT_MS);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempAuthFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      browser: ['Ubuntu', 'Chrome', '120.0.6099.130'],
      logger: logger.child ? logger.child({ module: 'baileys-pairing' }) : logger,
      defaultQueryTimeoutMs: 90000,
      connectTimeoutMs: 90000,
    });

    session.sock = sock;

    // Guard against requesting the pairing code more than once per session
    let pairingCodeRequested = false;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting' && !session.code && !pairingCodeRequested) {
        pairingCodeRequested = true;
        session.status = 'requesting_code';
        try {
          // WhatsApp needs a moment to finish opening the WebSocket before the
          // link_code_companion_reg IQ request can be sent.
          await new Promise(r => setTimeout(r, 3500));
          if (!sessions.has(number) || session.status === 'error') return;
          if (state.creds.registered) {
            throw new Error('This pairing session is already registered. Start a new pairing request.');
          }
          session.code = await sock.requestPairingCode(number);
          session.status = 'awaiting_code';
          resolveCode(session);
          logger.info(`[pairingManager] Generated code ${session.code} for ${number}`);
        } catch (err) {
          session.status = 'error';
          session.error = err.message || 'Failed to generate pairing code. Please try again.';
          rejectCode(err);
          logger.error(`[pairingManager] Failed to generate code for ${number}: ${err.message}`);
        }
      }

      if (connection === 'open') {
        try {
          const credsPath = path.join(tempAuthFolder, 'creds.json');
          const credsBuffer = fs.readFileSync(credsPath);
          session.sessionId = `MESH-TECH-MD:~${credsBuffer.toString('base64')}`;
          session.status = 'success';
          logger.info(`[pairingManager] Successfully paired ${number}`);

          // Keep the session alive briefly so the UI can read the success state
          setTimeout(() => cleanup(number), 30000);
        } catch (err) {
          session.status = 'error';
          session.error = 'Linked, but failed to generate session string. Please try again.';
          logger.error(`[pairingManager] Failed to generate session string for ${number}: ${err.message}`);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        // If the device is already registered (logged out / replaced), surface a clear message
        if (statusCode === DisconnectReason.loggedOut) {
          session.status = 'error';
          session.error = 'WhatsApp rejected the link. Remove an old/failed entry from WhatsApp > Linked devices, wait a few seconds, and request a fresh code.';
          rejectCode(new Error(session.error));
        } else if (statusCode === DisconnectReason.connectionReplaced) {
          session.status = 'error';
          session.error = 'Connection replaced by another session. Please try again.';
          rejectCode(new Error(session.error));
        } else if (session.status !== 'success' && session.status !== 'error') {
          session.status = 'error';
          session.error = 'Connection closed unexpectedly. Please request a new code.';
          rejectCode(new Error(session.error));
        }
      }
    });

    // Wait only until the code is ready. This keeps the dashboard in sync
    // while still allowing a slow WhatsApp connection to fail clearly.
    try {
      await Promise.race([
        session.codePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp took too long to generate a pairing code. Please try again.')), 20000)),
      ]);
    } catch (err) {
      if (session.status !== 'error') {
        session.status = 'error';
        session.error = err.message;
      }
      throw err;
    }

    return session;
  } catch (err) {
    session.status = 'error';
    session.error = err.message;
    throw err;
  }
}

/**
 * Gets the status of a pairing session.
 */
function getStatus(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  return sessions.get(number);
}

/**
 * Cleans up a pairing session and its temporary files.
 */
async function cleanup(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  const session = sessions.get(number);
  if (!session) return;

  clearTimeout(session.timeoutHandle);
  try {
    if (session.sock) session.sock.end(undefined);
  } catch (_) {}

  try {
    fs.rmSync(session.tempAuthFolder, { recursive: true, force: true });
  } catch (_) {}

  sessions.delete(number);
}

/**
 * Returns the count of active pairing sessions.
 */
function getActiveCount() {
  return sessions.size;
}

module.exports = {
  startPairing,
  getStatus,
  cleanup,
  getActiveCount,
  normalizePhoneNumber,
};
