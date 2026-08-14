'use strict';

module.exports = {
  name: 'autoreplystatus',
  aliases: ['statusreply'],
  description: 'Control whether the bot automatically replies to statuses.',

  async execute(sock, msg, args, resources) {
    const { settings } = resources;
    const jid = msg.key.remoteJid;
    const mode = args[0]?.toLowerCase();
    const currentMode = settings.get('autoreplystatus', false);

    if (!mode || !['on', 'off', 'text'].includes(mode)) {
        return sock.sendMessage(jid, {
            text: `╭━━━〔 *STATUS REPLY SETUP* 〕━━━┈⊷\n` +
                   `┃ ⋄ *Status:* ${currentMode ? '✅ Enabled' : '❌ Disabled'}\n` +
                   `┃ ⋄ *Reply Text:* ${settings.get('statusreplytext', 'Nice status! ✅')}\n` +
                   `┃\n` +
                   `┃ ⋄ *.autoreplystatus on* - Enable\n` +
                   `┃ ⋄ *.autoreplystatus off* - Disable\n` +
                   `┃ ⋄ *.autoreplystatus text <your message>* - Set reply text\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: msg });
    }

    if (mode === 'text') {
        const text = args.slice(1).join(' ');
        if (!text) return sock.sendMessage(jid, { text: '❌ Please provide the text for the reply.' }, { quoted: msg });
        settings.set('statusreplytext', text);
        return sock.sendMessage(jid, { text: `✅ *Status reply text set to:* ${text}` }, { quoted: msg });
    }

    const setMode = mode === 'on';
    settings.set('autoreplystatus', setMode);
    
    await sock.sendMessage(jid, { text: `✅ *Auto Status Reply set to: ${setMode ? 'ON' : 'OFF'}*` }, { quoted: msg });
  },
};
