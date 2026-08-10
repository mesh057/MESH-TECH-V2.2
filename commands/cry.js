const axios = require('axios');
const UA = 'MESH-TECH-BOT/2.2 (whatsapp-bot; mesh057) node/22';
module.exports = {
  name: 'cry',
  description: 'Send a cry reaction gif (nekos.best).',
  category: 'REACT',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/cry?amount=1', {
        headers: { 'User-Agent': UA, 'Referer': 'https://nekos.best/' },
        timeout: 20000,
      });
      const gif = data?.results?.[0]?.url;
      if (!gif) throw new Error('no result');
      const mention = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      await sock.sendMessage(jid, { video: { url: gif }, gifPlayback: true, caption: mention ? `🪅 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *🪅 CRY* @${mention.split('@')[0]}` : `🪅 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *🪅 CRY*`, mentions: mention ? [mention] : undefined }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch cry gif: ${err.message}` }, { quoted: msg });
    }
  },
};
