module.exports = {
  name: 'isaac',
  description: "Shows the ISAAC owner's name, number, and premium services.",
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    const ownerName = '𝗜𝗦𝗔𝗔𝗖';
    const ownerNumber = '254754574642'; // digits only, with country code, no +

    const caption =
      `╭──〔 👑 ISAAC ASSISTANT 〕──╮\n` +
      `👤 *Owner:* ${ownerName}\n` +
      `📞 *Number:* +${ownerNumber}\n` +
      `🔗 *Chat:* https://wa.me/${ownerNumber}\n` +
      `╰──────────────────╯\n\n` +
      `🫪 *ISAAC — Premium Services*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🤖 *BOT SHOP*\n` +
      `▸ Anti-ban • Auto-reply • Multi-device\n` +
      `▸ Basic: $1 | Pro: $4 | Ultimate: $10\n\n` +
`🚫 *BAN REMOVAL*\n` +
      `▸ Permanent ban removal• spam protection\n` +
      `▸ Quick: ksh 250 only\n\n` +
      `🚀 *DEPLOYMENT*\n` +
      `▸ 5-min setup • DDoS protection\n` +
      `▸ Quick: ksh100/mo | Custom: ksh500/mo`;

    await sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
