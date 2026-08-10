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
const activeBots = new Map(); // Track connected bot instances

/**
 * Normalizes a phone number to digits only.
 */
function normalizePhoneNumber(value) {
  let number = String(value || '').trim().replace(/[^0-9]/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  return number;
}

/**
 * Starts a temporary pairing session for a phone number.
 */
async function startPairing(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  if (!/^[1-9]\d{7,14}$/.test(number)) {
    throw new Error('Enter the full international number with country code, without +, spaces, or a leading 0. Example: 254712345678.');
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

  // connection.update may emit "connecting" more than once. Only one
  // request may be in flight, otherwise WhatsApp can invalidate the code
  // that was shown to the user and report that the phone number is wrong.

  sessions.set(number, session);

  // Set timeout to cleanup
  session.timeoutHandle = setTimeout(() => {
    if (sessions.has(number) && sessions.get(number).status !== 'success') {
      cleanup(number);
    }
  }, PAIRING_TIMEOUT_MS);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempAuthFolder);
    let pairingCodeRequested = false;
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

      if (connection === 'connecting' && !session.code && !pairingCodeRequested) {
        pairingCodeRequested = true;
        try {
          // Delay slightly to ensure socket is ready for pairing code request
          await new Promise(r => setTimeout(r, 3000));
          if (!sessions.has(number) || session.status === 'error') return;
          if (state.creds.registered) {
            throw new Error('This pairing session is already registered. Start a new pairing request.');
          }
          session.status = 'requesting_code';
          session.code = await sock.requestPairingCode(number);
          session.status = 'awaiting_code';
          logger.info(`[pairingManager] Generated code ${session.code} for ${number}`);
        } catch (err) {
          session.status = 'error';
          session.error = err.message || 'Failed to generate a pairing code. Please try again.';
          logger.error(`[pairingManager] Failed to generate code for ${number}: ${err.message}`);
        }
      }

      if (connection === 'open') {
        try {
          // Instead of a temporary session, move this to a persistent one
          const persistentAuthFolder = path.join(__dirname, '../sessions', number);
          if (!fs.existsSync(persistentAuthFolder)) {
            fs.mkdirSync(persistentAuthFolder, { recursive: true });
          }
          
          // Move credentials from temp to persistent
          const files = fs.readdirSync(tempAuthFolder);
          for (const file of files) {
            fs.copyFileSync(path.join(tempAuthFolder, file), path.join(persistentAuthFolder, file));
          }

          session.status = 'success';
          logger.info(`[pairingManager] Successfully paired ${number}. Bot is now persistent.`);
          
          // Register this bot instance globally if needed, or it will be picked up on restart
          activeBots.set(number, sock);
          
          // Initialize bot features for this new socket
          const { loadCommands } = require('./commandLoader');
          const { registerMessageHandler } = require('../events/messages');
          const commands = loadCommands(path.join(__dirname, '../commands'));
          registerMessageHandler(sock, commands);

          // Keep session object for UI polling then cleanup
          setTimeout(() => {
            if (sessions.has(number)) {
              const s = sessions.get(number);
              clearTimeout(s.timeoutHandle);
              sessions.delete(number);
            }
          }, 30000);
        } catch (err) {
          session.status = 'error';
          session.error = 'Linked, but failed to persist session: ' + err.message;
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
 * Returns count of active pairing sessions and connected bots.
 */
function getActiveCount() {
  return sessions.size + activeBots.size;
}

/**
 * Initializes all saved sessions on startup.
 */
async function initPersistentSessions() {
  const sessionsDir = path.join(__dirname, '../sessions');
  if (!fs.existsSync(sessionsDir)) return;

  const folders = fs.readdirSync(sessionsDir);
  for (const number of folders) {
    try {
      const authFolder = path.join(sessionsDir, number);
      if (!fs.statSync(authFolder).isDirectory()) continue;

      const { state, saveCreds } = await useMultiFileAuthState(authFolder);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '120.0.6099.130'],
        logger: logger.child ? logger.child({ module: `baileys-${number}` }) : logger,
      });

      sock.ev.on('creds.update', saveCreds);
      
      sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
          logger.info(`[pairingManager] Persistent bot ${number} connected.`);
          activeBots.set(number, sock);
          
          const { loadCommands } = require('./commandLoader');
          const { registerMessageHandler } = require('../events/messages');
          const commands = loadCommands(path.join(__dirname, '../commands'));
          registerMessageHandler(sock, commands);
        }
        if (connection === 'close') {
          activeBots.delete(number);
        }
      });
    } catch (err) {
      logger.error(`[pairingManager] Failed to load persistent session ${number}: ${err.message}`);
    }
  }
}

module.exports = {
  startPairing,
  getStatus,
  cleanup,
  getActiveCount,
  normalizePhoneNumber,
  initPersistentSessions,
};
