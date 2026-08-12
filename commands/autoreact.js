const config = require('../config/config');

const DEFAULT_EMOJIS = ['💖', '❤️', '✨'];

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmojis(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return values.map((emoji) => String(emoji).trim()).filter(Boolean);
}

function buildHelp(prefix, enabled, emojis) {
  const configured = normalizeEmojis(emojis);
  const marks = (configured.length ? configured : DEFAULT_EMOJIS).join(', ');
  return `*💖 MESH-TECH AUTO-REACT*\n\nAutomatically reacts to new incoming messages with a random configured emoji.\n\n🔹 *Enabled:* ${enabled ? '✅ ON' : '❌ OFF'}\n🔹 *Emojis:* ${marks}\n\n*Usage:*\n▸ ${prefix}autoreact on — Enable auto-react\n▸ ${prefix}autoreact off — Disable auto-react\n▸ ${prefix}autoreact emojis 💖,❤️,✨ — Set reaction emojis\n▸ ${prefix}autoreact status — Show current settings\n\n_This setting is isolated to the connected MESH-TECH bot instance._`;
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
  buildHelp,
  normalizeEmojis,
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings;
    const prefix = String(store?.get('prefix', config.prefix) || config.prefix || '.');
    const enabled = Boolean(store?.get('autoreact', false));
    const emojis = normalizeEmojis(store?.get('autoreactemojis', DEFAULT_EMOJIS));
    const mode = String(args[0] || '').toLowerCase();

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the configured MESH-TECH owner can change auto-react settings.' }, { quoted: msg });
    }

    if (mode === 'on' || mode === 'off') {
      store.set('autoreact', mode === 'on');
      return sock.sendMessage(jid, {
        text: `💖 *MESH-TECH Auto-React:* ${mode === 'on' ? '✅ ENABLED' : '❌ DISABLED'}\n\nUse *${prefix}autoreact status* to view settings.`,
      }, { quoted: msg });
    }

    if (mode === 'emojis') {
      const next = normalizeEmojis(args.slice(1).join(' '));
      if (!next.length) return sock.sendMessage(jid, { text: buildHelp(prefix, enabled, emojis) }, { quoted: msg });
      store.set('autoreactemojis', next);
      return sock.sendMessage(jid, { text: `💖 *MESH-TECH Auto-React emojis updated:* ${next.join(', ')}` }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: buildHelp(prefix, enabled, emojis) }, { quoted: msg });
  },
};
