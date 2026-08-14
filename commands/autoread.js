const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autoread',
    description: 'Toggle automatic read receipts for incoming messages.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        const mode = (args[0] || '').toLowerCase();
        const currentMode = settingsStore.get('autoread', 'off');

        if (!['on', 'off', 'p', 'g', 'all'].includes(mode)) {
            return await sock.sendMessage(jid, {
                text: `╭━━━〔 *AUTO-READ SETUP* 〕━━━┈⊷\n` +
                       `┃ ⋄ *Status:* ${currentMode === 'off' ? '❌ Disabled' : '✅ Active (' + String(currentMode).toUpperCase() + ')'}\n` +
                       `┃\n` +
                       `┃ ⋄ *.autoread p* - Private DMs only\n` +
                       `┃ ⋄ *.autoread g* - Groups only\n` +
                       `┃ ⋄ *.autoread all* - Everywhere\n` +
                       `┃ ⋄ *.autoread off* - Disable\n` +
                       `╰━━━━━━━━━━━━━━━━━━┈⊷`
            });
        }

        let setMode = mode;
        if (mode === 'on') setMode = 'all';
        if (mode === 'off') setMode = false;

        settingsStore.set('autoread', setMode);
        const label = setMode === 'all' ? 'Everywhere' : (setMode === 'p' ? 'Private' : (setMode === 'g' ? 'Groups' : 'OFF'));
        return await sock.sendMessage(jid, { text: `✅ *Auto-Read set to: ${label}*` });
    },
};
