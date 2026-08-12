const assert = require('assert');
const autoview = require('../commands/autoview');
const autolike = require('../commands/autolike');

function makeSocket(sent) {
  return { sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return payload; } };
}

(async () => {
  const viewSent = [];
  await autoview.execute(makeSocket(viewSent), { key: { remoteJid: '254700000000@s.whatsapp.net' } }, ['status'], { settings: { get: () => true, set() {} } });
  assert.match(viewSent[0].payload.text, /Auto-View Status Settings/);
  assert.match(viewSent[0].payload.text, /\.autoview on/);
  assert.match(viewSent[0].payload.text, /\.autoview off/);
  assert.match(viewSent[0].payload.text, /\.autoview status/);

  const likeSent = [];
  await autolike.execute(makeSocket(likeSent), { key: { remoteJid: '254700000000@s.whatsapp.net', fromMe: true } }, ['status'], { settings: { get: () => false, set() {} } });
  assert.match(likeSent[0].payload.text, /Auto-Like Status Settings/);
  assert.match(likeSent[0].payload.text, /\.autolike on/);
  assert.match(likeSent[0].payload.text, /\.autolike off/);
  assert.match(likeSent[0].payload.text, /\.statuslike on\/off/);

  console.log('PASS: dedicated status-view and status-like help screens include status and usage instructions.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
