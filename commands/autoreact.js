const config = require('../config/config');

const DEFAULT_EMOJIS = ['💖', '❤️', '✨'];

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmojis(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return values.map((emoji) => String(emoji).trim()).filter(Boolean);
}

function buildHelp(prefix, currentMode, emojis) {
  const configured = normalizeEmojis(emojis);
  const marks = (configured.length ? configured : DEFAULT_EMOJIS).join(', ');
  return `╭━━━〔 *AUTO-REACT SETUP* 〕━━━┈⊷\n` +
         `┃ ⋄ *Status:* ${currentMode === 'off' || !currentMode ? '❌ Disabled' : '✅ Active (' + String(currentMode).toUpperCase() + ')'}\n` +
         `┃ ⋄ *Emojis:* ${marks}\n` +
         `┃\n` +
         `┃ ⋄ *${prefix}autoreact p* - Private DMs only\n` +
         `┃ ⋄ *${prefix}autoreact g* - Groups only\n` +
         `┃ ⋄ *${prefix}autoreact all* - Everywhere\n` +
         `┃ ⋄ *${prefix}autoreact off* - Disable\n` +
         `┃ ⋄ *${prefix}autoreact emojis 💖,❤️* - Set emojis\n` +
         `╰━━━━━━━━━━━━━━━━━━┈⊷`;
}

function isOwner(msg) {
  const sender = digits(msg?.key?.participant || msg?.key?.remoteJid);
  const owner = digits(config.ownerNumber);
  return Boolean(msg?.key?.fromMe || (owner && sender === owner));
}

module.exports = {
  name: 'autoreact',
  aliases: ['autoreacts'],
  description: 'Configure automatic reactions to incoming messages.',
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings;
    const prefix = String(store?.get('prefix', config.prefix) || config.prefix || '.');
    const currentMode = store?.get('autoreact', 'off');
    const emojis = normalizeEmojis(store?.get('autoreactemojis', DEFAULT_EMOJIS));
    const mode = String(args[0] || '').toLowerCase();

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the owner can change settings.' }, { quoted: msg });
    }

    if (['on', 'off', 'p', 'g', 'all'].includes(mode)) {
      let setMode = mode;
      if (mode === 'on') setMode = 'all';
      if (mode === 'off') setMode = false;
      
      store.set('autoreact', setMode);
      const label = setMode === 'all' ? 'Everywhere' : (setMode === 'p' ? 'Private' : (setMode === 'g' ? 'Groups' : 'OFF'));
      return sock.sendMessage(jid, { text: `✅ *Auto-React set to: ${label}*` }, { quoted: msg });
    }

    if (mode === 'emojis') {
      const next = normalizeEmojis(args.slice(1).join(' '));
      if (!next.length) return sock.sendMessage(jid, { text: buildHelp(prefix, currentMode, emojis) }, { quoted: msg });
      store.set('autoreactemojis', next);
      return sock.sendMessage(jid, { text: `✅ *Auto-React emojis updated:* ${next.join(', ')}` }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: buildHelp(prefix, currentMode, emojis) }, { quoted: msg });
  },
};
