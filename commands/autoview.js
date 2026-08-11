const settingsStore = require('../utils/settingsStore');

module.exports = {
  name: 'autoview',
  aliases: ['autostatus', 'statusview'],
  description: 'Toggles automatic status viewing. Usage: .autoview on | off',
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();

    if (mode !== 'on' && mode !== 'off') {
      const current = (resources.settings || settingsStore).get('autoview', true); // defaults to true
      return sock.sendMessage(
        jid,
        { text: `👀 Auto-view statuses is currently *${current ? 'ON' : 'OFF'}*.\nUsage: .autoview on | off` },
        { quoted: msg }
      );
    }

    (resources.settings || settingsStore).set('autoview', mode === 'on');
    await sock.sendMessage(jid, { text: `👀 Auto-view statuses is now *${mode.toUpperCase()}*.` }, { quoted: msg });
  },
};
