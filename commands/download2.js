/**
 * download2.js — download commands: mediafire, song2, img
 */
'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

function extractMediafire(url) {
  return axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, timeout: 20000 }).then(res => {
    const $ = cheerio.load(res.data);
    const dl = $('#downloadButton').attr('href') || $('a#download_link').attr('href');
    if (!dl) throw new Error('download link not found');
    const name = ($('.dl-btn-label').text() || '').trim() || 'mediafire_file';
    const size = ($('.download_link .details .size, .details .size').text() || '').trim();
    return { url: dl.trim(), name, size };
  });
}

module.exports = [
  {
    name: 'mediafire',
    aliases: ['mf'],
    description: 'Download a Mediafire file. Usage: .mediafire <url>',
    category: 'DOWNLOAD',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const url = (args[0] || '').trim();
      if (!url || !url.includes('mediafire')) {
        return await sock.sendMessage(jid, { text: '❌ Usage: `.mediafire <mediafire url>`' }, { quoted: msg });
      }
      await sock.sendMessage(jid, { text: '⏳ Fetching Mediafire link...' }, { quoted: msg });
      try {
        const { url: dl, name, size } = await extractMediafire(url);
        const ext = (name.split('.').pop() || '').toLowerCase();
        const docExt = ['pdf', 'doc', 'docx', 'zip', 'rar', 'apk', 'exe', 'txt', 'json', 'mp3', 'mp4'].includes(ext) ? ext : 'bin';
        const caption = `📥 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *MEDIAFIRE*\n\n📄 ${name}\n📦 ${size || 'unknown size'}`;
        if (['mp4', 'mkv', 'webm'].includes(ext)) {
          await sock.sendMessage(jid, { video: { url: dl }, caption, fileName: name }, { quoted: msg });
        } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          await sock.sendMessage(jid, { image: { url: dl }, caption }, { quoted: msg });
        } else if (['mp3', 'ogg', 'wav', 'm4a'].includes(ext)) {
          await sock.sendMessage(jid, { audio: { url: dl }, mimetype: 'audio/mpeg', caption }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { document: { url: dl }, fileName: name, mimetype: 'application/octet-stream', caption }, { quoted: msg });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed to download from Mediafire: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'song2',
    aliases: ['play2'],
    description: 'Download an audio song from YouTube (y2mate-style). Usage: .song2 <query or url>',
    category: 'DOWNLOAD',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const query = args.join(' ').trim();
      if (!query) return await sock.sendMessage(jid, { text: '❌ Usage: `.song2 <song name or YouTube URL>`' }, { quoted: msg });
      await sock.sendMessage(jid, { text: '⏳ Searching for your song...' }, { quoted: msg });
      try {
        const apiUrl = query.startsWith('http')
          ? `https://iamtkm.vercel.app/downloaders/ytmp3?url=${encodeURIComponent(query)}`
          : `https://iamtkm.vercel.app/search/youtube?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });
        const list = Array.isArray(data) ? data : (data?.data || data?.results || []);
        const first = list[0];
        if (!first) throw new Error('no result found');
        const dlUrl = first.url || first.link || first.audio || null;
        if (!dlUrl) throw new Error('download link unavailable');
        const title = first.title || 'Song';
        await sock.sendMessage(jid, { audio: { url: dlUrl }, mimetype: 'audio/mpeg', fileName: `${title.replace(/[^\w\s-]/g, '').slice(0, 40)}.mp3`, caption: `🎵 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *SONG*\n\n🎶 ${title}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed to download song: ${err.message}\n\nTry: .song https://youtube.com/watch?v=...` }, { quoted: msg });
      }
    },
  },
  {
    name: 'img',
    aliases: ['image'],
    description: 'Search and download images. Usage: .img <query> [count]',
    category: 'DOWNLOAD',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (args.length === 0) return await sock.sendMessage(jid, { text: '❌ Usage: `.img <query> [count]` (count 1-10)' }, { quoted: msg });
      const count = Math.min(Math.max(parseInt(args[args.length - 1], 10) || 3, 1), 10);
      const hasCount = !isNaN(parseInt(args[args.length - 1], 10));
      const query = (hasCount ? args.slice(0, -1) : args).join(' ');
      if (!query) return await sock.sendMessage(jid, { text: '❌ Usage: `.img <query> [count]`' }, { quoted: msg });
      try {
        const { data } = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, { timeout: 15000 });
        // DuckDuckGo Instant Answer: use RelatedTopics image URLs as a fallback-free source
        const urls = [];
        for (const topic of data.RelatedTopics || []) {
          if (topic.Icon?.URL) urls.push(topic.Icon.URL);
        }
        if (urls.length === 0) throw new Error('no images found');
        const pick = urls.slice(0, Math.min(count, urls.length));
        for (const u of pick) {
          await sock.sendMessage(jid, { image: { url: u }, caption: `🖼️ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *${query.toUpperCase()}*` }, { quoted: msg });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed to fetch images: ${err.message}\n\nTip: Try an anime API command like .waifu or .neko.` }, { quoted: msg });
      }
    },
  },
];
