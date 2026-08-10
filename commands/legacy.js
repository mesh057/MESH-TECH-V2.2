'use strict';

const path = require('path');
const { wrapLegacy } = require('../utils/legacyAdapter');

const definitions = [
  ['anticall', './legacy_commands/anticall.js'],
  ['antidelete', './legacy_commands/antidelete.js'],
  ['antilink', './legacy_commands/antilink.js'],
  ['autoreacts', './legacy_commands/autoreacts.js'],
  ['dp', './legacy_commands/dp.js'],
  ['kick', './legacy_commands/kick.js'],
  ['pinterest', './legacy_commands/pinterest.js'],
  ['remini', './legacy_commands/remini.js'],
  ['song', './legacy_commands/song.js'],
  ['status', './legacy_commands/status.js'],
  ['video', './legacy_commands/video.js'],
  ['vv', './legacy_commands/vv.js'],
  ['welcome', './legacy_commands/welcome.js'],
  ['ytmp3', './legacy_commands/ytmp3.js'],
  ['ytmp4', './legacy_commands/ytmp4.js'],
];

const commands = [];
for (const [name, relativePath] of definitions) {
  try {
    const loaded = require(path.join(__dirname, '..', relativePath));
    const wrapped = wrapLegacy(name, loaded);
    if (Array.isArray(wrapped)) commands.push(...wrapped);
    else if (wrapped) commands.push(wrapped);
  } catch (error) {
    // The loader will report the file-level error while the remaining commands continue loading.
    console.error(`[legacyCommands] Failed to register ${name}: ${error.message}`);
  }
}

module.exports = commands;
