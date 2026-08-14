'use strict';

const axios = require('axios');
const BASE_URL = 'https://apis.xcasper.space/api';

module.exports = {
    name: 'xcasper',
    aliases: [
        'tiktok', 'tiktok2', 'tiktok3', 'yt', 'ytmp3', 'ytmp4', 'fb', 'ig', 'insta',
        'google', 'spotify', 'lyrics', 'grok', 'mistral', 'casperai', 'shorten', 'qr', 'ss', 'screenshot'
    ],
    description: 'X-Casper API Integration for media, AI, and tools.',

    async execute(sock, msg, args, resources) {
        const jid = msg.key.remoteJid;
        const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '').trim();
        const prefix = resources.settings.get('prefix', '.');
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
                        await sock.sendMessage(jid, { video: { url: videoUrl }, caption: `✅ *TikTok Downloaded Successfully!*\n📌 *Title:* ${data.data.title || 'N/A'}` }, { quoted: msg });
                    } else {
                        reply('❌ Failed to download TikTok. Try another version (.tiktok2 or .tiktok3)');
                    }
                    break;
                }

                case 'ytmp3':
                case 'ytmp4':
                case 'yt': {
                    if (!query) return reply('❌ Please provide a YouTube URL!');
                    reply(`⏳ *Processing YouTube ${command === 'ytmp3' ? 'Audio' : 'Video'}...*`);
                    const endpoint = command === 'ytmp3' ? '/ytmp3' : '/ytmp4';
                    const res = await axios.get(`${BASE_URL}${endpoint}?url=${encodeURIComponent(query)}`);
                    const data = res.data;
                    if (data.status) {
                        if (command === 'ytmp3') {
                            await sock.sendMessage(jid, { audio: { url: data.data.download }, mimetype: 'audio/mpeg', fileName: `${data.data.title}.mp3` }, { quoted: msg });
                        } else {
                            await sock.sendMessage(jid, { video: { url: data.data.download }, caption: `✅ *YouTube Downloaded!*\n📌 *Title:* ${data.data.title}` }, { quoted: msg });
                        }
                    } else {
                        reply('❌ Failed to download YouTube media.');
                    }
                    break;
                }

                case 'fb':
                case 'ig':
                case 'insta': {
                    if (!query) return reply(`❌ Please provide a ${command === 'fb' ? 'Facebook' : 'Instagram'} URL!`);
                    reply(`⏳ *Processing ${command === 'fb' ? 'Facebook' : 'Instagram'} download...*`);
                    const endpoint = command === 'fb' ? '/fb-dl' : '/dl-ig';
                    const res = await axios.get(`${BASE_URL}${endpoint}?url=${encodeURIComponent(query)}`);
                    const data = res.data;
                    if (data.status) {
                        const media = data.data.url || data.data.download || (Array.isArray(data.data) ? data.data[0].url : null);
                        if (media) {
                            await sock.sendMessage(jid, { video: { url: media }, caption: `✅ *Download Successful!*` }, { quoted: msg });
                        } else {
                            reply('❌ Media not found.');
                        }
                    } else {
                        reply('❌ Download failed.');
                    }
                    break;
                }

                case 'google': {
                    if (!query) return reply('❌ What do you want to search on Google?');
                    const res = await axios.get(`${BASE_URL}/google?query=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        const results = res.data.data.map((r, i) => `*${i+1}. ${r.title}*\n🔗 ${r.link}\n📝 ${r.snippet}`).join('\n\n');
                        reply(`🔍 *Google Search Results for:* ${query}\n\n${results}`);
                    } else {
                        reply('❌ No results found.');
                    }
                    break;
                }

                case 'spotify': {
                    if (!query) return reply('❌ Enter song name for Spotify search!');
                    const res = await axios.get(`${BASE_URL}/search/spotify-search?q=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        const results = res.data.data.map((s, i) => `*${i+1}. ${s.title}*\n👤 *Artist:* ${s.artist}\n🔗 ${s.url}`).join('\n\n');
                        reply(`🎵 *Spotify Search Results:* \n\n${results}`);
                    } else {
                        reply('❌ No songs found.');
                    }
                    break;
                }

                case 'lyrics': {
                    if (!query) return reply('❌ Enter song name for lyrics!');
                    const res = await axios.get(`${BASE_URL}/search/spotify-lyrics?q=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        reply(`🎼 *Lyrics for:* ${query}\n\n${res.data.data.lyrics}`);
                    } else {
                        reply('❌ Lyrics not found.');
                    }
                    break;
                }

                case 'grok':
                case 'mistral':
                case 'casperai': {
                    if (!query) return reply('❌ Please enter a message for AI!');
                    const endpoint = command === 'grok' ? '/grok-ai' : (command === 'mistral' ? '/mistral-ai' : '/chatbot');
                    const res = await axios.get(`${BASE_URL}${endpoint}?message=${encodeURIComponent(query)}`);
                    if (res.data.status) {
                        reply(`🤖 *${command.toUpperCase()} AI:*\n\n${res.data.data.response || res.data.data}`);
                    } else {
                        reply('❌ AI is currently unavailable.');
                    }
                    break;
                }

                case 'shorten': {
                    if (!query) return reply('❌ Provide a URL to shorten!');
                    const res = await axios.get(`${BASE_URL}/tools/shorten?url=${encodeURIComponent(query)}&provider=spoo.me`);
                    if (res.data.status) {
                        reply(`🔗 *Shortened URL:* ${res.data.data.shortened}`);
                    } else {
                        reply('❌ Failed to shorten URL.');
                    }
                    break;
                }

                case 'qr': {
                    if (!query) return reply('❌ Provide text for QR code!');
                    const qrUrl = `${BASE_URL}/tools/qr?text=${encodeURIComponent(query)}`;
                    await sock.sendMessage(jid, { image: { url: qrUrl }, caption: `✅ *QR Code Generated for:* ${query}` }, { quoted: msg });
                    break;
                }

                case 'ss':
                case 'screenshot': {
                    if (!query) return reply('❌ Provide a URL for screenshot!');
                    const ssUrl = `${BASE_URL}/tools/screenshot?url=${encodeURIComponent(query)}`;
                    await sock.sendMessage(jid, { image: { url: ssUrl }, caption: `📸 *Screenshot of:* ${query}` }, { quoted: msg });
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
