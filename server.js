'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const pairingManager = require('./utils/pairingManager');
const instanceManager = require('./utils/instanceManager');

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

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

app.post('/api/restore-session', rateLimit, async (req, res) => {
  try {
    const data = req.body;
    const phoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');
    const sessionIdBase64 = String(data.sessionId || '').trim();

    if (!phoneNumber || !sessionIdBase64) {
      return res.status(400).json({ success: false, error: 'Phone number and session ID are required.' });
    }

    const authDir = instanceManager.authDirFor(phoneNumber);
    fs.mkdirSync(authDir, { recursive: true });

    let rawJson = sessionIdBase64;
    if (sessionIdBase64.includes(';;;')) {
      const parts = sessionIdBase64.split(';;;');
      rawJson = Buffer.from(parts[1] || parts[0], 'base64').toString('utf8');
    } else if (!sessionIdBase64.startsWith('{')) {
      try {
        rawJson = Buffer.from(sessionIdBase64, 'base64').toString('utf8');
      } catch (e) {
        rawJson = sessionIdBase64;
      }
    }

    try {
      const parsed = JSON.parse(rawJson);
      for (const [fileName, content] of Object.entries(parsed)) {
        fs.writeFileSync(path.join(authDir, fileName), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
      }
    } catch (e) {
      fs.writeFileSync(path.join(authDir, 'creds.json'), rawJson);
    }

    await instanceManager.startFromAuth(phoneNumber, authDir);
    res.json({ success: true, message: 'Session restored successfully!', phoneNumber });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({
    botStatus: botConnectionState,
    totalActive: instanceManager.count() + (pairingManager.getActiveCount ? pairingManager.getActiveCount() : 0),
    registered: isRegistered,
  });
});

app.post('/api/request-pairing', rateLimit, async (req, res) => {
  try {
    const phoneNumber = req.body?.phoneNumber;
    const useQr = req.body?.useQr === true;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const session = await pairingManager.startPairing(phoneNumber, useQr);
    const normalized = pairingManager.normalizePhoneNumber(phoneNumber);

    res.json({
      success: true,
      message: 'Pairing code requested.',
      phoneNumber: normalized,
      accessToken: session.accessToken,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/pairing-code', (req, res) => {
  const phoneNumber = req.query.phoneNumber;
  const accessToken = req.query.accessToken;
  if (!phoneNumber || !accessToken) {
    return res.status(400).json({ success: false, error: 'phoneNumber and accessToken query parameters are required.' });
  }

  const session = pairingManager.getStatus(phoneNumber, accessToken);
  if (!session) {
    return res.status(403).json({ success: false, error: 'Pairing session expired or unauthorized. Generate a new code.' });
  }

  if (session.status === 'error') {
    return res.json({ success: false, error: session.error });
  }

  res.json({
    success: true,
    status: session.status,
    code: session.code,
    qr: session.qr,
    phoneNumber: session.number,
    sessionId: session.status === 'success' ? session.sessionId : null,
  });
});

// Explicit 405 handler for GET requests to the pairing API (as requested by support)
app.get('/api/request-pairing', (req, res) => {
  res.status(405).send('405 : Method not allowed');
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
