const axios = require('axios');
const yts = require('yt-search');

const BASE = 'https://apis.davidcyril.name.ng';

module.exports = async function(session, from, msg) {
    const sock = session.sock;
    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '').trim();
    const args = body.split(/ +/).slice(1);
    const query = args.join(' ').trim();

    if (!query)
        return session.safeSendMessage(from, { text: '🎵 *Song Downloader*\n\nUsage:\n.song <song name | YouTube link>' }, { quoted: msg });

    try {
        let videoUrl;
        let videoTitle;
        let videoThumbnail;
        let videoDuration;

        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query;
        } else {
            const { videos } = await yts(query);
            if (!videos?.length)
                return session.safeSendMessage(from, { text: '❌ No results found.' }, { quoted: msg });
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
            videoDuration = videos[0].timestamp;
        }

        await session.safeSendMessage(from, {
            image: { url: videoThumbnail || 'https://i.ytimg.com/vi/' + (videoUrl.split('v=')[1] || videoUrl.split('/').pop()) + '/hqdefault.jpg' },
            caption: `🎶 *${videoTitle || 'YouTube Song'}*\n⏱ ${videoDuration || 'Unknown'}\n\n⏳ Downloading audio...`
        }, { quoted: msg });

        let data;
        let retries = 3;
        while (retries > 0) {
            try {
                const response = await axios.get(`${BASE}/download/ytmp3?url=${encodeURIComponent(videoUrl)}`, { timeout: 30000 });
                data = response.data;
                const downloadUrl = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
                if (downloadUrl) break;
                else throw new Error('Invalid response from API');
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        const downloadUrl = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
        if (!downloadUrl) throw new Error('Could not retrieve download link after multiple attempts');

        await session.safeSendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${data?.result?.title || videoTitle || 'song'}.mp3`,
            ptt: false
        }, { quoted: msg });
    }
    catch (err) {
        console.error('Song plugin error:', err.message);
        if (err.message !== "Connection Closed") {
            await session.safeSendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg }).catch(() => {});
        }
    }
};
