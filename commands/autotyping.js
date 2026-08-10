const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autotyping',
    description: 'Toggle automatic typing status for incoming messages.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return; // Owner only

        if (args[0] === 'on') {
            settingsStore.set('autotyping', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '💬 *Auto-Typing:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('autotyping', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '💬 *Auto-Typing:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('autotyping', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💬 *Auto-Typing Status:* ${status}\n\n💡 Use \`.autotyping on\` or \`.autotyping off\` to change it.`
        });
    },
};
