const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'wapresence',
    aliases: ['alwaysonline', 'presence'],
    description: 'Toggle always-online, fake typing, or fake recording presence with p/g/all/off scope.',
    async execute(sock, msg, args, resources = {}) {
        if (!msg.key.fromMe) return;

        const store = resources.settings || settingsStore;
        const subCmd = String(args[0] || '').toLowerCase();
        const mode = String(args[1] || args[0] || '').toLowerCase();

        // If subcommand is typing or recording
        if (subCmd === 'typing' || subCmd === 'recording') {
            const target = ['p', 'g', 'all', 'on', 'off'].includes(mode) ? mode : 'all';
            const val = (target === 'on' || target === 'all') ? 'all' : target;
            store.set(subCmd === 'typing' ? 'autotyping' : 'autorecording', val);
            if (val !== 'off') store.set(subCmd === 'typing' ? 'autorecording' : 'autotyping', 'off');
        } else {
            // always online / wapresence
            let target = 'off';
            if (mode === 'on' || mode === 'all' || mode === 'true') target = 'all';
            else if (mode === 'p' || mode === 'g' || mode === 'off') target = mode;

            store.set('wapresence', target);
            if (target !== 'off') {
                await sock.sendPresenceUpdate('available').catch(() => {});
            }
        }

        const online = store.get('wapresence', 'off');
        const typing = store.get('autotyping', 'off');
        const recording = store.get('autorecording', 'off');

        const formatVal = (v) => {
            if (v === true || v === 'all') return 'ALL (✅)';
            if (v === 'p') return 'PRIVATE (👤)';
            if (v === 'g') return 'GROUP (👥)';
            return 'OFF (❌)';
        };

        await sock.sendMessage(msg.key.remoteJid, {
            text: `╭━━━〔 *WHATSAPP PRESENCE* 〕━━━┈⊷\n` +
                  `┃ ⋄ *Always Online:* ${formatVal(online)}\n` +
                  `┃ ⋄ *Auto Typing:* ${formatVal(typing)}\n` +
                  `┃ ⋄ *Auto Recording:* ${formatVal(recording)}\n` +
                  `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                  `*Usage:*\n` +
                  `.alwaysonline p/g/all/off\n` +
                  `.autotyping p/g/all/off\n` +
                  `.autorecording p/g/all/off`
        });
    },
};
