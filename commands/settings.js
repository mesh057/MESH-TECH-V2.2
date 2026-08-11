const config = require('../config/config');
const settingsStore = require('../utils/settingsStore');
const groupSettingsStore = require('../utils/groupSettingsStore');

function onOff(value) {
    return value ? '✅ ON' : '❌ OFF';
}

module.exports = {
    name: 'settings',
    description: "Shows the bot's current settings.",
    async execute(sock, msg, args, resources = {}) {
        const jid = msg.key.remoteJid;
        const store = resources.settings || settingsStore;

        let antilinkOn = false;
    let antigmMode = 'N/A';
    if (jid.endsWith('@g.us')) {
        antilinkOn = groupSettingsStore.get(jid, 'antilink', false);
        antigmMode = groupSettingsStore.get(jid, 'antigm', 'off').toUpperCase();
    }

        const text = `╔══════════════════════╗
║     ⚙️  BOT SETTINGS
╚══════════════════════╝

*🔒 Security*
┣ AntiLink: ${onOff(antilinkOn)}
┣ AntiGM: ${antigmMode}
┣ AntiLinkAll: ${onOff(store.get('antilinkall', false))}
┣ AntiDelete: ${onOff(store.get('antidelete', false))}
┣ AntiEdit: ${onOff(store.get('antiedit', false))}
┣ AntiCall: ${onOff(store.get('anticall', false))}
┣ AntiBot: ${onOff(store.get('antibot', false))}
┣ AntiTag: ${onOff(store.get('antitag', false))}
┗ BadWord: ${onOff(store.get('badword', false))}

*🤖 Automation*
┣ AutoRead: ${onOff(store.get('autoread', false))}
┣ AutoLike: ${onOff(store.get('autolike', false))}
┣ AutoView: ${onOff(store.get('autoview', true))}
┣ AutoBio: ${onOff(store.get('autobio', false))}
┗ WelcomeGoodbye: ${onOff(store.get('welcomegoodbye', false))}

*💬 Bot Behaviour*
┣ AutoReply: ${onOff(store.get('autoreply', true))}
┣ GPTDM: ${onOff(store.get('gptdm', false))}
┣ Mode: 🌐 ${store.get('mode', 'public').toUpperCase()}
┣ Prefix: ${store.get('prefix', config.prefix)}
┣ MenuType: 📋 ${store.get('menutype', 'list').toUpperCase()}
┣ WAPresence: ${store.get('wapresence', false) ? '🟢 ONLINE' : '🔴 OFFLINE'}
┗ FakePresence: ${String(store.get('fakepresence', 'off')).toUpperCase()}`;

        await sock.sendMessage(jid, { text }, { quoted: msg });
    },
};
