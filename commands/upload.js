const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function extractQuotedMedia(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  const type = (m) => m?.imageMessage ? 'imageMessage' : m?.videoMessage ? 'videoMessage' : m?.audioMessage ? 'audioMessage' : null;

  if (quoted && type(quoted)) {
    return {
      message: quoted,
      key: { remoteJid: msg.key.remoteJid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
    };
  }
  if (msg.message && type(msg.message)) {
    return { message: msg.message, key: msg.key };
  }
  return null;
}

module.exports = {
  name: 'upload',
  description: 'Upload a quoted image, video, or audio and get a link',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = extractQuotedMedia(msg);

    if (!target) {
      return await sock.sendMessage(jid, { text: 'Quote an image, video, or audio message.' }, { quoted: msg });
    }

    try {
      const buffer = await downloadMediaMessage(
        { key: target.key, message: target.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      if (buffer.length > 190 * 1024 * 1024) {
        return await sock.sendMessage(jid, { text: 'Media is too large (max ~190MB).' }, { quoted: msg });
      }

      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', buffer, { filename: 'file' });

      const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
      });

      await sock.sendMessage(jid, { text: `Media Link:-\n\n${res.data}` }, { quoted: msg });
    } catch (error) {
      console.error('[UPLOAD ERROR]', error);
      await sock.sendMessage(jid, { text: `Upload failed: ${error.message}` }, { quoted: msg });
    }
  },
};
