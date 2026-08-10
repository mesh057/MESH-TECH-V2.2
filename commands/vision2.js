const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { KEITH_BASE } = require('../config/apis');

async function uploadToCatbox(buffer, filename) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, { filename });
  const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders() });
  return res.data;
}

module.exports = {
  name: 'vision2',
  aliases: ['imgai2', 'analyze2', 'geminivision'],
  description: 'Analyze an image with AI (quote an image)',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const question = args.join(' ').trim();

    if (!quoted?.imageMessage) {
      return await sock.sendMessage(jid, { text: '📌 Reply to an image message to analyze it' }, { quoted: msg });
    }
    if (!question) {
      return await sock.sendMessage(jid, { text: '❌ Provide a question/instruction!' }, { quoted: msg });
    }

    try {
      const buffer = await downloadMediaMessage(
        { key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant }, message: quoted },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      const imageUrl = await uploadToCatbox(buffer, 'image.jpg');

      await sock.sendMessage(jid, { react: { text: '🤖', key: msg.key } });
      await sock.sendMessage(jid, { text: 'A moment analyzing your image...' }, { quoted: msg });

      const res = await axios.get(
        `${KEITH_BASE}/ai/vision?image=${encodeURIComponent(imageUrl)}&q=${encodeURIComponent(question)}`
      );
      const result = res.data;

      if (!result?.status || !result?.result) {
        return await sock.sendMessage(jid, { text: '❌ No response from Vision AI' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: result.result }, { quoted: msg });
    } catch (error) {
      console.error('[VISION2 ERROR]', error);
      await sock.sendMessage(jid, { text: '❌ Failed to analyze image.' }, { quoted: msg });
    }
  },
};
