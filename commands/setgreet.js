const fs = require('fs');
const path = require('path');

const greetPath = path.join(__dirname, '../config/greetings.json');

module.exports = {
  name: 'setgreet',
  description: 'Set a custom greeting message. Usage: .setgreet Welcome {user} to {group}!',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(jid, { text: '❌ Usage: .setgreet <message>\nPlaceholders: {user} {group}' }, { quoted: msg });
    }

    let greetings = {};
    if (fs.existsSync(greetPath)) greetings = JSON.parse(fs.readFileSync(greetPath, 'utf8'));
    greetings[jid] = text;
    fs.writeFileSync(greetPath, JSON.stringify(greetings, null, 2));

    await sock.sendMessage(jid, { text: `✅ Greeting message set:\n\n${text}` }, { quoted: msg });
  }
};
