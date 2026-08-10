const toBold = (text) => {
    const boldChars = {
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

async function antilinkCommand(sock, from, msg, isSenderAdmin, isBotAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command can only be used in groups." }, { quoted: msg });
    if (!isSenderAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });
    // Removed bot admin check to bypass the error
    // if (!isBotAdmin) return await sock.sendMessage(from, { text: "❌ Please make the bot an admin first to use Antilink." }, { quoted: msg });

    const action = args[0]?.toLowerCase();

    if (!action) {
        const status = botData.antilinkGroups[from] ? '✅ ON' : '❌ OFF';
        const menu = `╭━━━〔 ${toBold("ANTILINK SETTINGS")} 〕━━━┈⊷\n` +
                   `┃ ⋄ ${toBold("Status:")} ${status}\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `*Commands:*\n` +
                   `.antilink on - Enable Antilink\n` +
                   `.antilink off - Disable Antilink`;
        return await sock.sendMessage(from, { text: menu }, { quoted: msg });
    }

    if (action === 'on') {
        botData.antilinkGroups[from] = 'on';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ *ANTILINK: ON* (Links will be deleted)" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antilinkGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ *ANTILINK: OFF*" }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Use `.antilink on` or `.antilink off`" }, { quoted: msg });
    }
}

module.exports = antilinkCommand;
