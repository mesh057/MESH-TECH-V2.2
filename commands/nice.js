module.exports = {
  name: 'nice',
  description: 'Send a nice compliment to yourself or a mentioned member.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targetName = target ? `@${target.split('@')[0]}` : 'you';
    const compliments = [
      `${targetName}, you're an absolute legend! 🌟`,
      `${targetName}, your vibe is immaculate today! ✨`,
      `${targetName}, the world is lucky to have you! 🌍`,
      `${targetName}, keep shining like the star you are! ⭐`,
      `${targetName}, you make everything look easy! 💫`,
      `${targetName}, genuine and kind — rare combo! 💎`,
      `${targetName}, your energy is contagious! 🔋`,
    ];
    const line = compliments[Math.floor(Math.random() * compliments.length)];
    await sock.sendMessage(jid, { text: `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *NICE*\n\n💛 ${line}`, mentions: target ? [target] : undefined }, { quoted: msg });
  },
};
