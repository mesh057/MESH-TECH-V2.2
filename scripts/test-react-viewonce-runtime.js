const assert = require('assert');
const EventEmitter = require('events');
const { registerMessageHandler } = require('../events/messages');
const autoreactstatus = require('../commands/autoreactstatus');
const viewonce = require('../commands/viewonce');

function makeStore(initial = {}) {
  const state = { ...initial };
  return { get: (key, fallback) => (key in state ? state[key] : fallback), set: (key, value) => { state[key] = value; }, state };
}
function socket(sent) {
  const ev = new EventEmitter();
  const sock = { ev, user: { id: '254700000099:1@s.whatsapp.net' }, rejectStatusReactionOnce: false, readMessages: async () => {} };
  sock.sendMessage = async (jid, payload, options) => {
    sent.push({ jid, payload, options });
    if (sock.rejectStatusReactionOnce && payload.react && sent.filter((entry) => entry.payload.react).length === 1) {
      throw new Error('not-acceptable');
    }
  };
  return sock;
}
function msg(text, fromMe = true, jid = '120363000000000000@g.us') {
  return { key: { remoteJid: jid, fromMe, id: `id-${Date.now()}` }, message: { conversation: text, messageTimestamp: Math.floor(Date.now() / 1000) } };
}

(async () => {
  const sent = [];
  const store = makeStore({ prefix: '.' });
  const s = socket(sent);
  await autoreactstatus.execute(s, msg('.autoreactstatus on'), ['on'], { settings: store });
  const customEmojis = ['👍', '❤️', '🔥', '😂', '🥳', '😎', '🤖', '🎉', '🚀', '💯', '👏', '🙌', '✨', '🌟', '💚'];
  await autoreactstatus.execute(s, msg(`.autoreactstatus emojis ${customEmojis.join(',')}`), ['emojis', customEmojis.join(',')], { settings: store });
  assert.equal(store.get('autoreactstatus'), true);
  assert.deepEqual(store.get('autoreactemojis'), customEmojis, 'all custom emojis must persist without a count cap');
  await autoreactstatus.execute(s, msg('.autoreactstatus status'), ['status'], { settings: store });
  assert.match(sent.at(-1).payload.text, /💚/);
  assert.match(sent.at(-1).payload.text, /✨/);

  const viewStore = makeStore({ prefix: '.' });
  await viewonce.execute(s, msg('.viewonce on'), ['on'], { settings: viewStore });
  assert.deepEqual(viewStore.get('viewonceautoforwardChats'), ['120363000000000000@g.us']);
  await viewonce.execute(s, msg('.viewonce status'), ['status'], { settings: viewStore });
  assert.match(sent.at(-1).payload.text, /Current chat:\* ✅ ON/);
  await viewonce.execute(s, msg('.viewonce off all'), ['off', 'all'], { settings: viewStore });
  assert.equal(viewStore.get('viewonceallchats'), false);
  assert.deepEqual(viewStore.get('viewonceautoforwardChats'), []);

  const runtimeSent = [];
  const runtimeStore = makeStore({ mode: 'public', viewonceallchats: true, autoreactstatus: true, autoreactemojis: ['🔥'] });
  const runtimeSocket = socket(runtimeSent);
  const resources = {
    settings: runtimeStore,
    groupSettings: {},
    messageCache: { set() {} },
    commandToggle: { isDisabled: () => false },
    activeTracker: { recordActivity() {}, getActiveUsers: () => [] },
    presenceManager: null,
    commands: new Map(),
    menuState: new Map(),
    logger: { info() {}, error() {}, debug() {} },
  };
  registerMessageHandler(runtimeSocket, resources.commands, resources);
  runtimeSocket.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '120363000000000000@g.us', fromMe: false, id: 'view-1' }, message: { viewOnceMessage: { message: { imageMessage: {} } }, messageTimestamp: Math.floor(Date.now() / 1000) } }] });
  runtimeSocket.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: 'status@broadcast', fromMe: false, id: 'status-1', participant: '254700000003@s.whatsapp.net' }, message: { imageMessage: {}, messageTimestamp: Math.floor(Date.now() / 1000) } }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert(runtimeSent.some((entry) => entry.payload.forward), 'enabled ViewOnce forwarding must send the message to the owner');
  assert(runtimeSent.some((entry) => entry.payload.react?.text === '🔥'), 'status reaction must use configured emoji pool');

  const fallbackSent = [];
  const fallbackSocket = socket(fallbackSent);
  fallbackSocket.rejectStatusReactionOnce = true;
  const fallbackResources = { ...resources, settings: makeStore({ mode: 'public', autoreactstatus: true, autoreactemojis: ['✅'] }) };
  registerMessageHandler(fallbackSocket, fallbackResources.commands, fallbackResources);
  fallbackSocket.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: 'status@broadcast', fromMe: false, id: 'status-fallback', participant: '254700000003@s.whatsapp.net' }, message: { imageMessage: {} }, messageTimestamp: Math.floor(Date.now() / 1000) }] });
  await new Promise((resolve) => setImmediate(resolve));
  const fallbackReaction = fallbackSent.find((entry) => entry.payload.react?.text === '✅' && entry.options?.statusJidList?.[1] === '254700000099@s.whatsapp.net');
  assert(fallbackReaction, `not-acceptable status reactions must retry with a normalized bot JID: ${JSON.stringify(fallbackSent)}`);

  console.log('PASS: autoreactstatus mutations, viewonce scope/status, forwarding, and configured status reactions work.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
