const axios = require('axios');
module.exports = {
  name: 'captions',
  description: 'Get a random bio/caption idea.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://github.com/Blackstar-12/Bio/raw/main/Bio.txt', { timeout: 15000 });
      const lines = String(data || '').split('\n').filter(l => l.trim());
      const line = lines[Math.floor(Math.random() * lines.length)] || 'No captions available.';
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CAPTION*\n\n✨ ${line}` }, { quoted: msg });
    } catch (err) {
      const backup = '✨ Live life like a story worth telling.';
      await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CAPTION*\n\n${backup}` }, { quoted: msg });
    }
  },
};
