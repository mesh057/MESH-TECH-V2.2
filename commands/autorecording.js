const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autorecording',
    description: 'Toggle automatic recording status for incoming messages. Usage: .autorecording p|g|all|off',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        const mode = (args[0] || '').toLowerCase();
        const currentMode = settingsStore.get('autorecording', 'off');

        if (!['on', 'off', 'p', 'g', 'all'].includes(mode)) {
            return await sock.sendMessage(jid, {
                text: `╭━━━〔 *AUTO-RECORDING SETUP* 〕━━━┈⊷\n` +
                       `┃ ⋄ *Status:* ${currentMode === 'off' || !currentMode ? '❌ Disabled' : '✅ Active (' + String(currentMode).toUpperCase() + ')'}\n` +
                       `┃\n` +
                       `┃ ⋄ *.autorecording p* - Private DMs only\n` +
                       `┃ ⋄ *.autorecording g* - Groups only\n` +
                       `┃ ⋄ *.autorecording all* - Everywhere\n` +
                       `┃ ⋄ *.autorecording off* - Disable\n` +
                       `╰━━━━━━━━━━━━━━━━━━┈⊷`
            });
        }

        let setMode = mode;
        if (mode === 'on') setMode = 'all';
        if (mode === 'off') setMode = false;

        settingsStore.set('autorecording', setMode);
        // Ensure other presence is off if this is on
        if (setMode) settingsStore.set('autotyping', false);
        
        const label = setMode === 'all' ? 'Everywhere' : (setMode === 'p' ? 'Private' : (setMode === 'g' ? 'Groups' : 'OFF'));
        return await sock.sendMessage(jid, { text: `✅ *Auto-Recording set to: ${label}*` });
    },
};
