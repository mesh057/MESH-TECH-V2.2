'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const path = require('path');
const { loadCommands } = require('../utils/commandLoader');
const { registerMessageHandler } = require('../events/messages');
const PresenceManager = require('../utils/presenceManager');
const MessageCache = require('../utils/messageCache');
const CommandToggle = require('../utils/commandToggle');
const ActiveTracker = require('../utils/activeTracker');

class MemorySettings {
  constructor(initial = {}) { this.state = { ...initial }; this.ready = Promise.resolve(); }
  get(key, fallback) { return Object.prototype.hasOwnProperty.call(this.state, key) ? this.state[key] : fallback; }
  set(key, value) { this.state[key] = value; }
}

function makeSocket() {
  const sock = {
    ev: new EventEmitter(),
    reads: [],
    sent: [],
    presences: [],
    async readMessages(keys) { this.reads.push(keys); },
    async sendMessage(jid, content) { this.sent.push({ jid, content }); },
    async sendPresenceUpdate(type, jid) { this.presences.push({ type, jid }); },
  };
  return sock;
}

async function main() {
  const commands = loadCommands(path.join(__dirname, '../commands'));
  assert(commands.get('autostatus') === commands.get('autoview'), 'autostatus alias must resolve to autoview');
  assert(commands.get('statuslike') === commands.get('autolike'), 'statuslike alias must resolve to autolike');
  assert(commands.get('alwaysonline') === commands.get('wapresence'), 'alwaysonline alias must resolve to wapresence');
  assert(commands.get('presence') === commands.get('wapresence'), 'presence alias must resolve to wapresence');

  const settings = new MemorySettings({ autoview: true, autolike: true, autoreactstatus: false, autoreactemojis: ['🔥', '💙'], fakepresence: 'typing' });
  const sock = makeSocket();
  const presenceManager = new PresenceManager(settings, { warn() {}, debug() {} });
  presenceManager.attach(sock);
  await presenceManager.setAlwaysOnline(true);
  assert(sock.presences.some((entry) => entry.type === 'available'), 'always-online must publish available presence');

  registerMessageHandler(sock, commands, {
    settings,
    groupSettings: new MemorySettings(),
    messageCache: new MessageCache(),
    commandToggle: new CommandToggle(settings),
    activeTracker: new ActiveTracker(),
    presenceManager,
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  });

  sock.ev.emit('messages.upsert', {
    type: 'notify',
    messages: [{
      key: { remoteJid: 'status@broadcast', id: 'status-1', fromMe: false },
      message: { imageMessage: { caption: 'status' } },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sock.reads.length, 1, 'auto-view must read incoming status messages');
  assert(sock.sent.some((entry) => entry.jid === 'status@broadcast' && entry.content.react?.text === '❤️'), 'auto-like must react to incoming statuses');

  settings.set('autolike', false);
  settings.set('autoreactstatus', true);
  sock.ev.emit('messages.upsert', {
    type: 'append',
    messages: [{
      key: { remoteJid: 'status@broadcast', id: 'status-append-1', fromMe: false, participant: '254700000001@s.whatsapp.net' },
      message: { ephemeralMessage: { message: { imageMessage: {} } } },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert(sock.sent.some((entry) => entry.jid === 'status@broadcast' && ['🔥', '💙'].includes(entry.content.react?.text)), 'autoreactstatus must react to append/wrapped status events using the configured emoji list');

  sock.ev.emit('messages.upsert', {
    type: 'notify',
    messages: [{
      key: { remoteJid: '254700000001@s.whatsapp.net', id: 'msg-1', fromMe: false },
      message: { conversation: 'hello' },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert(sock.presences.some((entry) => entry.type === 'composing' && entry.jid === '254700000001@s.whatsapp.net'), 'fake typing must publish composing presence');

  presenceManager.detach();
  console.log('PASS: status auto-view, auto-like, append-event autoreactstatus, always-online, fake typing, and aliases verified.');
  process.exit(0);
}

main().catch((error) => {
  console.error('FAIL:', error.stack || error.message);
  process.exit(1);
});
