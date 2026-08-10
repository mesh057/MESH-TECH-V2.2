const { jidNormalizedUser } = require('@whiskeysockets/baileys');

async function isAdmin(sock, chatId, senderId) {
    if (!chatId.endsWith('@g.us')) return true;
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        
        // Direct ID match first
        const directMatch = participants.find(p => p.id === senderId);
        if (directMatch && (directMatch.admin === 'admin' || directMatch.admin === 'superadmin')) return true;

        // Normalized match if direct fails
        const senderNumber = jidNormalizedUser(senderId).split('@')[0].split(':')[0];
        const participant = participants.find(p => {
            const pId = jidNormalizedUser(p.id).split('@')[0].split(':')[0];
            const pLid = p.lid ? jidNormalizedUser(p.lid).split('@')[0].split(':')[0] : null;
            return pId === senderNumber || pLid === senderNumber;
        });
        
        return !!(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
    } catch (e) {
        return false;
    }
}

module.exports = { isAdmin };
