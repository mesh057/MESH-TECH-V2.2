'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'session',
  description: 'Get your Base64 SESSION_ID for persistence on Railway/Heroku.',

  async execute(sock, msg, args, resources) {
    const jid = msg.key.remoteJid;
    const isOwner = msg.key.fromMe; // Only the bot owner/instance owner can get the session

    if (!isOwner) {
        return sock.sendMessage(jid, { text: '❌ This command is restricted to the bot owner.' }, { quoted: msg });
    }

    try {
        const authDir = resources.authDir || path.join(__dirname, '../auth_sessions/main');
        const credsPath = path.join(authDir, 'creds.json');

        if (!fs.existsSync(credsPath)) {
            return sock.sendMessage(jid, { text: '❌ No credentials found to generate a session ID.' }, { quoted: msg });
        }

        const creds = fs.readFileSync(credsPath, 'utf-8');
        const base64 = Buffer.from(creds).toString('base64');
        const sessionId = `MESH-TECH;;;${base64}`;

        const text = `╭━━━〔 *SESSION RECOVERY* 〕━━━┈⊷\n` +
                     `┃ 🔑 *Your SESSION_ID is ready!*\n` +
                     `┃ \n` +
                     `┃ 📝 *Instructions:* \n` +
                     `┃ 1. Copy the long message below.\n` +
                     `┃ 2. Go to your Railway/VPS Dashboard.\n` +
                     `┃ 3. Add a new variable: \`SESSION_ID\`\n` +
                     `┃ 4. Paste the copied string as the value.\n` +
                     `┃ \n` +
                     `┃ 💡 *Why?* This prevents logouts after updates!\n` +
                     `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(jid, { text }, { quoted: msg });
        await sock.sendMessage(jid, { text: sessionId }, { quoted: msg });

    } catch (error) {
        await sock.sendMessage(jid, { text: `❌ Error generating session: ${error.message}` }, { quoted: msg });
    }
  },
};
