const axios = require('axios');
module.exports = {
  name: 'quote',
  description: 'Fetch a random inspirational quote.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://zenquotes.io/api/random', { timeout: 15000 });
      const q = Array.isArray(data) ? data[0] : data;
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *𝗤𝗨𝗢𝗧𝗘*\n\n💭 "${q.q}"\n\n— ${q.a}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch quote: ${err.message}` }, { quoted: msg });
    }
  },
};
