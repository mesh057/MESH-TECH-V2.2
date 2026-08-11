const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'wapresence',
    aliases: ['alwaysonline', 'presence'],
    description: 'Toggle always-online, fake typing, or fake recording presence.',
    async execute(sock, msg, args, resources = {}) {
        if (!msg.key.fromMe) return;

        const store = resources.settings || settingsStore;
        const mode = String(args[0] || '').toLowerCase();

        if (mode === 'on') {
            if (resources.presenceManager) await resources.presenceManager.setAlwaysOnline(true);
            else {
                store.set('wapresence', true);
                await sock.sendPresenceUpdate('available');
            }
        } else if (mode === 'off') {
            if (resources.presenceManager) await resources.presenceManager.setAlwaysOnline(false);
            else {
                store.set('wapresence', false);
                await sock.sendPresenceUpdate('unavailable');
            }
        } else if (mode === 'typing' || mode === 'recording') {
            store.set('fakepresence', mode);
        } else if (mode === 'none' || mode === 'paused') {
            store.set('fakepresence', 'off');
        }

        const online = store.get('wapresence', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        const fake = store.get('fakepresence', 'off').toUpperCase();
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🟢 *Always Online:* ${online}\n💬 *Fake Presence:* ${fake}\n\nUse ".wapresence on/off", ".wapresence typing", ".wapresence recording", or ".wapresence none".`
        });
    },
};
