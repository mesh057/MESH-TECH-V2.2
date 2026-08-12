'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
} = require('@whiskeysockets/baileys');
const logger = require('./logger');
const instanceManager = require('./instanceManager');

const PAIRING_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_HANDSHAKE_RESTARTS = 2;
const sessions = new Map();

function normalizePhoneNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function getStatusCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode
    ?? lastDisconnect?.error?.data?.statusCode
    ?? lastDisconnect?.error?.statusCode;
}

function makeSocketOptions(version, state) {
  return {
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        logger.child ? logger.child({ module: 'baileys-pairing-keys' }) : logger
      ),
    },
    printQRInTerminal: false,
    logger: logger.child ? logger.child({ module: 'baileys-pairing' }) : logger,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: true,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
  };
}

async function startPairing(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  if (!/^\d{8,15}$/.test(number)) {
    throw new Error('Enter a valid phone number with country code.');
  }

  if (sessions.has(number)) await cleanup(number);

  const tempAuthFolder = path.join(__dirname, '../temp_sessions', `${number}_${Date.now()}`);
  fs.mkdirSync(tempAuthFolder, { recursive: true });

  const session = {
    number,
    accessToken: crypto.randomBytes(32).toString('hex'),
    tempAuthFolder,
    status: 'initializing',
    code: null,
    sessionId: null,
    error: null,
    expiresAt: Date.now() + PAIRING_TIMEOUT_MS,
    sock: null,
    timeoutHandle: null,
    restartCount: 0,
    promoting: false,
    promotionPromise: null,
    cleaned: false,
  };
  sessions.set(number, session);

  session.timeoutHandle = setTimeout(() => {
    if (sessions.get(number) === session && session.status !== 'success') {
      session.status = 'error';
      session.error = 'Pairing timed out. Request a new code.';
      cleanup(number);
    }
  }, PAIRING_TIMEOUT_MS);

  try {
    const { version } = await fetchLatestBaileysVersion();
    await createPairingSocket(session, version, true);
    return session;
  } catch (err) {
    session.status = 'error';
    session.error = err.message;
    throw err;
  }
}

async function createPairingSocket(session, version, requestCode) {
  if (session.cleaned || sessions.get(session.number) !== session) return;

  const { state, saveCreds } = await useMultiFileAuthState(session.tempAuthFolder);
  const sock = makeWASocket(makeSocketOptions(version, state));
  session.sock = sock;

  session.saveCreds = saveCreds;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    handleConnectionUpdate(session, sock, version, update).catch((err) => {
      if (!session.cleaned && session.status !== 'success') {
        session.status = 'error';
        session.error = `Pairing connection failed: ${err.message}`;
        logger.error(`[pairingManager] Pairing lifecycle failed for ${session.number}: ${err.stack || err.message}`);
      }
    });
  });

  if (requestCode && !state.creds.registered) {
    await delay(3000);
    if (session.cleaned || sessions.get(session.number) !== session) return;
    try {
      session.status = 'requesting_code';
      const rawCode = await sock.requestPairingCode(session.number);
      session.code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      session.status = 'awaiting_code';
      logger.info(`[pairingManager] Generated code for ${session.number}; waiting for WhatsApp confirmation`);
    } catch (err) {
      session.status = 'error';
      session.error = `WhatsApp pairing request failed: ${err.message}`;
      logger.error(`[pairingManager] Pairing request failed for ${session.number}: ${err.stack || err.message}`);
    }
  }
}

async function handleConnectionUpdate(session, sock, version, update) {
  if (session.cleaned || sessions.get(session.number) !== session || session.sock !== sock) return;

  const { connection, lastDisconnect } = update;
  if (connection === 'open') {
    if (session.promoting) return session.promotionPromise;
    session.promoting = true;
    session.status = 'promoting';
    session.promotionPromise = (async () => {
      try {
        // Critical lifecycle boundary: do not run the temporary pairing socket
        // beside the permanent tenant socket. Two active sockets for the same
        // WhatsApp identity can race signal-key updates and produce Bad MAC /
        // no-matching-session failures immediately after a successful pairing.
        closePairingSocket(session, sock);
        const credsPath = path.join(session.tempAuthFolder, 'creds.json');
        const credsBuffer = fs.readFileSync(credsPath);
        session.sessionId = `MESH-TECH-MD:~${credsBuffer.toString('base64')}`;
        // Start or refresh only this customer's isolated bot instance. The
        // credentials are stored under auth_sessions/<phone-number>, so a new
        // customer cannot overwrite another customer's WhatsApp session.
        await instanceManager.adoptPairingSession(session.number, session.tempAuthFolder);
        session.status = 'success';
        session.error = null;
        logger.info(`[pairingManager] Successfully paired ${session.number}`);
        const cleanupHandle = setTimeout(() => cleanup(session.number), 30000);
        cleanupHandle.unref?.();
      } catch (err) {
        session.status = 'error';
        session.error = `Linked, but failed to promote the session: ${err.message}`;
        logger.error(`[pairingManager] Failed to promote paired session for ${session.number}: ${err.stack || err.message}`);
      } finally {
        session.promoting = false;
      }
    })();
    return session.promotionPromise;
  }

  if (connection !== 'close') return;

  const statusCode = getStatusCode(lastDisconnect);
  if (statusCode === 515 && session.restartCount < MAX_HANDSHAKE_RESTARTS && !session.cleaned) {
    session.restartCount += 1;
    session.status = 'restarting';
    session.error = null;
    logger.warn(`[pairingManager] WhatsApp requested pairing socket restart for ${session.number} (515), attempt ${session.restartCount}/${MAX_HANDSHAKE_RESTARTS}`);
    try { sock.end(undefined); } catch (_) {}
    await delay(1000);
    if (!session.cleaned && sessions.get(session.number) === session) {
      await createPairingSocket(session, version, false);
    }
    return;
  }

  if (session.promoting || session.status === 'success' || session.status === 'error') return;

  const reason = statusCode === DisconnectReason.loggedOut
    ? 'WhatsApp rejected the companion handshake. Remove any failed linked-device entry and request one fresh code.'
    : statusCode === DisconnectReason.connectionClosed
      ? 'The WhatsApp WebSocket closed during the handshake. Request one fresh code.'
      : `WhatsApp closed the pairing connection${statusCode ? ` (code ${statusCode})` : ''}. Request one fresh code.`;
  session.status = 'error';
  session.error = reason;
  logger.error(`[pairingManager] Pairing connection closed for ${session.number}: ${reason}`);
}

function getStatus(phoneNumber, accessToken) {
  const session = sessions.get(normalizePhoneNumber(phoneNumber));
  if (!session || !accessToken) return null;
  const expected = Buffer.from(session.accessToken);
  const received = Buffer.from(String(accessToken));
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  return session;
}

function closePairingSocket(session, sock) {
  if (!sock || session.sock !== sock) return;
  try { sock.ev.off?.('creds.update', session.saveCreds); } catch (_) {}
  session.sock = null;
  session.saveCreds = null;
  try { sock.end(undefined); } catch (_) {}
}

async function cleanup(phoneNumber) {
  const number = normalizePhoneNumber(phoneNumber);
  const session = sessions.get(number);
  if (!session) return;
  session.cleaned = true;
  clearTimeout(session.timeoutHandle);
  try { if (session.sock) session.sock.end(undefined); } catch (_) {}
  try { fs.rmSync(session.tempAuthFolder, { recursive: true, force: true }); } catch (_) {}
  sessions.delete(number);
}

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
