async function autoreactsCommand(sock, from, msg, isAdmin, botData, saveBotData, userId, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });
    
    if (!botData.autoReacts) botData.autoReacts = {};
    
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
        botData.autoReacts[userId] = true;
        saveBotData();
        await sock.sendMessage(from, { text: "✅ Auto-React Enabled!" }, { quoted: msg });
    } else if (action === 'off') {
        botData.autoReacts[userId] = false;
        saveBotData();
        await sock.sendMessage(from, { text: "❌ Auto-React Disabled!" }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Usage: .autoreacts [on/off]" }, { quoted: msg });
    }
}

module.exports = autoreactsCommand;
