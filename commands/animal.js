const axios = require('axios');
module.exports = {
  name: 'animal',
  description: 'Fetch a random cute animal picture.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://api.thecatapi.com/v1/images/search', { timeout: 15000 });
      const { data: dogs } = await axios.get('https://dog.ceo/api/breeds/image/random', { timeout: 15000 });
      const url = Math.random() < 0.5 ? data[0]?.url : dogs.message;
      if (!url) throw new Error('no result');
      await sock.sendMessage(jid, { image: { url }, caption: '✏️ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ANIMAL*' }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch animal picture: ${err.message}` }, { quoted: msg });
    }
  },
};
