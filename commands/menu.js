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
  async execute(sock, msg, args, commandsOrResources) {
    const jid = msg.key.remoteJid;
    // Message dispatch passes the per-instance resources object as the fourth
    // argument; direct callers may pass the Map itself. Normalize both shapes
    // so production menus use the same catalog that dispatch uses.
    const commands = commandsOrResources instanceof Map
      ? commandsOrResources
      : commandsOrResources?.commands instanceof Map
        ? commandsOrResources.commands
        : new Map();
    const listMessage = buildDropdown(commands);

    // Baileys renders this payload as WhatsApp's native list/dropdown menu.
    // Keep the command count in the title so it remains visible before opening it.
    try {
      return await sock.sendMessage(jid, listMessage, { quoted: msg });
    } catch (error) {
      // Older WhatsApp clients can reject native lists; never hide the commands.
      const timezone = detectTimezone(msg.key.participant || jid);
      const fallback = menuModule.getMenu(commands, timezone, Number(global.activeUserCount || 0));
      console.warn(`[menu] Native dropdown rejected; using text fallback: ${error.message}`);
      return sock.sendMessage(jid, { text: fallback }, { quoted: msg });
    }
  },
};
