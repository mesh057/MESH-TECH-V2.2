const fs = require('fs');
const path = require('path');
const settingsStore = require('../utils/settingsStore');

const listPath = path.join(__dirname, '../config/badwords.json');

function load() {
    if (fs.existsSync(listPath)) return JSON.parse(fs.readFileSync(listPath, 'utf8'));
    return [];
}
function save(list) {
    if (!fs.existsSync(path.dirname(listPath))) fs.mkdirSync(path.dirname(listPath), { recursive: true });
    fs.writeFileSync(listPath, JSON.stringify(list, null, 2));
}

module.exports = {
    name: 'badword',
    aliases: ['antibad'],
    description: 'Manage the bad word filter. Usage: .badword p|g|all|off|add|remove|list',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        const sub = args[0]?.toLowerCase();
        const currentMode = settingsStore.get('antiword', 'off');

        if (['on', 'off', 'p', 'g', 'all'].includes(sub)) {
            let setMode = sub;
            if (sub === 'on') setMode = 'all';
            if (sub === 'off') setMode = false;
            
            settingsStore.set('antiword', setMode);
            const label = setMode === 'all' ? 'Everywhere' : (setMode === 'p' ? 'Private' : (setMode === 'g' ? 'Groups' : 'OFF'));
            return sock.sendMessage(jid, { text: `✅ *Anti-Bad Words set to: ${label}*` });
        }
        
        if (sub === 'add') {
            const word = args[1]?.toLowerCase();
            if (!word) return sock.sendMessage(jid, { text: '❌ Usage: .badword add <word>' }, { quoted: msg });
            const list = load();
            if (!list.includes(word)) list.push(word);
            save(list);
            return sock.sendMessage(jid, { text: `✅ Added "${word}" to the bad word list.` }, { quoted: msg });
        }
        if (sub === 'remove') {
            const word = args[1]?.toLowerCase();
            if (!word) return sock.sendMessage(jid, { text: '❌ Usage: .badword remove <word>' }, { quoted: msg });
            save(load().filter(w => w !== word));
            return sock.sendMessage(jid, { text: `✅ Removed "${word}" from the bad word list.` }, { quoted: msg });
        }
        if (sub === 'list') {
            const list = load();
            return sock.sendMessage(jid, { text: list.length ? `📋 *Bad words:*\n${list.join(', ')}` : '📋 List is empty.' }, { quoted: msg });
        }

        return await sock.sendMessage(jid, {
            text: `╭━━━〔 *ANTI-BAD SETUP* 〕━━━┈⊷\n` +
                   `┃ ⋄ *Status:* ${currentMode === 'off' ? '❌ Disabled' : '✅ Active (' + String(currentMode).toUpperCase() + ')'}\n` +
                   `┃\n` +
                   `┃ ⋄ *.badword p* - Private DMs only\n` +
                   `┃ ⋄ *.badword g* - Groups only\n` +
                   `┃ ⋄ *.badword all* - Everywhere\n` +
                   `┃ ⋄ *.badword off* - Disable\n` +
                   `┃ ⋄ *.badword add <word>* - Add word\n` +
                   `┃ ⋄ *.badword list* - List words\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷`
        });
    },
};
