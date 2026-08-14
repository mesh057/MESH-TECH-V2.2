const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'welcome',
    aliases: ['welcomeset'],
    description: 'Configure custom welcome messages for group joiners.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        if (!jid.endsWith('@g.us')) {
            return await sock.sendMessage(jid, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
        }

        const matchText = args.join(' ');
        if (!matchText) {
            return await sock.sendMessage(jid, {
                text: '👋 *Welcome Settings*\n\n' +
                      'Usage:\n' +
                      '• `.welcome on` - Enable default welcome\n' +
                      '• `.welcome off` - Disable welcome\n' +
                      '• `.welcome [message]` - Set custom message\n\n' +
                      'Variables:\n' +
                      '• `{user}` - Mention user\n' +
                      '• `{group}` - Group name\n' +
                      '• `{description}` - Group description'
            }, { quoted: msg });
        }

        const groupWelcomeKey = `welcome_${jid}`;
        if (matchText.toLowerCase() === 'on') {
            settingsStore.set(groupWelcomeKey, { status: true, message: null });
            return await sock.sendMessage(jid, { text: '✅ *Welcome message enabled for this group.*' }, { quoted: msg });
        }

        if (matchText.toLowerCase() === 'off') {
            settingsStore.set(groupWelcomeKey, { status: false, message: null });
            return await sock.sendMessage(jid, { text: '✅ *Welcome message disabled for this group.*' }, { quoted: msg });
        }

        settingsStore.set(groupWelcomeKey, { status: true, message: matchText });
        return await sock.sendMessage(jid, { text: '✅ *Custom welcome message set successfully.*' }, { quoted: msg });
    },
};
