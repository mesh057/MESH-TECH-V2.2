function buildHelp(prefix = '.', state = {}) {
  const enabled = Boolean(state.enabled);
  const allChats = Boolean(state.allChats);
  return `👁️ *ViewOnce Auto-Forward Settings*\n\n🔹 *Current chat:* ${enabled ? '✅ ON' : '❌ OFF'}\n🔹 *Scope:* ${allChats ? '🌐 All groups + private chats' : '📍 This chat only'}\n\nUsage:\n▸ ${prefix}viewonce on - Enable for this group\n▸ ${prefix}viewonce off - Disable for this group\n▸ ${prefix}viewonce on all - Enable for all groups + private chats\n▸ ${prefix}viewonce off all - Disable for all\n▸ ${prefix}viewonce status - Show current status\n\nReply to a View Once photo or video with *${prefix}vv* to reveal it, or *${prefix}vv2* to save it as a document.`;
}

function chatList(store) {
  const value = store?.get('viewonceautoforwardChats', []);
  return Array.isArray(value) ? value : [];
}

function getState(store, jid) {
  const allChats = Boolean(store?.get('viewonceallchats', false));
  const enabled = allChats || chatList(store).includes(jid);
  return { enabled, allChats };
}

module.exports = {
  name: 'viewonce',
  aliases: ['viewoncesettings'],
  description: 'Configure ViewOnce auto-forwarding and show usage instructions.',
  buildHelp,
  getState,
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings;
    const prefix = String(store?.get('prefix', '.') || '.');
    const mode = String(args[0] || '').toLowerCase();
    const scope = String(args[1] || '').toLowerCase();

    if (mode === 'status' || !['on', 'off'].includes(mode)) {
      return sock.sendMessage(jid, { text: buildHelp(prefix, getState(store, jid)) }, { quoted: msg });
    }
    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can change ViewOnce settings.' }, { quoted: msg });
    }

    if (scope === 'all') {
      store?.set('viewonceallchats', mode === 'on');
      if (mode === 'off') store?.set('viewonceautoforwardChats', []);
    } else {
      const chats = new Set(chatList(store));
      if (mode === 'on') chats.add(jid);
      else chats.delete(jid);
      store?.set('viewonceautoforwardChats', [...chats]);
    }

    const state = getState(store, jid);
    return sock.sendMessage(jid, { text: buildHelp(prefix, state) }, { quoted: msg });
  },
};
