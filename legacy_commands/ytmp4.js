'use strict';

const axios  = require('axios');
const playdl = require('play-dl');

const BASE = 'https://apis.davidcyril.name.ng';

module.exports = {
    commands:    ['ytmp4', 'ytvideo', 'ytv', 'yt', 'youtube'],
    description: 'Download YouTube video (up to 10 min)',
    permission:  'public',
    group:       true,
    private:     true,

    run: async (session, message, args, { sender, contextInfo }) => {
        const url = args[0];
        if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)) {
            return session.safeSendMessage(sender, {
                text: '🎬 Please provide a valid YouTube URL.\nExample: `.ytmp4 https://youtu.be/dQw4w9WgXcQ`',
                contextInfo
            }, { quoted: message });
        }

        await session.safeSendMessage(sender, { text: '⏳ Fetching video...', contextInfo }, { quoted: message });

        try {
            let title = 'Video', artist = 'Unknown', duration = '', durationSec = 0;
            try {
                const info = await playdl.video_info(url);
                const d = info.video_details;
                title       = d.title || title;
                artist      = d.channel?.name || artist;
                duration    = d.durationRaw || '';
                durationSec = d.durationInSec || 0;
            } catch {}

            if (durationSec > 600) {
                return session.safeSendMessage(sender, {
                    text: '❌ Video too long (max 10 minutes). Use `.play` for audio only.',
                    contextInfo
                }, { quoted: message });
            }

            let data;
            let retries = 3;
            while (retries > 0) {
                try {
                    const response = await axios.get(`${BASE}/download/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 30000 });
                    data = response.data;
                    const videoUrl = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
                    if (videoUrl) break;
                    else throw new Error('Invalid response from API');
                } catch (err) {
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            const videoUrl = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
            if (!videoUrl) throw new Error('Could not retrieve download link after multiple attempts');

            await session.safeSendMessage(sender, {
                video:   { url: videoUrl },
                caption: `▶️ *${title}*\n👤 ${artist}  •  ⏱ ${duration}`,
                contextInfo
            }, { quoted: message });

        } catch (err) {
            if (err.message !== "Connection Closed") {
                await session.safeSendMessage(sender, {
                    text: `❌ Video download failed: ${err.message}`,
                    contextInfo
                }, { quoted: message }).catch(() => {});
            }
        }
    }
};
