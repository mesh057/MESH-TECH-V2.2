const config = require('../config/config');
const settingsStore = require('../utils/settingsStore');
const groupSettingsStore = require('../utils/groupSettingsStore');

function onOff(value) {
    return value ? '✅ ON' : '❌ OFF';
}

module.exports = {
    name: 'settings',
    description: "Shows the bot's current settings.",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

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
┣ AntiLinkAll: ${onOff(settingsStore.get('antilinkall', false))}
┣ AntiDelete: ${onOff(settingsStore.get('antidelete', false))}
┣ AntiEdit: ${onOff(settingsStore.get('antiedit', false))}
┣ AntiCall: ${onOff(settingsStore.get('anticall', false))}
┣ AntiBot: ${onOff(settingsStore.get('antibot', false))}
┣ AntiTag: ${onOff(settingsStore.get('antitag', false))}
┗ BadWord: ${onOff(settingsStore.get('badword', false))}

*🤖 Automation*
┣ AutoRead: ${onOff(settingsStore.get('autoread', false))}
┣ AutoLike: ${onOff(settingsStore.get('autolike', false))}
┣ AutoView: ${onOff(settingsStore.get('autoview', true))}
┣ AutoBio: ${onOff(settingsStore.get('autobio', false))}
┗ WelcomeGoodbye: ${onOff(settingsStore.get('welcomegoodbye', false))}

*💬 Bot Behaviour*
┣ AutoReply: ${onOff(settingsStore.get('autoreply', true))}
┣ GPTDM: ${onOff(settingsStore.get('gptdm', false))}
┣ Mode: 🌐 ${settingsStore.get('mode', 'public').toUpperCase()}
┣ Prefix: ${settingsStore.get('prefix', config.prefix)}
┣ MenuType: 📋 ${settingsStore.get('menutype', 'list').toUpperCase()}
┗ WAPresence: ${settingsStore.get('wapresence', false) ? '🟢 ONLINE' : '🔴 OFFLINE'}`;

        await sock.sendMessage(jid, { text }, { quoted: msg });
    },
};
