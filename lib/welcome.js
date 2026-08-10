const { addWelcome, delWelcome } = require('./index');

async function handleWelcome(sock, chatId, message, matchText) {
    if (!matchText) {
        return sock.sendMessage(chatId, { 
            text: '👋 *Welcome Settings*\n\n' +
                  'Usage:\n' +
                  '• `.welcome on` - Enable default welcome\n' +
                  '• `.welcome off` - Disable welcome\n' +
                  '• `.welcome [message]` - Set custom message\n\n' +
                  'Variables:\n' +
                  '• `{user}` - Mention user\n' +
                  '• `{group}` - Group name\n' +
                  '• `{description}` - Group description'
        }, { quoted: message });
    }

    if (matchText.toLowerCase() === 'on') {
        await addWelcome(chatId, true, null);
        return sock.sendMessage(chatId, { text: '✅ *Welcome message enabled.*' }, { quoted: message });
    }

    if (matchText.toLowerCase() === 'off') {
        await delWelcome(chatId);
        return sock.sendMessage(chatId, { text: '✅ *Welcome message disabled.*' }, { quoted: message });
    }

    await addWelcome(chatId, true, matchText);
    return sock.sendMessage(chatId, { text: '✅ *Custom welcome message set successfully.*' }, { quoted: message });
}

module.exports = { handleWelcome };
