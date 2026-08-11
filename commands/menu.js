'use strict';

const path = require('path');
const menuModule = require(path.join(__dirname, '..', 'media', 'menu.js'));
const config = require('../config/config');

function trimDescription(value) {
  const text = String(value || 'Run this command').replace(/\s+/g, ' ').trim();
  return text.length > 72 ? `${text.slice(0, 69)}...` : text;
}

function buildDropdown(commands) {
  const unique = menuModule.uniqueCommands(commands);
  const groups = menuModule.commandGroups(commands);
  const prefix = String(config.prefix || '.');
  const sections = groups.map(([category, entries]) => ({
    title: `${category} (${entries.length})`,
    rows: entries.map((command) => ({
      title: `${prefix}${String(command.name)}`.slice(0, 24),
      rowId: `${prefix}${String(command.name)}`,
      description: trimDescription(command.description),
    })),
  }));

  return {
    text: `MESH-TECH • ${unique.length} COMMANDS LOADED`,
    title: 'COMMAND DIRECTORY',
    footer: `Select a command below • Prefix: ${prefix}`,
    buttonText: `VIEW ${unique.length} COMMANDS`,
    sections,
  };
}

function detectTimezone(jid) {
  const senderNumber = String(jid || '').replace(/\D/g, '');
  if (senderNumber.startsWith('92')) return 'Asia/Karachi';
  if (senderNumber.startsWith('91')) return 'Asia/Kolkata';
  if (senderNumber.startsWith('1')) return 'America/New_York';
  return config.timezone || 'Africa/Nairobi';
}

module.exports = {
  name: 'menu',
  aliases: ['help'],
  category: 'SYSTEM',
  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;
    const listMessage = buildDropdown(commands);

    // Baileys renders this payload as WhatsApp's native list/dropdown menu.
    // Keep the command count in the title so it remains visible before opening it.
    return sock.sendMessage(jid, listMessage, { quoted: msg });
  },
};
