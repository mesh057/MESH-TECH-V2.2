'use strict';

const path = require('path');
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;

let socket = null;
let connectionState = 'starting';
let registered = false;
let pendingCode = null;
let pendingPhone = null;
let pendingError = null;
let codeExpiresAt = 0;

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDir, { index: 'pairing.html' }));

function normalizePhoneNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function setSocket(nextSocket) {
  socket = nextSocket;
  registered = Boolean(nextSocket?.user);
}

function setConnectionState(state, nextRegistered = registered) {
  connectionState = state || 'unknown';
  registered = Boolean(nextRegistered);
  if (state === 'close') socket = null;
}

async function requestPairingCode(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!/^\d{8,15}$/.test(normalized)) {
    const error = new Error('Enter a valid phone number with country code.');
    error.statusCode = 400;
    throw error;
  }
  if (!socket) {
    const error = new Error('The WhatsApp connection is still initializing. Try again shortly.');
    error.statusCode = 503;
    throw error;
  }
  if (registered) {
    const error = new Error('This bot is already paired.');
    error.statusCode = 409;
    throw error;
  }

  pendingPhone = normalized;
  pendingCode = null;
  pendingError = null;
  try {
    pendingCode = await socket.requestPairingCode(normalized);
    codeExpiresAt = Date.now() + 60 * 1000;
    return pendingCode;
  } catch (error) {
    pendingError = error.message;
    throw error;
  }
}

app.get('/api/status', (_req, res) => {
  res.json({
    botStatus: connectionState === 'open' ? 'initialized' : connectionState,
    totalActive: connectionState === 'open' || Boolean(socket) ? 1 : 0,
    registered,
  });
});

app.post('/api/request-pairing', async (req, res) => {
  try {
    await requestPairingCode(req.body?.phoneNumber);
    res.json({ success: true, message: 'Pairing code requested.' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/pairing-code', (_req, res) => {
  if (pendingCode && Date.now() < codeExpiresAt) {
    return res.json({ success: true, code: pendingCode, phoneNumber: pendingPhone });
  }
  res.json({ success: false, code: null, error: pendingError || 'Pairing code is not ready.' });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[pairing-server] Pairing page available on port ${port}`);
});

module.exports = {
  app,
  server,
  setSocket,
  setConnectionState,
};
