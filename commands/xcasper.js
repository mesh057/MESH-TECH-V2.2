'use strict';

const axios = require('axios');
const BASE_URL = 'https://apis.xcasper.space/api';

module.exports = {
    name: 'xcasper',
    aliases: [
        'tiktok', 'tiktok2', 'tiktok3', 'yt', 'ytmp3', 'ytmp4', 'fb', 'ig', 'insta',
        'google', 'spotify', 'lyrics', 'grok', 'mistral', 'casperai', 'bible', 'quran',
        'removebg', 'enlarger', 'colorize', 'ocr', 'tempmail', 'quote', 'joke', 'shorten', 'qr', 'ss', 'screenshot'
    ],
    description: 'X-Casper API Integration for media, AI, search, and tools.',

    async execute(sock, msg, args, resources) {
        const jid = msg.key.remoteJid;
        const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '').trim();
        const prefix = resources.settings?.get?.('prefix', '.') || '.';
        const command = text.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
        const query = args.join(' ');
        
        const reply = (txt) => sock.sendMessage(jid, { text: txt }, { quoted: msg });

        try {
            switch (command) {
                case 'tiktok':
                case 'tiktok2':
                case 'tiktok3': {
                    if (!query) return reply('❌ Please provide a TikTok URL!');
                    reply('⏳ *Processing TikTok download...*');
                    const endpoint = command === 'tiktok' ? '/tiktok-dl' : (command === 'tiktok2' ? '/tiktok-dl2' : '/tiktok-dl3');
                    const res = await axios.get(`${BASE_URL}${endpoint}?url=${encodeURIComponent(query)}`);
                    const data = res.data;
                    if (data.status) {
                        const videoUrl = data.data.video || data.data.nowm || data.data.no_watermark;
                        await sock.sendMessage(jid, { video: { url: videoUrl }, caption: `✅ *TikTok Downloaded Successfully!*` }, { quoted: msg });
                    } else reply('❌ Failed to download TikTok.');
                    break;
                }

                case 'ytmp3':
                case 'yt': {
                    if (!query) return reply('❌ Please provide a YouTube URL!');
                    reply('⏳ *Processing YouTube Audio...*');
                    const res = await axios.get(`${BASE_URL}/ytmp3?url=${encodeURIComponent(query)}`);
                    const data = res.data;
                    if (data.status) {
                        await sock.sendMessage(jid, { audio: { url: data.data.download }, mimetype: 'audio/mpeg' }, { quoted: msg });
                    } else reply('❌ Failed to download YouTube audio.');
                    break;
                }

                case 'ytmp4': {
                    if (!query) return reply('❌ Please provide a YouTube URL!');
                    reply('⏳ *Processing YouTube Video...*');
                    const res = await axios.get(`${BASE_URL}/ytmp4?url=${encodeURIComponent(query)}`);
                    const data = res.data;
                    if (data.status) {
                        await sock.sendMessage(jid, { video: { url: data.data.download }, caption: `✅ *YouTube Video Downloaded!*` }, { quoted: msg });
                    } else reply('❌ Failed to download YouTube video.');
                    break;
                }

                case 'fb':
                case 'ig':
                case 'insta': {
                    if (!query) return reply('❌ Please provide a URL!');
                    reply('⏳ *Processing download...*');
                    const endpoint = command === 'fb' ? '/fb-dl' : '/dl-ig';
                    const res = await axios.get(`${BASE_URL}${endpoint}?url=${encodeURIComponent(query)}`);
                    const data = res.data;
                    if (data.status) {
                        const media = data.data.url || data.data.download || (Array.isArray(data.data) ? data.data[0].url : null);
                        await sock.sendMessage(jid, { video: { url: media }, caption: `✅ *Download Successful!*` }, { quoted: msg });
                    } else reply('❌ Download failed.');
                    break;
                }

                case 'google': {
                    if (!query) return reply('❌ What do you want to search?');
                    const res = await axios.get(`${BASE_URL}/google?query=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        const results = res.data.data.map((r, i) => `*${i+1}. ${r.title}*\n🔗 ${r.link}`).join('\n\n');
                        reply(`🔍 *Google Search Results:* \n\n${results}`);
                    } else reply('❌ No results found.');
                    break;
                }

                case 'spotify': {
                    if (!query) return reply('❌ Enter song name!');
                    const res = await axios.get(`${BASE_URL}/search/spotify-search?q=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        const results = res.data.data.map((s, i) => `*${i+1}. ${s.title}*\n👤 ${s.artist}`).join('\n\n');
                        reply(`🎵 *Spotify Search:* \n\n${results}`);
                    } else reply('❌ No songs found.');
                    break;
                }

                case 'grok':
                case 'mistral':
                case 'casperai': {
                    if (!query) return reply('❌ Enter a message!');
                    const endpoint = command === 'grok' ? '/grok-ai' : (command === 'mistral' ? '/mistral-ai' : '/chatbot');
                    const res = await axios.get(`${BASE_URL}${endpoint}?message=${encodeURIComponent(query)}`);
                    if (res.data.status) reply(`🤖 *${command.toUpperCase()} AI:*\n\n${res.data.data.response || res.data.data}`);
                    else reply('❌ AI unavailable.');
                    break;
                }

                case 'bible':
                case 'quran': {
                    if (!query) return reply('❌ Enter your question!');
                    const endpoint = command === 'bible' ? '/bible-ai' : '/quran-ai';
                    const res = await axios.get(`${BASE_URL}${endpoint}?message=${encodeURIComponent(query)}`);
                    if (res.data.status) reply(`📖 *${command.toUpperCase()} AI:*\n\n${res.data.data.response || res.data.data}`);
                    else reply('❌ Unavailable.');
                    break;
                }

                case 'removebg':
                case 'enlarger':
                case 'colorize': {
                    if (!query) return reply('❌ Provide an image URL!');
                    reply('⏳ *Processing image with AI...*');
                    const endpoint = command === 'removebg' ? '/ai/removebg' : (command === 'enlarger' ? '/ai/enlarger' : '/ai/colorize');
                    const res = await axios.get(`${BASE_URL}${endpoint}?url=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        await sock.sendMessage(jid, { image: { url: res.data.data.url }, caption: `✅ *AI Image Processed Successfully!*` }, { quoted: msg });
                    } else reply('❌ Processing failed.');
                    break;
                }

                case 'ocr': {
                    if (!query) return reply('❌ Provide an image URL for OCR!');
                    const res = await axios.get(`${BASE_URL}/tools/ocr?url=${encodeURIComponent(query)}`);
                    if (res.data.status) reply(`📄 *OCR Text:* \n\n${res.data.data.text || res.data.data}`);
                    else reply('❌ OCR failed.');
                    break;
                }

                case 'tempmail': {
                    const res = await axios.get(`${BASE_URL}/tools/temp-mail`);
                    if (res.data.status) reply(`✉️ *Temp Email:* \n\`${res.data.data.email}\``);
                    else reply('❌ Failed.');
                    break;
                }

                case 'quote': {
                    const res = await axios.get(`${BASE_URL}/fun/quotes`);
                    if (res.data.status) reply(`💬 *"${res.data.data.quote}"*\n— ${res.data.data.author}`);
                    else reply('❌ Failed.');
                    break;
                }

                case 'joke': {
                    const res = await axios.get(`${BASE_URL}/fun/jokes`);
                    if (res.data.status) reply(`😂 *Joke:*\n\n${res.data.data.joke || res.data.data}`);
                    else reply('❌ Failed.');
                    break;
                }

                case 'shorten': {
                    if (!query) return reply('❌ Provide URL!');
                    const res = await axios.get(`${BASE_URL}/tools/shorten?url=${encodeURIComponent(query)}&provider=spoo.me`);
                    if (res.data.status) reply(`🔗 *Shortened:* ${res.data.data.shortened}`);
                    else reply('❌ Failed.');
                    break;
                }

                case 'qr': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/tools/qr?text=${encodeURIComponent(query)}` }, caption: `✅ *QR Code*` }, { quoted: msg });
                    break;
                }

                case 'ss':
                case 'screenshot': {
                    if (!query) return reply('❌ Provide URL!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/tools/screenshot?url=${encodeURIComponent(query)}` }, caption: `📸 *Screenshot*` }, { quoted: msg });
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`Error in ${command}:`, error.message);
            reply(`❌ Error: ${error.message}`);
        }
    }
};
