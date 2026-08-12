const config = require('../config/config');
const DEFAULT_EMOJIS = ['💛', '❤️', '💜', '🤍', '💙'];

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmojis(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list.map((emoji) => String(emoji).trim()).filter(Boolean);
}

function buildHelp(prefix, enabled, emojis) {
  const marks = normalizeEmojis(emojis).join(', ') || DEFAULT_EMOJIS.join(', ');
  return `*😍 Auto React Status*\n\nAutomatically reacts with an emoji to every status your contacts post.\n\n🔹 *Enabled:* ${enabled ? '✅ ON' : '❌ OFF'}\n🔹 *Emojis:* ${marks}\n\n*🛠 Usage:*\n▸ ${prefix}autoreactstatus on — Enable auto-react\n▸ ${prefix}autoreactstatus off — Disable auto-react\n▸ ${prefix}autoreactstatus emojis 👍,❤️,🔥,... — Set any number of reaction emojis\n▸ ${prefix}autoreactstatus status — Show current settings\n\n_Tip: Separate any number of emojis with commas. The list is saved exactly as entered. A random one will be picked for each status._`;
}

module.exports = {
  name: 'autoreactstatus',
  aliases: ['statusreact'],
  description: 'Configure automatic emoji reactions to WhatsApp statuses.',
  buildHelp,
  normalizeEmojis,
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings;
    const prefix = String(store?.get('prefix', '.') || '.');
    const enabled = Boolean(store?.get('autoreactstatus', false));
    const emojis = normalizeEmojis(store?.get('autoreactemojis', DEFAULT_EMOJIS));
    const mode = String(args[0] || '').toLowerCase();

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = digits(String(senderJid || '').split('@')[0]);
    const ownerNumber = digits(config.ownerNumber);
    const isOwner = Boolean(msg.key.fromMe || (ownerNumber && senderNumber === ownerNumber));
    if (!isOwner) {
      return sock.sendMessage(jid, { text: '❌ Only the configured bot owner can change auto-react status settings.' }, { quoted: msg });
    }
    if (mode === 'emojis') {
      const next = normalizeEmojis(args.slice(1).join(' '));
      if (!next.length) return sock.sendMessage(jid, { text: buildHelp(prefix, enabled, emojis) }, { quoted: msg });
      store.set('autoreactemojis', next);
      return sock.sendMessage(jid, { text: `😍 *Auto React Status emojis updated:* ${next.join(', ')}\n\nUse *${prefix}autoreactstatus status* to view settings.` }, { quoted: msg });
    }
    if (mode === 'on' || mode === 'off') {
      store.set('autoreactstatus', mode === 'on');
      return sock.sendMessage(jid, { text: `😍 *Auto React Status:* ${mode === 'on' ? '✅ ENABLED' : '❌ DISABLED'}\n\nUse *${prefix}autoreactstatus status* to view settings.` }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: buildHelp(prefix, enabled, emojis) }, { quoted: msg });
  },
};
