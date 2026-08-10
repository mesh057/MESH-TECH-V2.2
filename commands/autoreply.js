const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autoreply',
    description: 'Toggle fixed greeting auto-replies (hi, hello, thanks, etc).',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('autoreply', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '💬 *Auto-Reply:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('autoreply', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '💬 *Auto-Reply:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('autoreply', true) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💬 *Auto-Reply Status:* ${status}\n\n💡 Use \`.autoreply on\` or \`.autoreply off\` to change it.`
        });
    },
};
