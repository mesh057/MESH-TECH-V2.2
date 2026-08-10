'use strict';

const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const logger = require('./logger');
const BotInstance = require('../lib/BotInstance');

const PAIRING_TIMEOUT_MS = 3 * 60 * 1000;
const sessions = new Map();
const activeBots = new Map();

function normalizePhoneNumber(value) {
  let number = String(value || '').trim().replace(/[^0-9]/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  return number;
}

async function startPairing(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  if (!/^[1-9]\d{7,14}$/.test(number)) {
    throw new Error('Enter the full international number with country code.');
  }

  if (sessions.has(number)) await cleanup(number);

  const tempAuthFolder = path.join(__dirname, '../temp_sessions', `${number}_${Date.now()}`);
  fs.mkdirSync(tempAuthFolder, { recursive: true });

  const session = {
    number,
    tempAuthFolder,
    status: 'initializing',
    code: null,
    error: null,
    expiresAt: Date.now() + PAIRING_TIMEOUT_MS,
    sock: null,
    timeoutHandle: null,
  };

  sessions.set(number, session);

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
      logger: logger.child({ module: 'baileys-pairing' }),
    });

    session.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, qr } = update;

      if (connection === 'connecting' && !session.code) {
        try {
          await new Promise(r => setTimeout(r, 3000));
          if (!sessions.has(number)) return;
          session.status = 'requesting_code';
          session.code = await sock.requestPairingCode(number);
          session.status = 'awaiting_code';
        } catch (err) {
          session.status = 'error';
          session.error = err.message;
        }
      }

      if (connection === 'open') {
        try {
          const persistentAuthFolder = path.join(__dirname, '../sessions', number);
          if (!fs.existsSync(persistentAuthFolder)) fs.mkdirSync(persistentAuthFolder, { recursive: true });
          
          const files = fs.readdirSync(tempAuthFolder);
          for (const file of files) {
            fs.copyFileSync(path.join(tempAuthFolder, file), path.join(persistentAuthFolder, file));
          }

          session.status = 'success';
          
          // Start the persistent bot instance
          const bot = new BotInstance(number, persistentAuthFolder);
          await bot.init();
          activeBots.set(number, bot);
          
          // Close the temporary pairing socket
          sock.end();
          
          setTimeout(() => {
            if (sessions.has(number)) {
              clearTimeout(sessions.get(number).timeoutHandle);
              sessions.delete(number);
            }
          }, 30000);
        } catch (err) {
          session.status = 'error';
          session.error = err.message;
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

function getStatus(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  return sessions.get(number);
}

function getActiveCount() {
  return activeBots.size;
}

async function cleanup(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  const session = sessions.get(number);
  if (!session) return;
  clearTimeout(session.timeoutHandle);
  try { if (session.sock) session.sock.end(); } catch (_) {}
  try { fs.rmSync(session.tempAuthFolder, { recursive: true, force: true }); } catch (_) {}
  sessions.delete(number);
}

async function initPersistentSessions() {
  const sessionsDir = path.join(__dirname, '../sessions');
  if (!fs.existsSync(sessionsDir)) return;

  const folders = fs.readdirSync(sessionsDir);
  for (const number of folders) {
    try {
      const authFolder = path.join(sessionsDir, number);
      if (!fs.statSync(authFolder).isDirectory()) continue;

      const bot = new BotInstance(number, authFolder);
      await bot.init();
      activeBots.set(number, bot);
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
