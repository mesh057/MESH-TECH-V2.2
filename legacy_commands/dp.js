async function dpCommand(sock, from, msg, args = []) {
    try {
        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
        const quoted = messageContent?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedParticipant = messageContent?.extendedTextMessage?.contextInfo?.participant;
        const mentionedJid = messageContent?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const rawArg = (args || []).join('').replace(/\D/g, '');

        let targetJid = '';

        if (rawArg && rawArg.length >= 8) {
            // Explicit number given: .dp 254712345678 — works for anyone, no reply needed.
            targetJid = `${rawArg}@s.whatsapp.net`;
        } else if (msg.key.remoteJid.endsWith('@g.us')) {
            if (quoted && quotedParticipant) {
                targetJid = quotedParticipant;
            } else if (mentionedJid) {
                targetJid = mentionedJid;
            } else {
                targetJid = msg.key.participant || msg.participant;
            }
        } else {
            if (quoted && quotedParticipant) {
                targetJid = quotedParticipant;
            } else {
                targetJid = from;
            }
        }

        if (!targetJid) {
            return await sock.sendMessage(from, { text: "❌ Reply to someone, @mention them, or use .dp <number> to get their DP." }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});

        let profilePicUrl;
        try {
            profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            try {
                // Fallback to 'preview' if full image fails
                profilePicUrl = await sock.profilePictureUrl(targetJid, 'preview');
            } catch (e2) {
                return await sock.sendMessage(from, { text: "❌ No profile picture found or privacy settings prevent downloading." }, { quoted: msg });
            }
        }

        await sock.sendMessage(from, {
            image: { url: profilePicUrl },
            caption: `*Profile Picture — @${targetJid.split('@')[0]}*`,
            mentions: [targetJid]
        }, { quoted: msg });

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});

    } catch (err) {
        console.error('DP command error:', err.message);
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
}

module.exports = dpCommand;
