'use strict';

const path = require('path');
const express = require('express');
const pairingManager = require('./utils/pairingManager');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;

let lastRequestedPhone = null;

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDir, { index: 'pairing.html' }));

app.get('/api/status', (_req, res) => {
  res.json({
    botStatus: 'initialized',
    totalActive: pairingManager.getActiveCount(),
    registered: false, // In multi-user mode, the 'main' bot status is less relevant
  });
});

app.post('/api/request-pairing', async (req, res) => {
  try {
    const phoneNumber = req.body?.phoneNumber;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }
    
    await pairingManager.startPairing(phoneNumber);
    lastRequestedPhone = pairingManager.normalizePhoneNumber(phoneNumber);
    
    res.json({ success: true, message: 'Pairing code requested.' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/pairing-code', (req, res) => {
  const phoneNumber = req.query.phoneNumber || lastRequestedPhone;
  if (!phoneNumber) {
    return res.json({ success: false, error: 'No pairing session active.' });
  }

  const session = pairingManager.getStatus(phoneNumber);
  if (!session) {
    return res.json({ success: false, error: 'Session expired or not found.' });
  }

  if (session.status === 'error') {
    return res.json({ success: false, error: session.error });
  }

  res.json({
    success: true,
    status: session.status,
    code: session.code,
    phoneNumber: session.number,
    sessionId: session.sessionId, // This will be present when status is 'success'
  });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[pairing-server] Multi-user pairing page available on port ${port}`);
});

module.exports = {
  app,
  server,
  // These are kept for backward compatibility with index.js if needed,
  // but they don't affect the multi-user pairing flow anymore.
  setSocket: () => {},
  setConnectionState: () => {},
};
