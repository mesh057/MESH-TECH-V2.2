const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autorecording',
    description: 'Toggle automatic recording status for incoming messages.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return; // Owner only

        if (args[0] === 'on') {
            settingsStore.set('fakepresence', 'recording');
            return await sock.sendMessage(msg.key.remoteJid, { text: '🎙️ *Auto-Recording:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('fakepresence', 'off');
            return await sock.sendMessage(msg.key.remoteJid, { text: '🎙️ *Auto-Recording:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('fakepresence', 'off') === 'recording' ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎙️ *Auto-Recording Status:* ${status}\n\n💡 Use \`.autorecording on\` or \`.autorecording off\` to change it.`
        });
    },
};
