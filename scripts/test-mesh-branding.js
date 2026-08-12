'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const menuCommand = require('../commands/menu');
const { loadCommands } = require('../utils/commandLoader');

const root = path.join(__dirname, '..');
const commandsDir = path.join(root, 'commands');
const commands = loadCommands(commandsDir);
const sent = [];

(async () => {
  await menuCommand.execute(
    {
      async sendMessage(jid, payload) {
        sent.push({ jid, payload });
        return payload;
      },
    },
    { key: { remoteJid: '254700000000@s.whatsapp.net' } },
    [],
    { commands },
  );

  const payload = sent[0]?.payload;
  assert.ok(payload, 'menu should send a payload');
  assert.match(payload.text, /\d+ COMMANDS LOADED/);
  assert.ok(Array.isArray(payload.sections) && payload.sections.length > 0, 'menu should expose command sections');
  const rows = payload.sections.flatMap((section) => section.rows || []);
  assert.ok(rows.length > 0, 'menu should expose command rows');
  assert.ok(rows.some((row) => row.title === '.alive'), 'menu should list the alive command');
  assert.ok(rows.some((row) => row.title === '.menu'), 'menu should list the menu command');

  const userFacingFiles = fs.readdirSync(commandsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(commandsDir, file));
  const source = userFacingFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /ISAAC-MD|ISAAC BOT|ISAAC TECH|ISAAC ASSISTANT|Powered by ISAAC|BOT:\s*ISAAC|by ISAAC|inside ISAAC/i);
  assert.ok(commands.has('meshtech'), 'renamed MESH-TECH command should be loaded');
  assert.ok(!fs.existsSync(path.join(commandsDir, 'isaac.js')), 'legacy Isaac command file should be removed');

  const runtimeRoots = ['commands', 'media', 'lib', 'utils', 'config', 'index.js', 'README.md'];
  const runtimeSource = runtimeRoots.flatMap((entry) => {
    const target = path.join(root, entry);
    if (fs.statSync(target).isDirectory()) {
      return fs.readdirSync(target).filter((file) => file.endsWith('.js')).map((file) => fs.readFileSync(path.join(target, file), 'utf8'));
    }
    return [fs.readFileSync(target, 'utf8')];
  }).join('\n');
  assert.doesNotMatch(runtimeSource, /isaac/i, 'runtime files must not contain legacy Isaac branding or identifiers');

  const meshtech = fs.readFileSync(path.join(commandsDir, 'meshtech.js'), 'utf8');
  assert.match(meshtech, /Message Mesh/);
  assert.match(meshtech, /254746844168/);
  assert.match(meshtech, /wa\.me/);
  assert.doesNotMatch(meshtech, /ISAAC/i);

  const owner = fs.readFileSync(path.join(commandsDir, 'owner.js'), 'utf8');
  assert.match(owner, /Message Mesh/);
  assert.match(owner, /254746844168/);
  assert.doesNotMatch(owner, /ISAAC/i);

  const donate = fs.readFileSync(path.join(commandsDir, 'donate.js'), 'utf8');
  assert.match(donate, /0746844168/);
  assert.match(donate, /Message Mesh/);
  assert.doesNotMatch(donate, /ISAAC/i);

  const alive = fs.readFileSync(path.join(commandsDir, 'alive.js'), 'utf8');
  assert.match(alive, /MESH-TECH MD/);
  assert.doesNotMatch(alive, /ISAAC/i);

  console.log(`PASS: menu exposes ${rows.length} command rows and user-facing branding is MESH-TECH.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
