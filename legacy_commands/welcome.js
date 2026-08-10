const { handleWelcome } = require('../lib/welcome.js');
const { isWelcomeOn, getWelcomeMessage } = require('../lib/index.js');

module.exports = async function(sock, from, msg, isSenderAdmin, botData, saveBotData, args) {
    if (!isSenderAdmin) return sock.sendMessage(from, { text: '❌ *Admin only command!*' }, { quoted: msg });
    
    const matchText = args.join(' ');
    await handleWelcome(sock, from, msg, matchText);
};

async function handleJoinEvent(sock, id, participants) {
    const isWelcomeEnabled = await isWelcomeOn(id);
    if (!isWelcomeEnabled) return;
    
    const customMessage = await getWelcomeMessage(id);
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'No description available';
    
    const channelInfo = {
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363376877392804@newsletter',
                newsletterName: '𝗧𝗘𝗔𝗠-𝗕𝗟𝗔𝗖𝗞-𝗛𝗔T',
                serverMessageId: -1
            }
        }
    };

    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            let displayName = user;
            
            // Simplified display name logic for better performance
            const userParticipant = groupMetadata.participants.find((p) => p.id === participantString);
            if (userParticipant && userParticipant.name) {
                displayName = userParticipant.name;
            }

            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${user}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc);
            } else {
                const now = new Date();
                const timeString = now.toLocaleString('en-US', {
                    month: '2-digit', day: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: true
                });
                finalMessage = `👋 *Welcome @${user}!*\n\n` +
                                `Thank you for joining *${groupName}*! 🤖\n\n` +
                                `👥 *Join our community group:*\n` +
                                `https://chat.whatsapp.com/DM1JxxnOJFp0vsTHpej89M\n\n` +
                                `📢 *Follow our channel:*\n` +
                                `https://whatsapp.com/channel/0029VbDeTrNEKyZ9GlUude2R\n\n` +
                                `Type *.menu* to explore all commands!\n\n` +
                                `*Group Description:*\n${groupDesc}`;
            }

            // Send text message with mentions
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString],
                ...channelInfo
            });
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
}

module.exports.handleJoinEvent = handleJoinEvent;
