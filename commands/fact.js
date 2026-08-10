const axios = require('axios');
module.exports = {
  name: 'fact',
  description: 'Fetch a random interesting fact.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 15000 });
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *FACT*\n\n💡 ${data.text}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch fact: ${err.message}` }, { quoted: msg });
    }
  },
};
