'use strict';

const path = require('path');
const menuModule = require(path.join(__dirname, '..', 'media', 'menu.js'));

module.exports = {
  name: 'menu',
  async execute(sock, msg, args, commands) {
    const config = require('../config/config');
    const timezone = config.timezone || 'Africa/Nairobi';
    const userCount = Number(global.activeUserCount || 0);
    const caption = menuModule.getMenu(commands, timezone, userCount);
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: caption },
      { quoted: msg }
    );
  },
};
