'use strict';

const { isOwner } = require('../utils/isOwner');
const {
  normalizeCommandName,
  isDisabled,
  setDisabled,
  listDisabled,
} = require('../utils/commandToggle');

const CONTROL_NAMES = new Set(['enable', 'disable', 'commandstatus', 'cmdon', 'cmdoff', 'cmdstatus']);

function resolveCommand(commands, input) {
  const normalized = normalizeCommandName(input);
  const command = commands.get(normalized);
  return command ? { command, name: command.name.toLowerCase() } : null;
}

function ownerOnly(sock, msg) {
  if (isOwner(msg)) return true;
  sock.sendMessage(msg.key.remoteJid, { text: '❌ Only the bot owner can change command availability.' }, { quoted: msg });
  return false;
}

async function enable(sock, msg, args, commands) {
  if (!ownerOnly(sock, msg)) return;
  const target = resolveCommand(commands, args[0]);
  if (!target || CONTROL_NAMES.has(target.name)) {
    return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .enable <loaded-command>\nExample: .enable sticker' }, { quoted: msg });
  }
  setDisabled(target.name, false);
  return sock.sendMessage(msg.key.remoteJid, { text: `✅ .${target.name} is now enabled.` }, { quoted: msg });
}

async function disable(sock, msg, args, commands) {
  if (!ownerOnly(sock, msg)) return;
  const target = resolveCommand(commands, args[0]);
  if (!target || CONTROL_NAMES.has(target.name)) {
    return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: .disable <loaded-command>\nExample: .disable sticker' }, { quoted: msg });
  }
  setDisabled(target.name, true);
  return sock.sendMessage(msg.key.remoteJid, { text: `⛔ .${target.name} is now disabled.` }, { quoted: msg });
}

async function status(sock, msg, args, commands) {
  if (!ownerOnly(sock, msg)) return;
  const target = args[0] ? resolveCommand(commands, args[0]) : null;
  if (args[0] && !target) {
    return sock.sendMessage(msg.key.remoteJid, { text: `❌ Command not found: ${normalizeCommandName(args[0])}` }, { quoted: msg });
  }
  if (target) {
    const state = isDisabled(target.name) ? 'DISABLED ⛔' : 'ENABLED ✅';
    return sock.sendMessage(msg.key.remoteJid, { text: `.${target.name}: ${state}` }, { quoted: msg });
  }
  const disabled = listDisabled();
  const loaded = new Set([...commands.values()].map(command => command.name.toLowerCase()));
  const enabledCount = [...loaded].filter(name => !disabled.includes(name)).length;
  const disabledText = disabled.length ? disabled.map(name => `.${name}`).join(', ') : 'None';
  return sock.sendMessage(msg.key.remoteJid, {
    text: `⚙️ *Command status*\nLoaded: ${loaded.size}\nEnabled: ${enabledCount}\nDisabled: ${disabled.length}\n\nDisabled commands: ${disabledText}\n\nUse .commandstatus <command> for one command.`,
  }, { quoted: msg });
}

module.exports = [
  { name: 'enable', aliases: ['cmdon'], description: 'Enable a loaded command (owner only).', execute: enable },
  { name: 'disable', aliases: ['cmdoff'], description: 'Disable a loaded command (owner only).', execute: disable },
  { name: 'commandstatus', aliases: ['cmdstatus'], description: 'Show enabled/disabled command status (owner only).', execute: status },
];
