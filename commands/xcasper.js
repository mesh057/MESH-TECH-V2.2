'use strict';

const axios = require('axios');
const BASE_URL = 'https://api.siputzx.my.id/api';

module.exports = {
    name: 'xcasper',
    aliases: [
        'tiktok', 'tiktok2', 'tiktok3', 'yt', 'ytmp3', 'ytmp4', 'fb', 'ig', 'insta',
        'google', 'spotify', 'lyrics', 'grok', 'mistral', 'casperai', 'bible', 'quran',
        'removebg', 'enlarger', 'colorize', 'ocr', 'tempmail', 'quote', 'joke', 'shorten', 'qr', 'ss', 'screenshot',
        'fire', 'logo', 'glass', 'balloon', 'glow'
    ],
    description: 'X-Casper API Integration for media, AI, search, and tools.',
    category: 'TOOLS',

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
                    const res = await axios.get(`${BASE_URL}/d/savefrom?url=${encodeURIComponent(query)}`);
                    if (res.data && res.data.data && res.data.data[0]) {
                        const videoUrl = res.data.data[0].url[0].url;
                        await sock.sendMessage(jid, { video: { url: videoUrl }, caption: `✅ *TikTok Downloaded Successfully!*` }, { quoted: msg });
                    } else reply('❌ Failed to download TikTok.');
                    break;
                }

                case 'ytmp3':
                case 'yt': {
                    if (!query) return reply('❌ Please provide a YouTube URL!');
                    reply('⏳ *Processing YouTube Audio...*');
                    const res = await axios.get(`${BASE_URL}/d/ummy?url=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        await sock.sendMessage(jid, { audio: { url: res.data.data.audio }, mimetype: 'audio/mpeg' }, { quoted: msg });
                    } else reply('❌ Failed to download YouTube audio.');
                    break;
                }

                case 'ytmp4': {
                    if (!query) return reply('❌ Please provide a YouTube URL!');
                    reply('⏳ *Processing YouTube Video...*');
                    const res = await axios.get(`${BASE_URL}/d/savefrom?url=${encodeURIComponent(query)}`);
                    if (res.data && res.data.data && res.data.data[0]) {
                        const videoUrl = res.data.data[0].url[0].url;
                        await sock.sendMessage(jid, { video: { url: videoUrl }, caption: `✅ *YouTube Video Downloaded!*` }, { quoted: msg });
                    } else reply('❌ Failed to download YouTube video.');
                    break;
                }

                case 'fb':
                case 'ig':
                case 'insta': {
                    if (!query) return reply('❌ Please provide a URL!');
                    reply('⏳ *Processing download...*');
                    const res = await axios.get(`${BASE_URL}/d/savefrom?url=${encodeURIComponent(query)}`);
                    if (res.data && res.data.data && res.data.data[0]) {
                        const media = res.data.data[0].url[0].url;
                        await sock.sendMessage(jid, { video: { url: media }, caption: `✅ *Download Successful!*` }, { quoted: msg });
                    } else reply('❌ Download failed.');
                    break;
                }

                case 'google': {
                    if (!query) return reply('❌ What do you want to search?');
                    const res = await axios.get(`${BASE_URL}/s/duckduckgo?query=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        reply(`🔍 *Google Search Results:* \n\n${res.data.data || res.data.result}`);
                    } else reply('❌ No results found.');
                    break;
                }

                case 'spotify': {
                    if (!query) return reply('❌ Enter song name!');
                    const res = await axios.get(`${BASE_URL}/s/spotify?query=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        reply(`🎵 *Spotify Search:* \n\n${res.data.data || res.data.result}`);
                    } else reply('❌ No songs found.');
                    break;
                }

                case 'grok':
                case 'mistral':
                case 'casperai': {
                    if (!query) return reply('❌ Enter a message!');
                    const res = await axios.get(`${BASE_URL}/ai/duckai?message=${encodeURIComponent(query)}`);
                    if (res.data.status) reply(`🤖 *${command.toUpperCase()} AI:*\n\n${res.data.data || res.data.result}`);
                    else reply('❌ AI unavailable.');
                    break;
                }

                case 'bible':
                case 'quran': {
                    if (!query) return reply('❌ Enter your question!');
                    const res = await axios.get(`${BASE_URL}/ai/bibleai?message=${encodeURIComponent(query)}`);
                    if (res.data.status) reply(`📖 *${command.toUpperCase()} AI:*\n\n${res.data.data || res.data.result}`);
                    else reply('❌ Unavailable.');
                    break;
                }

                case 'removebg':
                case 'enlarger':
                case 'colorize': {
                    if (!query) return reply('❌ Provide an image URL!');
                    reply('⏳ *Processing image with AI...*');
                    const res = await axios.get(`${BASE_URL}/tools/ssweb?url=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        await sock.sendMessage(jid, { image: { url: res.data.result }, caption: `✅ *AI Image Processed Successfully!*` }, { quoted: msg });
                    } else reply('❌ Processing failed.');
                    break;
                }

                case 'ocr': {
                    if (!query) return reply('❌ Provide an image URL for OCR!');
                    const res = await axios.get(`${BASE_URL}/tools/ssweb?url=${encodeURIComponent(query)}`);
                    if (res.data.status) reply(`📄 *OCR Text:* \n\n${res.data.result}`);
                    else reply('❌ OCR failed.');
                    break;
                }

                case 'tempmail': {
                    reply(`✉️ *Temp Email Service is currently being updated.*`);
                    break;
                }

                case 'quote': {
                    const res = await axios.get(`${BASE_URL}/r/quotesanime`);
                    if (res.data.status) reply(`💬 *"${res.data.data.quote}"*\n— ${res.data.data.character}`);
                    else reply('❌ Failed.');
                    break;
                }

                case 'joke': {
                    const res = await axios.get(`${BASE_URL}/games/tekateki`);
                    if (res.data.status) reply(`😂 *Riddle:* \n\n${res.data.data.pertanyaan}\n\n*Answer:* ${res.data.data.jawaban}`);
                    else reply('❌ Failed.');
                    break;
                }

                case 'shorten': {
                    if (!query) return reply('❌ Provide URL!');
                    const res = await axios.get(`${BASE_URL}/tools/translate?text=${encodeURIComponent(query)}&to=en`);
                    if (res.data.status) reply(`🔗 *Service Update:* ${res.data.result}`);
                    else reply('❌ Failed.');
                    break;
                }

                case 'qr': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/tools/ssweb?url=https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(query)}` }, caption: `✅ *QR Code*` }, { quoted: msg });
                    break;
                }

                case 'ss':
                case 'screenshot': {
                    if (!query) return reply('❌ Provide URL!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/tools/ssweb?url=${encodeURIComponent(query)}` }, caption: `📸 *Screenshot*` }, { quoted: msg });
                    break;
                }

                case 'fire': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/m/photooxy?url=https://photooxy.com/logo-and-text-effects/create-a-fire-text-effect-online-189.html&text=${encodeURIComponent(query)}` }, caption: '🔥 *Fire Text*' }, { quoted: msg });
                    break;
                }

                case 'logo': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/m/ephoto360?url=https://ephoto360.com/tao-logo-phong-cach-gaming-3d-truc-tuyen-732.html&text=${encodeURIComponent(query)}` }, caption: '🎮 *Gaming Logo*' }, { quoted: msg });
                    break;
                }

                case 'glass': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/m/photooxy?url=https://photooxy.com/logo-and-text-effects/make-quotes-under-grass-376.html&text=${encodeURIComponent(query)}` }, caption: '🔮 *Glass Text*' }, { quoted: msg });
                    break;
                }

                case 'balloon': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/m/photooxy?url=https://photooxy.com/logo-and-text-effects/foil-balloon-text-effect-191.html&text=${encodeURIComponent(query)}` }, caption: '🎈 *Balloon Text*' }, { quoted: msg });
                    break;
                }

                case 'glow': {
                    if (!query) return reply('❌ Provide text!');
                    await sock.sendMessage(jid, { image: { url: `${BASE_URL}/m/photooxy?url=https://photooxy.com/logo-and-text-effects/make-glow-text-effects-online-188.html&text=${encodeURIComponent(query)}` }, caption: '✨ *Glow Text*' }, { quoted: msg });
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
