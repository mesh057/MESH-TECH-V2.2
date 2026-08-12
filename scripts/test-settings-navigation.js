const assert = require('assert');
const EventEmitter = require('events');
const { registerMessageHandler } = require('../events/messages');
const settings = require('../commands/settings');
const menu = require('../commands/menu');

function textMessage(text, fromMe = true) {
  return {
    key: { remoteJid: '254700000000@s.whatsapp.net', fromMe },
    message: { conversation: text, messageTimestamp: Math.floor(Date.now() / 1000) },
  };
}

(async () => {
  const ev = new EventEmitter();
  const sent = [];
  const sock = {
    ev,
    sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return payload; },
    readMessages: async () => {},
  };
  const commands = new Map([
    ['settings', settings],
    ['menu', menu],
  ]);
  const resources = {
    settings: { get: (key, fallback) => fallback },
    groupSettings: {},
    messageCache: { set() {} },
    commandToggle: { isDisabled: () => false },
    activeTracker: { recordActivity() {}, getActiveUsers: () => [] },
    presenceManager: null,
    commands,
    menuState: new Map(),
    logger: { info() {}, error() {}, debug() {} },
  };

  registerMessageHandler(sock, commands, resources);
  ev.emit('messages.upsert', { type: 'notify', messages: [textMessage('.settings')] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resources.menuState.get('254700000000@s.whatsapp.net'), 'settings');
  assert.match(sent.at(-1).payload.text, /SETTINGS MENU/);

  ev.emit('messages.upsert', { type: 'notify', messages: [textMessage('0')] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resources.menuState.has('254700000000@s.whatsapp.net'), false);
  assert.match(sent.at(-1).payload.text, /𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗠𝗘𝗡𝗨/);

  console.log('PASS: .settings opens isolated submenu state and reply 0 returns to the main menu.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
