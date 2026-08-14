const settingsStore = require('../utils/settingsStore');

module.exports = {
  name: 'antidelete',
  description: 'Controls resending deleted/edited messages. Usage: .antidelete p|g|all|off',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();
    const currentMode = settingsStore.get('antidelete', 'off');

    if (!['on', 'off', 'p', 'g', 'all'].includes(mode)) {
      return sock.sendMessage(
        jid,
        {
          text: `╭━━━〔 *ANTI-DELETE SETUP* 〕━━━┈⊷\n` +
                 `┃ ⋄ *Status:* ${currentMode === 'off' ? '❌ Disabled' : '✅ Active (' + String(currentMode).toUpperCase() + ')'}\n` +
                 `┃\n` +
                 `┃ ⋄ *.antidelete p* - Private DMs only\n` +
                 `┃ ⋄ *.antidelete g* - Groups only\n` +
                 `┃ ⋄ *.antidelete all* - Everywhere\n` +
                 `┃ ⋄ *.antidelete off* - Disable\n` +
                 `╰━━━━━━━━━━━━━━━━━━┈⊷`,
        },
        { quoted: msg }
      );
    }

    let setMode = mode;
    if (mode === 'on') setMode = 'all';
    if (mode === 'off') setMode = false;

    settingsStore.set('antidelete', setMode);
    
    const label = setMode === 'all' ? 'Everywhere' : (setMode === 'p' ? 'Private DMs' : (setMode === 'g' ? 'Groups' : 'OFF'));
    return sock.sendMessage(jid, { text: `✅ *Antidelete set to: ${label}*` }, { quoted: msg });
  },
};
