const axios = require('axios');
module.exports = {
  name: 'insult',
  description: 'Get a random creative insult.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://evilinsult.com/generate_insult.php?lang=en&type=json', { timeout: 15000 });
      await sock.sendMessage(jid, { text: `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *INSULT*\n\n🔥 ${data.insult}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch insult: ${err.message}` }, { quoted: msg });
    }
  },
};
