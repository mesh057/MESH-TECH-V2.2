'use strict';

const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
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
      defaultQueryTimeoutMs: 90000,
      connectTimeoutMs: 90000,
    });

    session.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting' && !session.code) {
        try {
          // Delay slightly to ensure socket is ready for pairing code request
          await new Promise(r => setTimeout(r, 3000));
          session.code = await sock.requestPairingCode(number);
          session.status = 'awaiting_code';
          logger.info(`[pairingManager] Generated code ${session.code} for ${number}`);
        } catch (err) {
          session.status = 'error';
          session.error = err.message;
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
          
          // Keep it for a bit so the UI can read the success state, then cleanup
          setTimeout(() => cleanup(number), 30000);
        } catch (err) {
          session.status = 'error';
          session.error = 'Linked, but failed to generate session string.';
        }
      }

      if (connection === 'close') {
        // If it closed without success or error, it might be a timeout or network issue
        if (session.status !== 'success' && session.status !== 'error') {
          session.status = 'error';
          session.error = 'Connection closed prematurely.';
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
