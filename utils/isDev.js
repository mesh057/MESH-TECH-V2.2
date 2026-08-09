const DEV_NUMBERS = ['254746844168', '254718701810', '254740832308'];

function isDev(msg) {
  if (msg.key.fromMe) return true;

  const senderJid =
    msg.key.participantPn ||
    msg.key.participantAlt ||
    msg.key.participant ||
    msg.key.remoteJidAlt ||
    msg.key.remoteJid;

  const senderNumber = senderJid.split('@')[0].split(':')[0];

  return DEV_NUMBERS.includes(senderNumber);
}

module.exports = { isDev };
