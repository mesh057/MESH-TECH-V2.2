const settingsStore = require('../utils/settingsStore');

module.exports = {
  name: 'antidelete',
  description: 'Controls resending deleted/edited messages. Usage: .antidelete on|off|g|p',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();

    if (!['on', 'off', 'g', 'p'].includes(mode)) {
      const current = settingsStore.get('antidelete', false);
      const dest = settingsStore.get('antideleteDest', 'p');
      return sock.sendMessage(
        jid,
        {
          text: `🗑️ Antidelete is currently *${current ? 'ON' : 'OFF'}*, sending to *${dest === 'g' ? 'original chat' : 'bot DM'}*.\n\nUsage:\n.antidelete on | off\n.antidelete g (resend to original chat)\n.antidelete p (resend to bot DM)`,
        },
        { quoted: msg }
      );
    }

    if (mode === 'on') {
      settingsStore.set('antidelete', true);
      return sock.sendMessage(jid, { text: '🗑️ Antidelete is now *ON*.' }, { quoted: msg });
    }

    if (mode === 'off') {
      settingsStore.set('antidelete', false);
      return sock.sendMessage(jid, { text: '🗑️ Antidelete is now *OFF*.' }, { quoted: msg });
    }

    if (mode === 'g' || mode === 'p') {
      settingsStore.set('antidelete', true);
      settingsStore.set('antideleteDest', mode);
      const destLabel = mode === 'g' ? 'the original chat' : "the bot's own DM";
      return sock.sendMessage(jid, { text: `🗑️ Antidelete is now *ON*, resending to *${destLabel}*.` }, { quoted: msg });
    }
  },
};
