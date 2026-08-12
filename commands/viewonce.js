function buildHelp(prefix = '.') {
  return `👁️ *ViewOnce Auto-Forward Settings*\n\nUsage:\n▸ ${prefix}viewonce on - Enable for this group\n▸ ${prefix}viewonce off - Disable for this group\n▸ ${prefix}viewonce on all - Enable for all groups + private chats\n▸ ${prefix}viewonce off all - Disable for all\n▸ ${prefix}viewonce status - Show current status\n\nReply to a View Once photo or video with *${prefix}vv* to reveal it, or *${prefix}vv2* to save it as a document.`;
}

module.exports = {
  name: 'viewonce',
  aliases: ['viewoncesettings'],
  description: 'Show ViewOnce auto-forward settings and usage instructions.',
  buildHelp,
  async execute(sock, msg, args, resources = {}) {
    const jid = msg.key.remoteJid;
    const store = resources.settings;
    const prefix = String(store?.get('prefix', '.') || '.');
    const mode = String(args[0] || '').toLowerCase();
    if (mode === 'status' || !['on', 'off'].includes(mode)) {
      return sock.sendMessage(jid, { text: buildHelp(prefix) }, { quoted: msg });
    }
    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can change ViewOnce settings.' }, { quoted: msg });
    }
    const allChats = String(args[1] || '').toLowerCase() === 'all';
    store?.set('viewonceautoforward', mode === 'on');
    store?.set('viewonceallchats', allChats);
    return sock.sendMessage(jid, { text: `👁️ *ViewOnce Auto-Forward:* ${mode === 'on' ? '✅ ENABLED' : '❌ DISABLED'}${allChats ? ' for all groups and private chats' : ' for this group'}\n\nUse *${prefix}viewonce status* to view instructions.` }, { quoted: msg });
  },
};
