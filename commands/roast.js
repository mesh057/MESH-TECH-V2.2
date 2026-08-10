module.exports = {
  name: 'roast',
  description: 'Roast yourself or a mentioned member.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || msg.key.participant;
    const targetName = target ? `@${target.split('@')[0]}` : 'you';
    const roasts = [
      `${targetName}, you bring everyone so much joy... when you leave the room. 😏`,
      `${targetName}, I'd agree with you but then we'd both be wrong. 😌`,
      `${targetName}, you're not stupid; you just have bad luck thinking. 🧠`,
      `${targetName}, your secrets are safe with me... I never listen. 🤫`,
      `${targetName}, you have something on your chin... no, the 3rd one down. 😶`,
      `${targetName}, you bring everyone a lot of joy, when you leave. 🚪`,
      `${targetName}, I'd tell you a joke about UDP but you wouldn't get it. 📡`,
      `${targetName}, you're proof that evolution can go in reverse. 🐒`,
      `${targetName}, your Wi-Fi is stronger than your personality. 📶`,
      `${targetName}, even your GPS gave up on you. 🗺️`,
    ];
    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    await sock.sendMessage(jid, { text: `⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ROAST*\n\n🔥 ${roast}`, mentions: target ? [target] : undefined }, { quoted: msg });
  },
};
