const https = require('https');
const { KEITH_BASE } = require('../config/apis');

const LYDIA_SYSTEM_PROMPT = `You are Lydia, a warm, witty, and easygoing chat companion inside a WhatsApp group.
You are friendly and casual, like chatting with a fun, clever friend. Keep replies short (1-4 sentences),
conversational, and natural for WhatsApp — emojis are fine but don't overdo it. You're supportive and
good-humored, but you don't role-play as a romantic or sexual partner, and you don't pretend to be human
if directly asked. If a message is inappropriate or asks you to do something harmful, gently decline and
steer the conversation elsewhere.`;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({ error: raw });
        }
      });
    }).on('error', reject);
  });
}

async function getLydiaReply(userMessage) {
  try {
    const combinedPrompt = `${LYDIA_SYSTEM_PROMPT}\n\nUser: ${userMessage}\nLydia:`;
    const encoded = encodeURIComponent(combinedPrompt);

    const res = await httpsGet(`${KEITH_BASE}/ai/gpt?q=${encoded}`);

    if (!res?.status || !res?.result) return null;

    return res.result
      .replace(/Keith AI/gi, 'Lydia')
      .replace(/Keithkeizzah/gi, 'ISAAC');
  } catch (err) {
    console.error('[lydiaChat] Error getting reply:', err.message);
    return null;
  }
}

module.exports = { getLydiaReply };
