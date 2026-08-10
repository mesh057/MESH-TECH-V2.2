const axios = require('axios');

module.exports = {
  name: 'video',
  aliases: ['ytv', 'ytmp4'],
  description: 'Download YouTube video (MP4). Usage: .video <video name or link>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ').trim();

    if (!text) {
      return sock.sendMessage(jid, { text: '🎬 Provide a video name or YouTube link!\nEg: .video Blinding Lights' }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '🎬', key: msg.key } });
      const searching = await sock.sendMessage(jid, { text: `🔍 Searching *${text}*...` }, { quoted: msg });

      let videoUrl, videoTitle;
      if (/(youtube\.com|youtu\.be)/i.test(text)) {
        videoUrl = text;
        videoTitle = 'YouTube Video';
      } else {
        const { KEITH_BASE } = require('../config/apis');
        const search = await axios.get(`${KEITH_BASE}/search/yts?query=${encodeURIComponent(text)}`);
        const videos = search.data?.result;
        if (!Array.isArray(videos) || videos.length === 0) {
          return sock.sendMessage(jid, { text: `❌ No results found for: *${text}*`, edit: searching.key });
        }
        videoUrl = videos[0].url;
        videoTitle = videos[0].title;
      }

      await sock.sendMessage(jid, { text: `😍 Found: *${videoTitle}*\n⏳ Downloading...`, edit: searching.key });

      const apiRes = await axios.get(
        `https://iamtkm.vercel.app/downloaders/ytmp4?apikey=tkm&url=${encodeURIComponent(videoUrl)}`,
        { timeout: 60000 }
      );
      const data = apiRes.data;

      if (!data.status || !data.data?.url) {
        return sock.sendMessage(jid, { text: '❌ Download failed. Try a different video.', edit: searching.key });
      }

      const finalTitle = data.data.title || videoTitle;
      const downloadUrl = data.data.url;
      const fileName = finalTitle.replace(/[\/\\:*?"<>|]/g, '').trim() + '.mp4';

      await sock.sendMessage(jid, { text: `✅ Downloading: *${finalTitle}*`, edit: searching.key });

      const head = await axios.head(downloadUrl, { timeout: 15000 }).catch(() => null);
      const size = head?.headers?.['content-length'];
      if (size && parseInt(size) > 150 * 1024 * 1024) {
        return sock.sendMessage(jid, { text: '❌ Video too large (>150MB). Try a shorter video.', edit: searching.key });
      }

      const dlRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 120000 });
      const buffer = Buffer.from(dlRes.data);

      await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', fileName, caption: `🎬 *${finalTitle}*` }, { quoted: msg });
      await sock.sendMessage(jid, { document: buffer, mimetype: 'video/mp4', caption: '*DOWNLOADED BY ISAAC-MD*', fileName }, { quoted: msg });
      await sock.sendMessage(jid, { text: `✅ Successfully downloaded! *${finalTitle}*`, edit: searching.key });
    } catch (err) {
      await sock.sendMessage(jid, { text: '❌ An error occurred. Try again.' }, { quoted: msg });
    }
  },
};
