const settings = require('../settings');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

function isOwner(senderId) {
    if (!senderId) return false;
    const owner = settings.ownerNumber + '@s.whatsapp.net';
    return jidNormalizedUser(senderId) === jidNormalizedUser(owner);
}

module.exports = isOwner;
