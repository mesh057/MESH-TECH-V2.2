'use strict';

const assert = require('assert');
const menuCommand = require('../commands/menu');
const { loadCommands } = require('../utils/commandLoader');
const path = require('path');

function uniqueCommandCount(commandMap) {
  const names = new Set();
  for (const command of commandMap.values()) {
    if (command?.name) names.add(String(command.name).toLowerCase());
  }
  return names.size;
}

const commands = new Map([
  ['menu', { name: 'menu', category: 'SYSTEM', description: 'Show all commands' }],
  ['ping', { name: 'ping', category: 'GENERAL', description: 'Check bot latency' }],
  ['autoview', { name: 'autoview', category: 'STATUS', description: 'Toggle automatic status viewing' }],
  ['help', { name: 'menu', category: 'SYSTEM', description: 'Alias for menu' }],
]);

(async () => {
  const sent = [];
  await menuCommand.execute({
    async sendMessage(jid, payload, options) {
      sent.push({ jid, payload, options });
      return payload;
    },
  }, { key: { remoteJid: '254700000000@s.whatsapp.net' } }, [], commands);

  assert.equal(sent.length, 1);
  const { payload } = sent[0];
  assert.match(payload.text, /3 COMMANDS LOADED/);
  assert.equal(payload.buttonText, 'VIEW 3 COMMANDS');
  assert.ok(Array.isArray(payload.sections));
  const rows = payload.sections.flatMap((section) => section.rows);
  assert.deepEqual(rows.map((row) => row.rowId).sort(), ['.autoview', '.menu', '.ping']);
  assert.ok(rows.some((row) => row.title === '.autoview'));

  const productionShapeSent = [];
  await menuCommand.execute({
    async sendMessage(jid, payload) {
      productionShapeSent.push({ jid, payload });
      return payload;
    },
  }, { key: { remoteJid: '254700000000@s.whatsapp.net' } }, [], { commands });
  assert.match(productionShapeSent[0].payload.text, /3 COMMANDS LOADED/);
  assert.equal(productionShapeSent[0].payload.sections.flatMap((section) => section.rows).length, 3);

  const realCommands = loadCommands(path.join(__dirname, '..', 'commands'));
  const realSent = [];
  await menuCommand.execute({
    async sendMessage(jid, realPayload) {
      realSent.push({ jid, payload: realPayload });
      return realPayload;
    },
  }, { key: { remoteJid: '254700000000@s.whatsapp.net' } }, [], realCommands);

  assert.equal(realSent.length, 1);
  const realCount = uniqueCommandCount(realCommands);
  assert.match(realSent[0].payload.text, new RegExp(`${realCount} COMMANDS LOADED`));
  assert.ok(realSent[0].payload.sections.length > 0);

  const fallbackSent = [];
  let firstAttempt = true;
  await menuCommand.execute({
    async sendMessage(jid, fallbackPayload) {
      if (firstAttempt) {
        firstAttempt = false;
        throw new Error('list unsupported');
      }
      fallbackSent.push({ jid, payload: fallbackPayload });
      return fallbackPayload;
    },
  }, { key: { remoteJid: '254700000000@s.whatsapp.net' } }, [], realCommands);
  assert.equal(fallbackSent.length, 1);
  assert.match(fallbackSent[0].payload.text, new RegExp(`${realCount} 𝗟𝗼𝗮𝗱𝗲𝗱`));
  console.log(`PASS: menu dropdown exposes ${realCount} real unique commands and text fallback.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
