'use strict';

const axios = require('axios');
const yts = require('yt-search');

module.exports = {
  name: 'song',
  aliases: ['play', 'music'],
  description: 'Search and download music from YouTube.',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return sock.sendMessage(jid, { text: '❌ Usage: .song <song name or link>' }, { quoted: msg });
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
      const res = await axios.get(`https://api.siputzx.my.id/api/d/ummy?url=${encodeURIComponent(url)}`).catch(() => null);
      const data = res?.data?.data?.audio;

      if (!data) {
        throw new Error('Downloader service is currently busy. Please try again later.');
      }

      await sock.sendMessage(jid, {
        audio: { url: data },
        mimetype: 'audio/mpeg',
        fileName: 'music.mp3'
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      console.error('Song Error:', e.message);
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
  }
};
