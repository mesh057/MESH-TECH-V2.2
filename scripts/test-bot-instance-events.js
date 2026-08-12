'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-bot-events-'));
const baileysPath = require.resolve('@whiskeysockets/baileys');
const sockets = [];

function makeFakeSocket() {
  const ev = new EventEmitter();
  const sentMessages = [];
  const sock = {
    ev,
    user: { id: '254700000099:1@s.whatsapp.net' },
    sentMessages,
    async sendMessage(jid, payload) {
      sentMessages.push({ jid, payload });
      return payload;
    },
    end() {},
  };
  sockets.push(sock);
  return sock;
}

const realBaileys = require(baileysPath);
require.cache[baileysPath] = {
  id: baileysPath,
  filename: baileysPath,
  loaded: true,
  exports: {
    ...realBaileys,
    default: () => {
      const sock = makeFakeSocket();
      setImmediate(() => sock.ev.emit('connection.update', { connection: 'open' }));
      return sock;
    },
    useMultiFileAuthState: async (authDir) => {
      fs.mkdirSync(authDir, { recursive: true });
      return {
        state: { creds: { registered: true }, keys: {} },
        saveCreds: async () => {},
      };
    },
    fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 0] }),
    makeCacheableSignalKeyStore: (keys) => keys,
    jidNormalizedUser: (jid) => String(jid).replace(/:.*(?=@)/, ''),
    DisconnectReason: { loggedOut: 401, badSession: 500 },
  },
};

const autoJoinPath = require.resolve('../utils/autoJoin');
class FakeAutoJoiner {
  constructor() {}
  async autoJoinGroupOnce() {}
}
require.cache[autoJoinPath] = {
  id: autoJoinPath,
  filename: autoJoinPath,
  loaded: true,
  exports: FakeAutoJoiner,
};

const messagesPath = require.resolve('../events/messages');
const realMessages = require(messagesPath);
const capturedResources = [];
require.cache[messagesPath] = {
  id: messagesPath,
  filename: messagesPath,
  loaded: true,
  exports: {
    ...realMessages,
    registerMessageHandler(sock, commands, resources) {
      capturedResources.push(resources);
      return realMessages.registerMessageHandler(sock, commands, resources);
    },
  },
};

const BotInstance = require('../lib/BotInstance');

async function main() {
  let passed = false;
  try {
    const instance = new BotInstance('254700000099', path.join(baseDir, 'auth'));
    await instance.init();
    await new Promise((resolve) => setImmediate(resolve));

    assert(instance.commands instanceof Map);
    assert(instance.commands.size > 0, 'BotInstance must load commands before registering message handlers');
    assert.equal(instance.sock.ev.listenerCount('messages.upsert'), 1);
    assert.equal(capturedResources[0].commands, instance.commands, 'production resources must carry the instance command Map');
    assert.equal(instance.sock.sentMessages.length, 1);
    const initialWelcome = instance.sock.sentMessages[0].payload.text;
    assert.match(initialWelcome, /MESH-TECH MD BOT.*successfully connected/);
    assert.match(initialWelcome, /Status:\* Online & Active/);
    assert.match(initialWelcome, /Owner:\* @254700000099/);
    assert.match(initialWelcome, /Prefix:\* \[ \. \]/);
    assert.match(initialWelcome, /> Type \*\.menu\*/);
    assert.match(initialWelcome, /Powered by MESH TECH/);
    assert.match(initialWelcome, /chat\.whatsapp\.com\/DM1JxxnOJFp0vsTHpej89M/);
    assert.match(initialWelcome, /whatsapp\.com\/channel\/0029VbDeTrNEKyZ9GIUude2R/);
    assert.doesNotMatch(initialWelcome, /Isaac/i);
    assert.equal(instance.sock.sentMessages[0].jid, '254700000099@s.whatsapp.net');

    const sourceDir = path.join(baseDir, 'pairing-source');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'creds.json'), JSON.stringify({ registered: true }));
    await instance.adoptPairingSession(sourceDir);
    await new Promise((resolve) => setImmediate(resolve));

    assert(instance.commands instanceof Map);
    assert(instance.commands.size > 0, 'Adopted BotInstance must retain commands before registering message handlers');
    assert.equal(sockets.length, 2);
    assert.equal(instance.sock.ev.listenerCount('messages.upsert'), 1);
    assert.equal(capturedResources[1].commands, instance.commands, 'adopted resources must carry the instance command Map');
    assert.equal(instance.sock.sentMessages.length, 1);
    const adoptedWelcome = instance.sock.sentMessages[0].payload.text;
    assert.match(adoptedWelcome, /MESH-TECH MD BOT.*successfully connected/);
    assert.match(adoptedWelcome, /Status:\* Online & Active/);
    assert.match(adoptedWelcome, /Owner:\* @254700000099/);
    assert.match(adoptedWelcome, /Powered by MESH TECH/);
    assert.match(adoptedWelcome, /chat\.whatsapp\.com\/DM1JxxnOJFp0vsTHpej89M/);
    assert.match(adoptedWelcome, /whatsapp\.com\/channel\/0029VbDeTrNEKyZ9GIUude2R/);
    assert.doesNotMatch(adoptedWelcome, /Isaac/i);
    assert.equal(instance.sock.sentMessages[0].jid, '254700000099@s.whatsapp.net');

    instance.sock.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { message: 'Bad MAC', output: { statusCode: 500 } } },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(instance.sessionResetRequired, true, 'Bad MAC must quarantine the corrupted session');
    assert.equal(fs.existsSync(instance.authDir), false, 'corrupted auth files must be cleared');
    console.log(`PASS: initial and adopted BotInstance connections loaded ${instance.commands.size} commands/aliases and quarantined Bad MAC sessions.`);
    passed = true;
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
    if (passed) setImmediate(() => process.exit(0));
  }
}

main().catch((error) => {
  console.error('FAIL:', error.stack || error.message);
  process.exit(1);
});
