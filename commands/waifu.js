const axios = require('axios');
const UA = 'MESH-TECH-BOT/2.2 (whatsapp-bot; mesh057) node/22';
module.exports = {
  name: 'waifu',
  aliases: ['waifu'], description: 'Fetch a random waifu picture (nekos.best).',
  category: 'ANIME',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/waifu?amount=1', {
        headers: { 'User-Agent': UA, 'Referer': 'https://nekos.best/' },
        timeout: 20000,
      });
      const url = data?.results?.[0]?.url;
      if (!url) throw new Error('no result');
      await sock.sendMessage(jid, { image: { url }, caption: '🌸 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  🌸 WAIFU' }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch waifu image: ${err.message}` }, { quoted: msg });
    }
  },
};
