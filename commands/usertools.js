const https = require('https');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { isOwner } = require('../utils/isOwner');

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = [

  // ── BLOCK ───────────────────────────────────────────────────────────────────
  {
    name: 'block',
    description: 'Block a user. Usage: .block @user (or reply to their message)',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant;

      if (!target) {
        return sock.sendMessage(jid, { text: '❌ Tag or reply to the user you want to block.' }, { quoted: msg });
      }

      try {
        await sock.updateBlockStatus(target, 'block');
        await sock.sendMessage(jid, { text: `🚫 Blocked @${target.split('@')[0]}.`, mentions: [target] }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not block user: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── UNBLOCK ─────────────────────────────────────────────────────────────────
  {
    name: 'unblock',
    description: 'Unblock a user. Usage: .unblock 254712345678',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const number = args[0]?.replace(/[^0-9]/g, '');

      if (!number) {
        return sock.sendMessage(jid, { text: '❌ Usage: .unblock 254712345678' }, { quoted: msg });
      }

      try {
        const targetJid = `${number}@s.whatsapp.net`;
        await sock.updateBlockStatus(targetJid, 'unblock');
        await sock.sendMessage(jid, { text: `✅ Unblocked +${number}.` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not unblock user: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── PP ─────────────────────────────────────────
{
    name: 'pp',
    description: "Get a user's profile picture. Usage: .pp @user (or reply to their message)",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        const target =
            ctx?.mentionedJid?.[0] ||
            ctx?.participantAlt ||
            ctx?.participant ||
            msg.key.participant ||
            msg.key.remoteJid;

        console.log({
            target,
            participant: ctx?.participant,
            participantAlt: ctx?.participantAlt,
            mentioned: ctx?.mentionedJid
        });

        try {
            const ppUrl = await sock.profilePictureUrl(target, 'image');

            console.log("Profile Picture URL:", ppUrl);

            if (!ppUrl) {
                return await sock.sendMessage(
                    jid,
                    { text: '❌ No profile picture found.' },
                    { quoted: msg }
                );
            }

            await sock.sendMessage(
                jid,
                {
                    image: { url: ppUrl },
                    caption: `🖼 Profile picture of @${target.split('@')[0]}`,
                    mentions: [target]
                },
                { quoted: msg }
            );

        } catch (err) {
            console.log("PP ERROR:", err);

            await sock.sendMessage(
                jid,
                {
                    text: `❌ Couldn't fetch profile picture.\n\n${err.message}`
                },
                { quoted: msg }
            );
        }
    }
},

  // ── FULLPP ──
  {
    name: 'fullpp',
    description: "Set your WhatsApp profile picture from a replied image. Usage: reply to an image with .fullpp",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (!msg.key.fromMe) {
        return sock.sendMessage(jid, { text: '❌ Only the owner can change the profile picture.' }, { quoted: msg });
      }

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;

      if (!quoted?.imageMessage) {
        return sock.sendMessage(jid, { text: '❌ Reply to an image with .fullpp' }, { quoted: msg });
      }

      try {
        const media = await downloadMediaMessage(
          { message: quoted, key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant } },
          'buffer',
          {}
        );

        await sock.updateProfilePicture(sock.user.id, media);
        await sock.sendMessage(jid, { text: '✅ Profile picture updated.' }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not update profile picture: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── JID ───────────────────────────────────────────────
  {
    name: 'jid',
    description: 'Get your own or a tagged user\'s JID. Usage: .jid or .jid @user',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant || (msg.key.participant || msg.key.remoteJid);

      await sock.sendMessage(jid, { text: `🆔 *JID:*\n${target}` }, { quoted: msg });
    }
  },

  // ── GJID ──────────────────────────────────────────────
  {
    name: 'gjid',
    description: "Get the current group's JID.",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }
      await sock.sendMessage(jid, { text: `🆔 *Group JID:*\n${jid}` }, { quoted: msg });
    }
  },

   // ── LEFT ─────────────────────────────────────────────
  {
    name: 'left',
    description: 'Make the bot leave the current group.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(
          jid,
          { text: '❌ This command only works in groups.' },
          { quoted: msg }
        );
      }

      if (!isOwner(msg)) {
        return sock.sendMessage(
          jid,
          { text: '❌ Only the bot owner can use this command.' },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        jid,
        { text: '😡 Goodbye idiots! Bot is leaving this group now.' },
        { quoted: msg }
      );

      await sock.groupLeave(jid);
    }
  },
];
