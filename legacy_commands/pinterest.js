const axios = require('axios');

module.exports = async function(session, from, msg) {
    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
    const args = body.split(/ +/).slice(1);
    const query = args.join(' ').trim();

    if (!query) {
        return session.safeSendMessage(from, { text: '📌 *Pinterest Search*\n\nUsage: .pinterest <search term>' }, { quoted: msg });
    }

    try {
        await session.safeSendMessage(from, { react: { text: '⌛', key: msg.key } });
        
        const response = await axios.get(`https://api.theresav.biz.id/search/pinterest?query=${encodeURIComponent(query)}&type=image&apikey=tIdZJ`);
        const data = response.data;

        if (!data.status || !data.result || data.result.length === 0) {
            throw new Error('No results found.');
        }

        const images = data.result.filter(img => img && img.directLink).slice(0, 5);
        
        for (const img of images) {
            await session.safeSendMessage(from, { 
                image: { url: img.directLink }, 
                caption: `📌 *Pinterest:* ${query}` 
            }, { quoted: msg });
        }
        
        await session.safeSendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (err) {
        console.error('Pinterest error:', err.message);
        await session.safeSendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
        await session.safeSendMessage(from, { react: { text: '❌', key: msg.key } });
    }
};
