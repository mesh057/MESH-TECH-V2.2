const { uploadToUrl } = require('../lib/upload');
const axios = require('axios');
const FormData = require('form-data');

module.exports = async function(session, from, msg) {
    const sock = session.sock;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.imageMessage ? msg : null;
    
    // Check if there is a quoted image or the message itself is an image
    let messageToDownload = null;
    if (msg.message?.imageMessage) {
        messageToDownload = msg;
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        messageToDownload = {
            message: msg.message.extendedTextMessage.contextInfo.quotedMessage
        };
    }

    if (!messageToDownload) {
        return session.safeSendMessage(from, { text: '🖼️ *Remini AI*\n\nPlease reply to an image or send an image with .remini to enhance it.' }, { quoted: msg });
    }

    try {
        await session.safeSendMessage(from, { react: { text: '⌛', key: msg.key } });
        
        // Download media using Baileys downloadContentFromMessage (via session helper if available, or manually)
        // In this bot, we might need to implement a download helper if not present
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const stream = await downloadContentFromMessage(messageToDownload.message.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const imgUrl = await uploadToUrl(buffer);
        
        const form = new FormData();
        form.append('image', buffer, { filename: 'image.png', contentType: 'image/png' });
        form.append('scale', '2');
        form.append('apikey', 'tIdZJ');

        const response = await axios.post('https://api.theresav.biz.id/tools/hd', form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        await session.safeSendMessage(from, { 
            image: Buffer.from(response.data), 
            caption: '✨ *Enhanced by MESH-TECH AI*' 
        }, { quoted: msg });
        
        await session.safeSendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (err) {
        console.error('Remini error:', err.message);
        await session.safeSendMessage(from, { text: `❌ Failed to enhance image: ${err.message}` }, { quoted: msg });
        await session.safeSendMessage(from, { react: { text: '❌', key: msg.key } });
    }
};
