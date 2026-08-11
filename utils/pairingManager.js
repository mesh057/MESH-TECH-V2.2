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
    const existing = sessions.get(number);
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
  };

  sessions.set(number, session);

  // Set timeout to cleanup
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
      // Pairing must allow enough time for the Noise/WebSocket handshake on
      // Railway before the companion registration IQ is sent.
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      markOnlineOnConnect: false,
    });

    session.sock = sock;
    let pairingRequestStarted = false;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting' && !session.code && !pairingRequestStarted) {
        pairingRequestStarted = true;
        try {
          // The connecting event can arrive before the WebSocket/Noise
          // handshake is ready. This delay is intentional and prevents the
          // link_code_companion_reg IQ from being sent too early.
          await new Promise(resolve => setTimeout(resolve, 5000));
          if (!sessions.has(number) || session.status === 'error') return;
          if (state.creds.registered) {
            throw new Error('This temporary pairing session is already registered. Request a new code.');
          }
          session.status = 'requesting_code';
          session.code = await sock.requestPairingCode(number);
          session.status = 'awaiting_code';
          logger.info(`[pairingManager] Generated code for ${number}; waiting for WhatsApp confirmation`);
        } catch (err) {
          session.status = 'error';
          session.error = `WhatsApp handshake failed while requesting the pairing code: ${err.message}`;
          logger.error(`[pairingManager] Pairing handshake failed for ${number}: ${err.stack || err.message}`);
        }
      }

      if (connection === 'open') {
        try {
          const credsPath = path.join(tempAuthFolder, 'creds.json');
          const credsBuffer = fs.readFileSync(credsPath);
          session.sessionId = `MESH-TECH-MD:~${credsBuffer.toString('base64')}`;
          session.status = 'success';
          logger.info(`[pairingManager] Successfully paired ${number}`);
          
          // Keep it for a bit so the UI can read the success state, then cleanup
          setTimeout(() => cleanup(number), 30000);
        } catch (err) {
          session.status = 'error';
          session.error = 'Linked, but failed to generate session string.';
        }
      }

      if (connection === 'close') {
        if (session.status !== 'success' && session.status !== 'error') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const reason = statusCode === DisconnectReason.loggedOut
            ? 'WhatsApp rejected the companion handshake. Remove any failed linked-device entry and request one fresh code.'
            : statusCode === DisconnectReason.connectionClosed
              ? 'The WhatsApp WebSocket closed during the handshake. Request one fresh code.'
              : `WhatsApp closed the pairing connection${statusCode ? ` (code ${statusCode})` : ''}. Request one fresh code.`;
          session.status = 'error';
          session.error = reason;
          logger.error(`[pairingManager] Pairing connection closed for ${number}: ${reason}`);
        }
      }
    });

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
 * Cleans up a pairing session.
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
 * Returns count of active pairing sessions.
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
