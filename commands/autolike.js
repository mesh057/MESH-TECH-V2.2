const settingsStore = require('../utils/settingsStore');

function buildHelp(current) {
  return `❤️ *Auto-Like Status Settings*\n\n🔹 *Status:* ${current ? '✅ ON' : '❌ OFF'}\n\n*Usage:*\n▸ .autolike on - Automatically react to incoming statuses\n▸ .autolike off - Stop automatically reacting to statuses\n▸ .autolike status - Show the current setting\n\n*Alias:*\n▸ .statuslike on/off`;
}

module.exports = {
  name: 'autolike',
  aliases: ['statuslike'],
  description: 'Configure automatic status reactions. Usage: .autolike on|off|status',
  buildHelp,
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings || settingsStore;
    const mode = String(args[0] || '').toLowerCase();
    const current = Boolean(store.get('autolike', false));

    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can change auto-like status settings.' }, { quoted: msg });
    }

    if (mode === 'status' || !['on', 'off'].includes(mode)) {
      return sock.sendMessage(jid, { text: buildHelp(current) }, { quoted: msg });
    }

    store.set('autolike', mode === 'on');
    return sock.sendMessage(
      jid,
      { text: `❤️ *Auto-Like Status:* ${mode === 'on' ? '✅ ENABLED' : '❌ DISABLED'}\n\nUse *.autolike status* to check it again.` },
      { quoted: msg }
    );
  },
};
