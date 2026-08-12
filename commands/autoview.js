const settingsStore = require('../utils/settingsStore');

function buildHelp(current) {
  return `👁️ *Auto-View Status Settings*\n\n🔹 *Status:* ${current ? '✅ ON' : '❌ OFF'}\n\n*Usage:*\n▸ .autoview on - Automatically view incoming statuses\n▸ .autoview off - Stop automatically viewing statuses\n▸ .autoview status - Show the current setting\n\n*Aliases:*\n▸ .autostatus on/off\n▸ .statusview on/off`;
}

module.exports = {
  name: 'autoview',
  aliases: ['autostatus', 'statusview'],
  description: 'Configure automatic WhatsApp status viewing. Usage: .autoview on|off|status',
  buildHelp,
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings || settingsStore;
    const mode = String(args[0] || '').toLowerCase();
    const current = Boolean(store.get('autoview', true));

    if (mode === 'status' || !['on', 'off'].includes(mode)) {
      return sock.sendMessage(jid, { text: buildHelp(current) }, { quoted: msg });
    }

    store.set('autoview', mode === 'on');
    return sock.sendMessage(
      jid,
      { text: `👁️ *Auto-View Status:* ${mode === 'on' ? '✅ ENABLED' : '❌ DISABLED'}\n\nUse *.autoview status* to check it again.` },
      { quoted: msg }
    );
  },
};
