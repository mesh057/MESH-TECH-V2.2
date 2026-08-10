const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'self',
    description: 'Set bot to private mode.',
    async execute(sock, msg) {
        if (!msg.key.fromMe) return;

        settingsStore.set('mode', 'private');
        await sock.sendMessage(msg.key.remoteJid, {
            text: '🔒 *Work Mode updated:* Bot is now set to *private*'
        });
    },
};
