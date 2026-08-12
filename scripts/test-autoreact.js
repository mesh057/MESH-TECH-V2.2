const assert = require('assert');
const EventEmitter = require('events');
const autoreact = require('../commands/autoreact');
const { registerMessageHandler } = require('../events/messages');

function store(initial = {}) {
  const state = { ...initial };
  return { get: (key, fallback) => (key in state ? state[key] : fallback), set: (key, value) => { state[key] = value; }, state };
}

function socket(sent) {
  const ev = new EventEmitter();
  const sock = { ev, user: { id: '254746844168:1@s.whatsapp.net' }, readMessages: async () => {} };
  sock.sendMessage = async (jid, payload, options) => { sent.push({ jid, payload, options }); return { key: { remoteJid: jid, id: `sent-${sent.length}` } }; };
  return sock;
}

(async () => {
  const sent = [];
  const settings = store({ prefix: '.', autoreact: false });
  const sock = socket(sent);
  const ownerMessage = { key: { remoteJid: '254746844168@s.whatsapp.net', fromMe: true, id: 'owner-1' }, message: { conversation: '.autoreact on' } };
  await autoreact.execute(sock, ownerMessage, ['on'], { settings });
  assert.equal(settings.get('autoreact'), true, 'owner toggle must persist on the tenant settings store');
  await autoreact.execute(sock, ownerMessage, ['emojis', '💚,🔥'], { settings });
  assert.deepEqual(settings.get('autoreactemojis'), ['💚', '🔥']);

  const nonOwner = { key: { remoteJid: '254700000003@s.whatsapp.net', fromMe: false, participant: '254700000003@s.whatsapp.net', id: 'other-1' }, message: { conversation: '.autoreact off' } };
  await autoreact.execute(sock, nonOwner, ['off'], { settings });
  assert.equal(settings.get('autoreact'), true, 'non-owner must not change the tenant setting');

  const runtimeSent = [];
  const runtimeSocket = socket(runtimeSent);
  const runtimeResources = {
    settings,
    groupSettings: {},
    messageCache: { set() {}, get() {} },
    commandToggle: { isDisabled: () => false },
    activeTracker: { recordActivity() {}, getActiveUsers: () => [] },
    presenceManager: null,
    commands: new Map(),
    menuState: new Map(),
    statusReactionRejections: new Map(),
    logger: { info() {}, error() {}, debug() {}, warn() {} },
  };
  registerMessageHandler(runtimeSocket, runtimeResources.commands, runtimeResources);
  runtimeSocket.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '254700000003@s.whatsapp.net', fromMe: false, id: 'incoming-1' }, message: { conversation: 'hello MESH-TECH', messageTimestamp: Math.floor(Date.now() / 1000) } }] });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert(runtimeSent.some((entry) => entry.payload.react?.text === '💚' || entry.payload.react?.text === '🔥'), 'enabled generic autoreact must send a configured reaction');

  console.log('PASS: MESH-TECH autoreact owner authorization, tenant persistence, aliases, and runtime reaction behavior verified.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
