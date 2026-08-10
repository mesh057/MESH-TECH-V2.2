const axios = require('axios');
module.exports = {
  name: 'meme',
  description: 'Fetch a random meme.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://meme-api.com/gimme', { timeout: 20000 });
      const cap = '⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *𝗠𝗘𝗠𝗘*' + String.fromCharCode(10) + String.fromCharCode(10) + '🤣 ' + data.title + String.fromCharCode(10) + '(r/' + data.subreddit + ')';
      await sock.sendMessage(jid, { image: { url: data.url }, caption: cap }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch meme: ${err.message}` }, { quoted: msg });
    }
  },
};
