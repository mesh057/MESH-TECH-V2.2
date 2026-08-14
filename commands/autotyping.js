const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autotyping',
    description: 'Toggle automatic typing status for incoming messages. Usage: .autotyping p|g|all|off',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        const mode = (args[0] || '').toLowerCase();
        const currentMode = settingsStore.get('autotyping', 'off');

        if (!['on', 'off', 'p', 'g', 'all'].includes(mode)) {
            return await sock.sendMessage(jid, {
                text: `╭━━━〔 *AUTO-TYPING SETUP* 〕━━━┈⊷\n` +
                       `┃ ⋄ *Status:* ${currentMode === 'off' || !currentMode ? '❌ Disabled' : '✅ Active (' + String(currentMode).toUpperCase() + ')'}\n` +
                       `┃\n` +
                       `┃ ⋄ *.autotyping p* - Private DMs only\n` +
                       `┃ ⋄ *.autotyping g* - Groups only\n` +
                       `┃ ⋄ *.autotyping all* - Everywhere\n` +
                       `┃ ⋄ *.autotyping off* - Disable\n` +
                       `╰━━━━━━━━━━━━━━━━━━┈⊷`
            });
        }

        let setMode = mode;
        if (mode === 'on') setMode = 'all';
        if (mode === 'off') setMode = false;

        settingsStore.set('autotyping', setMode);
        // Ensure other presence is off if this is on
        if (setMode) settingsStore.set('autorecording', false);
        
        const label = setMode === 'all' ? 'Everywhere' : (setMode === 'p' ? 'Private' : (setMode === 'g' ? 'Groups' : 'OFF'));
        return await sock.sendMessage(jid, { text: `✅ *Auto-Typing set to: ${label}*` });
    },
};
