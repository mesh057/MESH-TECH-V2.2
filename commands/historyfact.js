const axios = require('axios');
module.exports = {
  name: 'historyfact',
  aliases: ['hfact'],
  description: 'Fetch a random historical event that happened on this day.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const month = new Date().getMonth() + 1;
      const day = new Date().getDate();
      const { data } = await axios.get(`https://numbersapi.com/${month}/${day}/date?json`, { timeout: 15000 });
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *HISTORY FACT*\n\n📜 On ${month}/${day}:\n\n${data.text}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch history fact: ${err.message}` }, { quoted: msg });
    }
  },
};
