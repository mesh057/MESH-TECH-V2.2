'use strict';

const path = require('path');
const express = require('express');
const pairingManager = require('./utils/pairingManager');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;

let botSocket = null;
let botConnectionState = 'disconnected';
let isRegistered = false;
let botPairingCode = null;
let botPairingNumber = null;

// Simple in-memory rate limiter: max 5 pairing requests per IP per minute
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;

  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);

  if (entry.count > maxRequests) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please wait a minute and try again.' });
  }
  next();
}

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDir, { index: 'pairing.html' }));

app.get('/api/status', (_req, res) => {
  res.json({
    botStatus: botConnectionState,
    totalActive: pairingManager.getActiveCount(),
    registered: isRegistered,
  });
});

app.post('/api/request-pairing', rateLimit, async (req, res) => {
  try {
    const phoneNumber = req.body?.phoneNumber;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const normalized = phoneNumber.replace(/[^0-9]/g, '');
    if (!botSocket) {
      return res.status(503).json({ success: false, error: 'Bot is still initializing. Please wait.' });
    }

    if (isRegistered) {
      return res.status(400).json({ success: false, error: 'Bot is already registered and connected.' });
    }

    // Delay slightly to ensure socket is ready
    await new Promise(r => setTimeout(r, 2000));
    
    botPairingCode = await botSocket.requestPairingCode(normalized);
    botPairingNumber = normalized;

    res.json({
      success: true,
      message: 'Pairing code requested.',
      phoneNumber: normalized,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/pairing-code', (req, res) => {
  const phoneNumber = req.query.phoneNumber;
  const normalized = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : null;

  if (normalized && botPairingNumber === normalized && botPairingCode) {
    return res.json({
      success: true,
      status: isRegistered ? 'success' : 'awaiting_code',
      code: botPairingCode,
      phoneNumber: botPairingNumber,
    });
  }

  // Fallback to pairingManager for multi-user support if needed, 
  // but prioritize main bot pairing
  const session = pairingManager.getStatus(phoneNumber);
  if (session) {
    return res.json({
      success: true,
      status: session.status,
      code: session.code,
      phoneNumber: session.number,
    });
  }

  res.json({ success: false, error: 'No active pairing session found.' });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[pairing-server] Multi-user pairing page available on port ${port}`);
});

module.exports = {
  app,
  server,
  setSocket: (sock) => {
    botSocket = sock;
  },
  setConnectionState: (state, registered) => {
    botConnectionState = state;
    isRegistered = registered;
  },
};
