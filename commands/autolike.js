const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autolike',
    aliases: ['statuslike'],
    description: 'Toggle auto-reacting to contacts\' status updates.',
    async execute(sock, msg, args, resources = {}) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            (resources.settings || settingsStore).set('autolike', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '❤️ *Auto Like Status:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            (resources.settings || settingsStore).set('autolike', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '❤️ *Auto Like Status:* DISABLED [🔴]' });
        }

        const status = (resources.settings || settingsStore).get('autolike', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❤️ *Auto Like Status:* ${status}\n\n💡 Use \`.autolike on\` or \`.autolike off\` to change it.`
        });
    },
};
