const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'public',
    description: 'Set bot to public mode.',
    async execute(sock, msg) {
        if (!msg.key.fromMe) return;

        settingsStore.set('mode', 'public');
        await sock.sendMessage(msg.key.remoteJid, {
            text: '🌐 *Work Mode updated:* Bot is now set to *public*'
        });
    },
};
