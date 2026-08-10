'use strict';

const config = require('../config/config');
const { isDisabled } = require('../utils/commandToggle');

module.exports = {
  name: 'help',
  description: 'Shows the list of available commands.',

  /**
   * @param {object} sock - active Baileys socket connection
   * @param {object} msg - raw incoming message object
   * @param {string[]} args - extra words typed after the command (unused)
   * @param {Map<string, object>} commands - all loaded commands, injected by the dispatcher
   */
  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;

    const uniqueCommands = [...new Map(
      [...commands.values()].map(command => [command.name.toLowerCase(), command])
    ).values()]
      .sort((a, b) => a.name.localeCompare(b.name));

    const lines = uniqueCommands.map((cmd, index) => {
      const state = isDisabled(cmd.name) ? ' [OFF]' : '';
      return `${index + 1}. ${config.prefix}${cmd.name}${state} - ${cmd.description || 'No description available.'}`;
    });

    const text = `*${config.botName} — Available Commands*\n\n${lines.join('\n')}\n\nOwner controls: ${config.prefix}enable <command> | ${config.prefix}disable <command> | ${config.prefix}commandstatus`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
