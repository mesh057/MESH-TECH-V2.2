'use strict';

const axios = require('axios');
const yts = require('yt-search');

module.exports = {
  name: 'video',
  aliases: ['ytmp4', 'ytvideo'],
  description: 'Search and download video from YouTube.',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return sock.sendMessage(jid, { text: '❌ Usage: .video <video name or link>' }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
      
      let url = query;
      if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
        const search = await yts(query);
        const video = search.videos?.[0];
        if (!video) return sock.sendMessage(jid, { text: '❌ No results found.' }, { quoted: msg });
        url = video.url;
      }

      await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

      // Primary API: Siputzx Ummy
      const res = await axios.get(`https://api.siputzx.my.id/api/d/savefrom?url=${encodeURIComponent(url)}`).catch(() => null);
      const data = res?.data?.data?.[0]?.url;

      if (!data) {
        throw new Error('Downloader service is currently busy. Please try again later.');
      }

      await sock.sendMessage(jid, {
        video: { url: data },
        caption: '✨ *Downloaded by MESH-TECH MD*',
        mimetype: 'video/mp4'
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      console.error('Video Error:', e.message);
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  }
};
