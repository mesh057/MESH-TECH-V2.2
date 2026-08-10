/**
 * ownerutils.js — owner utility commands:
 * setbio, setname, setpp, changename, botname, shutdown, idcheck, checkme, numinfo, info, intro, channel
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function isOwner(msg, config) {
  const sender = msg.key.participant || msg.key.remoteJid;
  return sender === `${config.ownerNumber}@s.whatsapp.net` || msg.key.fromMe;
}

function ownerGuard(sock, jid, msg, config, cb) {
  if (!isOwner(msg, config)) {
    return sock.sendMessage(jid, { text: '❌ *Owner only.* This command is restricted to the bot owner.' }, { quoted: msg });
  }
  return cb();
}

module.exports = [
  {
    name: 'setbio',
    description: 'Set bot WhatsApp status/bio. Usage: .setbio <text>',
    category: 'OWNER',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      return ownerGuard(sock, jid, msg, async () => {
        const text = args.join(' ').trim();
        if (!text) return await sock.sendMessage(jid, { text: '❌ Usage: `.setbio <text>`' }, { quoted: msg });
        try {
          await sock.updateProfileStatus(text);
          await sock.sendMessage(jid, { text: `✅ *Bio updated to:*\n${text}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(jid, { text: `❌ Failed to update bio: ${err.message}` }, { quoted: msg });
        }
      });
    },
  },
  {
    name: 'setname',
    aliases: ['changename'],
    description: 'Set bot display name. Usage: .setname <name>',
    category: 'OWNER',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      return ownerGuard(sock, jid, msg, async () => {
        const text = args.join(' ').trim();
        if (!text) return await sock.sendMessage(jid, { text: '❌ Usage: `.setname <name>`' }, { quoted: msg });
        try {
          await sock.updateProfileName(text);
          await sock.sendMessage(jid, { text: `✅ *Name updated to:*\n${text}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(jid, { text: `❌ Failed to update name: ${err.message}` }, { quoted: msg });
        }
      });
    },
  },
  {
    name: 'setpp',
    description: 'Set bot profile picture. Reply to an image with .setpp',
    category: 'OWNER',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      return ownerGuard(sock, jid, msg, async () => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const isMedia = msg.message?.imageMessage;
        const isQuotedMedia = quoted?.imageMessage;
        if (!isMedia && !isQuotedMedia) {
          return await sock.sendMessage(jid, { text: '❌ Reply to an image with .setpp' }, { quoted: msg });
        }
        const target = isMedia ? msg : { key: { remoteJid: jid }, message: quoted };
        try {
          const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
          await sock.updateProfilePicture(sock.user.id, buffer);
          await sock.sendMessage(jid, { text: '✅ *Profile picture updated.*' }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(jid, { text: `❌ Failed to update profile picture: ${err.message}` }, { quoted: msg });
        }
      });
    },
  },
  {
    name: 'botname',
    description: 'Set bot name used in responses. Usage: .botname <name>',
    category: 'OWNER',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      return ownerGuard(sock, jid, msg, async () => {
        const text = args.join(' ').trim();
        if (!text) return await sock.sendMessage(jid, { text: `❌ Usage: \`.botname <name>\`\nCurrent: ${config.botName}` }, { quoted: msg });
        try {
          const settingsStore = require('../utils/settingsStore');
          settingsStore.set('botName', text);
          config.botName = text;
          await sock.sendMessage(jid, { text: `✅ *Bot name updated to:*\n${text}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
        }
      });
    },
  },
  {
    name: 'shutdown',
    description: 'Shut down the bot (owner only).',
    category: 'OWNER',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      return ownerGuard(sock, jid, msg, async () => {
        await sock.sendMessage(jid, { text: '👋 *Bot shutting down...* Goodbye!' }, { quoted: msg });
        setTimeout(() => process.exit(0), 1500);
      });
    },
  },
  {
    name: 'idcheck',
    description: 'Show the group/user JID and metadata identifiers.',
    category: 'TOOLS',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      const lines = [
        `🆔 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ID CHECK*`,
        `📍 Group/Chat JID: \`${jid}\``,
        `👤 Your JID: \`${sender}\``,
        `🤖 Bot JID: \`${sock.user?.id || 'unknown'}\``,
      ];
      if (jid.endsWith('@g.us')) {
        try {
          const meta = await sock.groupMetadata(jid);
          lines.push(`📛 Group Name: ${meta.subject}`);
          lines.push(`👥 Members: ${meta.participants.length}`);
          lines.push(`🔑 Owner JID: \`${meta.owner || 'unknown'}\``);
        } catch {}
      }
      await sock.sendMessage(jid, { text: lines.join('\n') }, { quoted: msg });
    },
  },
  {
    name: 'checkme',
    description: 'Check if you are registered/allowed to use the bot and your role.',
    category: 'TOOLS',
    async execute(sock, msg, config) {
      const jid = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      const owner = isOwner(msg, config);
      let role = '👥 PUBLIC USER';
      if (owner) role = '👑 BOT OWNER';
      await sock.sendMessage(jid, { text: `🆔 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CHECK ME*\n\n📍 You: \`${sender}\`\n🎭 Role: ${role}\n🟢 Status: ACTIVE` }, { quoted: msg });
    },
  },
  {
    name: 'numinfo',
    description: 'Fetch WhatsApp info about a number. Usage: .numinfo <number>',
    category: 'TOOLS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!args[0]) return await sock.sendMessage(jid, { text: '❌ Usage: `.numinfo <number>` (with country code, e.g. 254712345678)' }, { quoted: msg });
      const target = `${args[0].replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      try {
        const [result] = await sock.onWhatsApp(target);
        if (!result?.exists) {
          return await sock.sendMessage(jid, { text: '❌ This number is not registered on WhatsApp.' }, { quoted: msg });
        }
        let txt = `🆔 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *NUMBER INFO*\n\n📞 Number: \`${target}\`\n✅ Registered: YES\n🆔 JID: \`${result.jid}\``;
        try {
          const bio = await sock.fetchStatus(target);
          if (bio?.status) txt += `\n📝 Bio: ${bio.status}`;
          if (bio?.setAt) txt += `\n🕐 Bio set at: ${new Date(bio.setAt * 1000).toLocaleString()}`;
        } catch {}
        await sock.sendMessage(jid, { text: txt }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'info',
    description: 'Show bot information and stats.',
    category: 'TOOLS',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const up = Math.floor(process.uptime());
      const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60;
      const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      await sock.sendMessage(jid, { text: `ℹ️ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *BOT INFO*\n\n🤖 Name: MESH-TECH MD\n👑 Owner: @${require('../config/config').ownerNumber}\n⏳ Uptime: ${h}h ${m}m ${s}s\n💾 RAM: ${mem}MB\n📡 Status: ONLINE` }, { quoted: msg });
    },
  },
  {
    name: 'intro',
    description: 'Show an introduction about the bot.',
    category: 'FUN',
    async execute(sock, msg, config) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, { text: `🌟 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛 𝗠𝗗* — Introduction\n\nI am *${config.botName}*, a multipurpose WhatsApp bot built by *𝕄𝔼𝕊ℍ*.\n\nI can manage groups, download media, generate AI responses, play games, and much more.\n\n👑 Owner: @${config.ownerNumber}\n💬 Prefix: \`${config.prefix}\`\n🌐 GitHub: https://github.com/mesh057/MESH-TECH-V2.2\n\nUse \`${config.prefix}menu\` to see everything I can do!` }, { quoted: msg });
    },
  },
  {
    name: 'channel',
    description: 'Get the official MESH-TECH channel link.',
    category: 'FUN',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, { text: `📢 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *OFFICIAL CHANNEL*\n\nhttps://github.com/mesh057/MESH-TECH-V2.2\n\nJoin for updates, scripts and support!` }, { quoted: msg });
    },
  },
];
