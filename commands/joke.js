const axios = require('axios');
module.exports = {
  name: 'joke',
  description: 'Fetch a random joke.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 15000 });
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *𝗝𝗢𝗞𝗘*\n\n🤣 ${data.setup}\n\n😂 ${data.punchline}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch joke: ${err.message}` }, { quoted: msg });
    }
  },
};
