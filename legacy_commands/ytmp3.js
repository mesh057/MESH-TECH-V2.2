'use strict';

const axios  = require('axios');
const playdl = require('play-dl');

const BASE = 'https://apis.davidcyril.name.ng';

module.exports = {
    commands:    ['ytmp3', 'ytvid-audio', 'ytaudio2'],
    description: 'Download YouTube audio as MP3 by URL',
    permission:  'public',
    group:       true,
    private:     true,

    run: async (session, message, args, { sender, contextInfo }) => {
        const url = args[0];
        if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)) {
            return session.safeSendMessage(sender, {
                text: '🎵 Please provide a valid YouTube URL.\nExample: `.ytmp3 https://youtu.be/dQw4w9WgXcQ`',
                contextInfo
            }, { quoted: message });
        }

        await session.safeSendMessage(sender, { text: '⏳ Fetching audio...', contextInfo }, { quoted: message });

        try {
            let title = 'Audio', artist = 'Unknown', duration = '';
            try {
                const info = await playdl.video_info(url);
                const d = info.video_details;
                title    = d.title || title;
                artist   = d.channel?.name || artist;
                duration = d.durationRaw || '';
            } catch {}

            let data;
            let retries = 3;
            while (retries > 0) {
                try {
                    const response = await axios.get(`${BASE}/download/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 30000 });
                    data = response.data;
                    const audioUrl = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
                    if (audioUrl) break;
                    else throw new Error('Invalid response from API');
                } catch (err) {
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            const audioUrl = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
            if (!audioUrl) throw new Error('Could not retrieve download link after multiple attempts');

            await session.safeSendMessage(sender, {
                audio:    { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt:      false,
                contextInfo
            }, { quoted: message });

            await session.safeSendMessage(sender, {
                text: `🎵 *${title}*\n🎤 ${artist}  •  ⏱ ${duration}`,
                contextInfo
            }, { quoted: message });

        } catch (err) {
            if (err.message !== "Connection Closed") {
                await session.safeSendMessage(sender, {
                    text: `❌ Audio download failed: ${err.message}`,
                    contextInfo
                }, { quoted: message }).catch(() => {});
            }
        }
    }
};
