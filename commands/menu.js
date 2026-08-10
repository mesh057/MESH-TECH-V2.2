'use strict';

const fs = require('fs');
const path = require('path');
const menuModule = require(path.join(__dirname, '..', 'media', 'menu.js'));
const config = require('../config/config');

function detectTimezone(jid) {
  const senderNumber = String(jid || '').replace(/\D/g, '');
  if (senderNumber.startsWith('92')) return 'Asia/Karachi';
  if (senderNumber.startsWith('91')) return 'Asia/Kolkata';
  if (senderNumber.startsWith('1')) return 'America/New_York';
  return config.timezone || 'Africa/Nairobi';
}

module.exports = {
  name: 'menu',
  aliases: ['help'],
  category: 'SYSTEM',
  async execute(sock, msg, args, commands) {
    const jid = msg.key.remoteJid;
    const timezone = detectTimezone(msg.key.participant || jid);
    const userCount = Number(global.activeUserCount || 0);
    const caption = menuModule.getMenu(commands, timezone, userCount);
    const imagePath = path.join(__dirname, '..', 'media', 'TECH.jpg');

    if (fs.existsSync(imagePath)) {
      return sock.sendMessage(
        jid,
        { image: fs.readFileSync(imagePath), caption },
        { quoted: msg }
      );
    }

    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
