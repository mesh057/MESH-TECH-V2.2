async function kickCommand(sock, from, msg, isSenderAdmin, isBotAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command can only be used in groups." }, { quoted: msg });
    if (!isSenderAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });
    if (!isBotAdmin) return await sock.sendMessage(from, { text: "❌ Please make the bot an admin first to use Kick." }, { quoted: msg });

    const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
    const contextInfo = messageContent?.extendedTextMessage?.contextInfo;
    let participant = contextInfo?.participant || contextInfo?.mentionedJid?.[0];

    if (!participant && args[0]) {
        participant = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }

    if (!participant) {
        return await sock.sendMessage(from, { text: "❌ Please reply to a user's message or mention them with `.kick` to remove them." }, { quoted: msg });
    }

    try {
        await sock.groupParticipantsUpdate(from, [participant], 'remove');
        await sock.sendMessage(from, { text: `✅ User @${participant.split('@')[0]} removed successfully.`, mentions: [participant] }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Failed to kick user: ${e.message}` }, { quoted: msg });
    }
}

module.exports = kickCommand;
