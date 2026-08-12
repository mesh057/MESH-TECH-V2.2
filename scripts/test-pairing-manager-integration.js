'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-pairing-integration-'));
let createdSockets = 0;
let endedSockets = 0;
process.env.MULTI_USER_AUTH_DIR = path.join(baseDir, 'auth_sessions');

const botInstancePath = require.resolve('../lib/BotInstance');
class FakeBotInstance {
  constructor(number, authDir) {
    this.number = number;
    this.authDir = authDir;
    this.isOnline = false;
  }
  async init() { this.isOnline = true; }
  async adoptPairingSession() { this.isOnline = true; }
  destroy() { this.isOnline = false; }
}
require.cache[botInstancePath] = { id: botInstancePath, filename: botInstancePath, loaded: true, exports: FakeBotInstance };

const baileysPath = require.resolve('@whiskeysockets/baileys');
function fakeSocket() {
  const ev = new EventEmitter();
  createdSockets += 1;
  let ended = false;
  return {
    ev,
    async requestPairingCode(number) {
      await new Promise((resolve) => setImmediate(resolve));
      ev.emit('connection.update', { connection: 'open' });
      return `CODE${number.slice(-4)}`;
    },
    end() {
      if (!ended) {
        ended = true;
        endedSockets += 1;
      }
    },
  };
}
const fakeBaileys = {
  ...require(baileysPath),
  default: () => fakeSocket(),
  useMultiFileAuthState: async (folder) => {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'creds.json'), JSON.stringify({ id: crypto.randomUUID() }));
    return { state: { creds: { registered: false }, keys: {} }, saveCreds: async () => {} };
  },
  makeCacheableSignalKeyStore: (keys) => keys,
  fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 0] }),
  Browsers: { ubuntu: (name) => ['Ubuntu', name, '1.0'] },
  delay: async (ms) => new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5))),
};
require.cache[baileysPath] = { id: baileysPath, filename: baileysPath, loaded: true, exports: fakeBaileys };

const pairingManager = require('../utils/pairingManager');
const instanceManager = require('../utils/instanceManager');

async function main() {
  try {
    const sessions = await Promise.all([
      pairingManager.startPairing('+254 700 000 011'),
      pairingManager.startPairing('+254 700 000 012'),
    ]);
    assert.equal(new Set(sessions.map((session) => session.number)).size, 2);
    assert.equal(new Set(sessions.map((session) => session.accessToken)).size, 2);
    assert.equal(sessions.every((session) => ['awaiting_code', 'success'].includes(session.status)), true);
    assert.equal(sessions.every((session) => session.code), true);

    const firstStatus = pairingManager.getStatus('254700000011', sessions[0].accessToken);
    const crossStatus = pairingManager.getStatus('254700000011', sessions[1].accessToken);
    assert(firstStatus);
    assert.equal(crossStatus, null);
    assert.equal(instanceManager.count(), 2);
    assert.equal(createdSockets, 2, 'one temporary pairing socket must be created per tenant');
    assert.equal(endedSockets, 2, 'temporary pairing sockets must be closed before promotion');

    const replacement = await pairingManager.startPairing('254700000011');
    assert.notEqual(replacement.accessToken, sessions[0].accessToken);
    assert.equal(pairingManager.getStatus('254700000011', sessions[0].accessToken), null);
    assert(pairingManager.getStatus('254700000011', replacement.accessToken));
    console.log('PASS: real pairingManager plus real InstanceManager isolate different numbers and replace same-number pending sessions safely.');
  } finally {
    await pairingManager.cleanup('254700000011');
    await pairingManager.cleanup('254700000012');
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
