module.exports = {
  name: 'harami',
  description: 'Get a playful Harami (rogue) remark.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targetName = target ? `@${target.split('@')[0]}` : 'you';
    const remarks = [
      `${targetName}, harami wewe! Saa hii unasema nini? 😤`,
      `${targetName}, unafanya kazi ya harami bila malipo! 🐒`,
      `${targetName}, harami number one! Hata simu yako imechoka! 📱`,
      `${targetName}, harami wa kizazi! Babu yako angekuwa na aibu! 👴`,
      `${targetName}, mtu wa harami kamili... hata mbwa anakuogopa! 🐕`,
      `${targetName}, harami level: OVER 9000! Wewe ni mtu wa ajabu! 🤯`,
      `${targetName}, harami kama wewe hapatikani hata kwa order! 📦`,
      `${targetName}, dunia ina harami lakini wewe ni wa kipekee! 🌍`,
    ];
    const remark = remarks[Math.floor(Math.random() * remarks.length)];
    await sock.sendMessage(jid, { text: `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *HARAMI*\n\n🔥 ${remark}`, mentions: target ? [target] : undefined }, { quoted: msg });
  },
};
