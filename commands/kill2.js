const { isSudo } = require('../utils/isSudo');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'kill2',
  aliases: ['kickall2', 'kick-all2'],
  description: 'Nuclear kick a remote group by invite link (Owner only)',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isSudo(msg)) {
      return;
    }

    const link = args[0];

    if (!link) {
      return await sock.sendMessage(
        jid,
        { text: 'Provide a valid group link. Ensure the bot is in that group with admin privileges!' },
        { quoted: msg }
      );
    }

    let groupId, groupName;

    try {
      const inviteCode = link.split('https://chat.whatsapp.com/')[1];
      const groupInfo = await sock.groupGetInviteInfo(inviteCode);
      groupId = groupInfo.id;
      groupName = groupInfo.subject;
    } catch {
      return await sock.sendMessage(
        jid,
        { text: 'Why are you giving me an invalid group link?' },
        { quoted: msg }
      );
    }

    try {
      const groupMetadata = await sock.groupMetadata(groupId);
      const botJid = jidNormalizedUser(sock.user.id);
      const participants = groupMetadata.participants
        .filter((p) => p.id !== botJid)
        .map((p) => p.id);

      await sock.sendMessage(jid, { text: `☠️ Initializing and preparing to kill ☠️ ${groupName}` }, { quoted: msg });

      await sock.groupSettingUpdate(groupId, 'announcement');
      await sock.removeProfilePicture(groupId);
      await sock.groupUpdateSubject(groupId, 'This group is no longer available 🚫');
      await sock.groupUpdateDescription(groupId, 'Removed by isaac order.');
      await sock.groupRevokeInvite(groupId);

      await sock.sendMessage(groupId, {
        text: `My owner has initiated a remote kill command.\nThis has triggered removal of all ${participants.length} group participants.\n\nGoodbye everyone! 👋`,
        mentions: participants,
      });

      await sock.groupParticipantsUpdate(groupId, participants, 'remove');
      await sock.sendMessage(groupId, { text: 'Goodbye group 👋' });
      await sock.groupLeave(groupId);

      await sock.sendMessage(jid, { text: '✅ Successfully killed the group.' }, { quoted: msg });
    } catch (error) {
      console.error('[KILL2 ERROR]', error);
      await sock.sendMessage(
        jid,
        { text: '❌ Kill command failed — bot is either not in that group, or not an admin.' },
        { quoted: msg }
      );
    }
  },
};
