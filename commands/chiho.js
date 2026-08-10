module.exports = {
  name: 'chiho',
  description: 'Fetch a chiho anime picture (pollinations.ai).',
  category: 'ANIME',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent('Chiho, cute anime girl, high quality anime art')}${encodeURIComponent('')}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
      await sock.sendMessage(jid, { image: { url }, caption: `🌸 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CHIHO*` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch chiho image: ${err.message}` }, { quoted: msg });
    }
  },
};
