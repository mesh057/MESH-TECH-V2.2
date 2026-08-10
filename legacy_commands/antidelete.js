const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const moment = require('moment-timezone');

const REPORT_TZ = 'Africa/Nairobi'; // same timezone the rest of the bot uses
const nowStamp = () => moment().tz(REPORT_TZ).format('DD-MMM-YYYY hh:mm:ss A');

const messageStore = new Map();
const MAX_STORE_SIZE = 1000;
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

const toBold = (text) => {
    const boldChars = {
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝗅', 'y': '𝘆', 'z': '𝘇',
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝘀', 'T': '𝘁', 'U': '𝘂', 'V': '𝘃', 'W': '𝘄', 'X': '𝗅', 'Y': '𝘆', 'Z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

async function handleAntideleteCommand(sock, chatId, message, isAdmin, botData, saveBotData, userId, args) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: "❌ Only owner can use this command." }, { quoted: message });
    
    const match = args[0]?.toLowerCase();

    if (!match) {
        return sock.sendMessage(chatId, {
            text: `╭━━━〔 ${toBold("ANTI-DELETE SETUP")} 〕━━━┈⊷\n` +
                   `┃ ⋄ ${toBold("Status:")} ${botData.antiDelete[userId] ? '✅ Enabled' : '❌ Disabled'}\n` +
                   `┃\n` +
                   `┃ ⋄ ${toBold(".antidelete on")} - Enable\n` +
                   `┃ ⋄ ${toBold(".antidelete off")} - Disable\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷`
        }, {quoted: message});
    }

    if (match === 'on') {
        botData.antiDelete[userId] = true;
    } else if (match === 'off') {
        botData.antiDelete[userId] = false;
    } else {
        return sock.sendMessage(chatId, { text: '*Invalid command. Use .antidelete to see usage.*' }, {quoted:message});
    }

    saveBotData();
    return sock.sendMessage(chatId, { text: `*Antidelete ${match === 'on' ? 'enabled' : 'disabled'}*` }, {quoted:message});
}

async function storeMessage(message) {
    try {
        if (!message.key?.id) return;
        
        // Don't store protocol messages
        if (message.message?.protocolMessage) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        const sender = message.key.participant || message.key.remoteJid;

        const msg = message.message?.ephemeralMessage?.message || 
                    message.message?.viewOnceMessage?.message || 
                    message.message?.viewOnceMessageV2?.message || 
                    message.message;

        if (!msg) return;

        if (msg.conversation) {
            content = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
            content = msg.extendedTextMessage.text;
        } else {
            const downloadMedia = async (msgContent, type, ext) => {
            try {
                const stream = await downloadContentFromMessage(msgContent, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                    if (buffer.length > 50 * 1024 * 1024) break; // 50MB limit
                }
                const p = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
                await writeFile(p, buffer);
                return p;
            } catch (e) { 
                console.error(`Antidelete download error (${type}):`, e.message); 
                return '';
            }
        };

            if (msg.imageMessage) {
                mediaType = 'image';
                content = msg.imageMessage.caption || '';
                mediaPath = await downloadMedia(msg.imageMessage, 'image', 'jpg');
            } else if (msg.stickerMessage) {
                mediaType = 'sticker';
                mediaPath = await downloadMedia(msg.stickerMessage, 'sticker', 'webp');
            } else if (msg.videoMessage) {
                mediaType = 'video';
                content = msg.videoMessage.caption || '';
                mediaPath = await downloadMedia(msg.videoMessage, 'video', 'mp4');
            } else if (msg.audioMessage) {
                mediaType = 'audio';
                mediaPath = await downloadMedia(msg.audioMessage, 'audio', 'mp3');
            }
        }

        if (messageStore.size >= MAX_STORE_SIZE) {
            const firstKey = messageStore.keys().next().value;
            messageStore.delete(firstKey);
        }

        // message.messageTimestamp is WhatsApp's own send time (seconds since epoch) —
        // more accurate than capturing Date.now() here, which only reflects when
        // this bot instance happened to process the event.
        const sentAtMs = message.messageTimestamp
            ? Number(message.messageTimestamp) * 1000
            : Date.now();

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            sentAtMs
        });
    } catch (err) {}
}

async function handleMessageRevocation(sock, message) {
    try {
        const protocolMsg = message.message?.protocolMessage;
        if (!protocolMsg || protocolMsg.type !== 0) return; // 0 is REVOKE

        const messageId = protocolMsg.key.id;
        const original = messageStore.get(messageId);
        if (!original) return;

        const botOwner = jidNormalizedUser(sock.user.id);
        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const groupJid = original.group;
        
        let report = `╭━━━〔 ${toBold("ANTI-DELETE REPORT")} 〕━━━┈⊷\n` +
                     `┃ 👤 ${toBold("Sender:")} @${senderName}\n` +
                     `┃ 🕒 ${toBold("Sent At:")} ${original.sentAtMs ? moment(original.sentAtMs).tz(REPORT_TZ).format('DD-MMM-YYYY hh:mm:ss A') : 'Unknown'}\n` +
                     `┃ 🗑️ ${toBold("Deleted/Detected At:")} ${nowStamp()}\n` +
                     `┃ 📂 ${toBold("Type:")} ${original.mediaType || 'Text'}\n`;
        
        if (groupJid) {
            report += `┃ 👥 ${toBold("Group:")} ${groupJid}\n`;
        }
        
        report += `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n`;

        if (original.content) {
            report += `📝 ${toBold("Message Content:")}\n${original.content}`;
        }

        // Send report to bot owner's DM
        await sock.sendMessage(botOwner, { text: report, mentions: [sender] });

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = { caption: `*Deleted ${original.mediaType}* from @${senderName}`, mentions: [sender] };
            if (original.mediaType === 'image') await sock.sendMessage(botOwner, { image: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'sticker') await sock.sendMessage(botOwner, { sticker: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'video') await sock.sendMessage(botOwner, { video: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'audio') await sock.sendMessage(botOwner, { audio: { url: original.mediaPath }, mimetype: 'audio/mp4', ...mediaOptions });
            
            setTimeout(() => {
                try { if (fs.existsSync(original.mediaPath)) fs.unlinkSync(original.mediaPath); } catch (err) {}
            }, 5000);
        }
        messageStore.delete(messageId);
    } catch (err) {
        console.error('Antidelete revocation error:', err);
    }
}

module.exports = handleAntideleteCommand;
module.exports.storeMessage = storeMessage;
module.exports.handleMessageRevocation = handleMessageRevocation;
