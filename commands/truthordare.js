const axios = require('axios');
module.exports = {
  name: 'truthordare',
  aliases: ['tod'],
  description: 'Get a random Truth or Dare challenge.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const pick = Math.random() < 0.5 ? 'truth' : 'dare';
      const { data } = await axios.get(`https://api.truthordarebot.xyz/v1/${pick}`, { timeout: 15000 });
      const label = pick === 'truth' ? '🎭 TRUTH' : '🔥 DARE';
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *TRUTH OR DARE*\n\n${label}\n\n👉 ${data.question}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch truth or dare: ${err.message}` }, { quoted: msg });
    }
  },
};
