/**
 * grouputils.js — group utility commands:
 * kickall, promoteall, demoteall, closetime, tagadmin, ginfo, adminkill, antilinkick, antibug, leave
 */
'use strict';
const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

function groupOnly(sock, jid, msg) {
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
  }
  return null;
}

async function adminCheck(sock, jid, msg) {
  const metadata = await sock.groupMetadata(jid);
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isSenderAdmin(metadata, sender)) {
    await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    return null;
  }
  if (!isBotAdmin(sock, metadata)) {
    await sock.sendMessage(jid, { text: '❌ Make me an admin first!' }, { quoted: msg });
    return null;
  }
  return metadata;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = [
  {
    name: 'kickall',
    description: 'Remove all non-admin members from the group (admins only).',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await adminCheck(sock, jid, msg);
      if (!metadata) return;
      const bots = require('../utils/isAdmin').getBotIdentifiers(sock);
      const sender = msg.key.participant || msg.key.remoteJid;
      const targets = metadata.participants.filter(p => {
        if (p.admin) return false;
        const ids = [p.id, p.jid, p.lid, p.phoneNumber];
        if (ids.some(i => i && bots.has(String(i).replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '')))) return false;
        if (p.id === sender) return false;
        return true;
      });
      if (targets.length === 0) {
        return await sock.sendMessage(jid, { text: '✅ No members to remove.' }, { quoted: msg });
      }
      const mentions = targets.map(p => p.id);
      await sock.sendMessage(jid, { text: `⚠️ Removing ${targets.length} members...` }, { quoted: msg });
      for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5).map(p => p.id);
        try { await sock.groupParticipantsUpdate(jid, batch, 'remove'); } catch (e) {}
        await sleep(1200);
      }
      await sock.sendMessage(jid, { text: '✅ Done. All non-admin members removed.' }, { quoted: msg });
    },
  },
  {
    name: 'promoteall',
    description: 'Promote all members to admins (admin only).',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await adminCheck(sock, jid, msg);
      if (!metadata) return;
      const targets = metadata.participants.filter(p => !p.admin).map(p => p.id);
      if (targets.length === 0) return await sock.sendMessage(jid, { text: '✅ Everyone is already an admin.' }, { quoted: msg });
      for (let i = 0; i < targets.length; i += 5) {
        try { await sock.groupParticipantsUpdate(jid, targets.slice(i, i + 5), 'promote'); } catch (e) {}
        await sleep(1200);
      }
      await sock.sendMessage(jid, { text: `✅ Promoted ${targets.length} members.` }, { quoted: msg });
    },
  },
  {
    name: 'demoteall',
    description: 'Demote all admins except bot and sender (admin only).',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await adminCheck(sock, jid, msg);
      if (!metadata) return;
      const bots = require('../utils/isAdmin').getBotIdentifiers(sock);
      const sender = msg.key.participant || msg.key.remoteJid;
      const targets = metadata.participants.filter(p => {
        if (!p.admin) return false;
        const ids = [p.id, p.jid, p.lid];
        if (ids.some(i => i && bots.has(String(i).replace(/@s\.whatsapp\.net$/, '')))) return false;
        if (p.id === sender) return false;
        return true;
      }).map(p => p.id);
      if (targets.length === 0) return await sock.sendMessage(jid, { text: '✅ No other admins to demote.' }, { quoted: msg });
      for (let i = 0; i < targets.length; i += 5) {
        try { await sock.groupParticipantsUpdate(jid, targets.slice(i, i + 5), 'demote'); } catch (e) {}
        await sleep(1200);
      }
      await sock.sendMessage(jid, { text: `✅ Demoted ${targets.length} admins.` }, { quoted: msg });
    },
  },
  {
    name: 'closetime',
    description: 'Lock or unlock the group after a delay (minutes). Usage: .closetime <minutes> lock|unlock',
    category: 'GROUP',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await adminCheck(sock, jid, msg);
      if (!metadata) return;
      const mins = parseInt(args[0], 10);
      const action = (args[1] || 'lock').toLowerCase();
      if (!mins || mins < 1) return await sock.sendMessage(jid, { text: '❌ Usage: `.closetime <minutes> lock|unlock`' }, { quoted: msg });
      await sock.sendMessage(jid, { text: `⏳ Group will be *${action}ed* in ${mins} minute(s).` }, { quoted: msg });
      setTimeout(async () => {
        try {
          await sock.groupSettingUpdate(jid, action === 'unlock' ? 'not_announcement' : 'announcement');
          await sock.sendMessage(jid, { text: `🔒 Group *${action}ed* as scheduled.` });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Failed to ${action} group: ${e.message}` });
        }
      }, mins * 60 * 1000);
    },
  },
  {
    name: 'tagadmin',
    description: 'Tag all group admins.',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await sock.groupMetadata(jid);
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
      if (admins.length === 0) return await sock.sendMessage(jid, { text: '❌ No admins found.' }, { quoted: msg });
      await sock.sendMessage(jid, { text: `📢 *ADMINS:* ${admins.map(a => '@' + a.split('@')[0]).join('\n')}`, mentions: admins }, { quoted: msg });
    },
  },
  {
    name: 'ginfo',
    aliases: ['groupinfo'],
    description: 'Show detailed group information.',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await sock.groupMetadata(jid);
      const admins = metadata.participants.filter(p => p.admin).length;
      let info = `📋 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *GROUP INFO*\n\n`;
      info += `📛 Name: ${metadata.subject}\n`;
      info += `🔑 Owner: ${metadata.owner ? '@' + metadata.owner.split('@')[0] : 'unknown'}\n`;
      info += `📅 Created: ${new Date(metadata.creation * 1000).toLocaleString()}\n`;
      info += `👥 Members: ${metadata.participants.length}\n`;
      info += `🛡️ Admins: ${admins}\n`;
      info += `🆔 ID: \`${jid}\`\n`;
      if (metadata.desc) info += `📝 Description: ${metadata.desc.slice(0, 300)}\n`;
      await sock.sendMessage(jid, { text: info, mentions: metadata.owner ? [metadata.owner] : undefined }, { quoted: msg });
    },
  },
  {
    name: 'adminkill',
    description: 'Remove a specific admin (admin only). Usage: .adminkill @mention',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await adminCheck(sock, jid, msg);
      if (!metadata) return;
      const target = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target) return await sock.sendMessage(jid, { text: '❌ Mention or reply to the admin to remove.' }, { quoted: msg });
      const victim = metadata.participants.find(p => p.id === target);
      if (!victim?.admin) return await sock.sendMessage(jid, { text: '❌ That user is not an admin.' }, { quoted: msg });
      try {
        await sock.groupParticipantsUpdate(jid, [target], 'remove');
        await sock.sendMessage(jid, { text: `🗑️ Admin @${target.split('@')[0]} has been removed.`, mentions: [target] }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'antilinkick',
    description: 'Toggle auto-remove for members sending links.',
    category: 'GROUP',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      if (!isSenderAdmin(metadata, sender)) return await sock.sendMessage(jid, { text: '❌ Only admins can change this.' }, { quoted: msg });
      const settingsStore = require('../utils/settingsStore');
      const key = `antilink_${jid}`;
      if (args[0] === 'on') { settingsStore.set(key, true); return await sock.sendMessage(jid, { text: '✅ Anti-link: ENABLED. Members sending links will be removed.' }, { quoted: msg }); }
      if (args[0] === 'off') { settingsStore.set(key, false); return await sock.sendMessage(jid, { text: '🔴 Anti-link: DISABLED.' }, { quoted: msg }); }
      const status = settingsStore.get(key, false) ? 'ENABLED 🟢' : 'DISABLED 🔴';
      await sock.sendMessage(jid, { text: `🔗 *Anti-link:* ${status}\nUse \`.antilinkick on\` or \`.antilinkick off\`.` }, { quoted: msg });
    },
  },
  {
    name: 'antibug',
    description: 'Toggle anti-bug protection (removes members sending bug messages).',
    category: 'GROUP',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      if (!isSenderAdmin(metadata, sender)) return await sock.sendMessage(jid, { text: '❌ Only admins can change this.' }, { quoted: msg });
      const settingsStore = require('../utils/settingsStore');
      const key = `antibug_${jid}`;
      if (args[0] === 'on') { settingsStore.set(key, true); return await sock.sendMessage(jid, { text: '✅ Anti-bug: ENABLED.' }, { quoted: msg }); }
      if (args[0] === 'off') { settingsStore.set(key, false); return await sock.sendMessage(jid, { text: '🔴 Anti-bug: DISABLED.' }, { quoted: msg }); }
      const status = settingsStore.get(key, false) ? 'ENABLED 🟢' : 'DISABLED 🔴';
      await sock.sendMessage(jid, { text: `🛡️ *Anti-bug:* ${status}\nUse \`.antibug on\` or \`.antibug off\`.` }, { quoted: msg });
    },
  },
  {
    name: 'leave',
    description: 'Make the bot leave the current group (admin/owner).',
    category: 'GROUP',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (groupOnly(sock, jid, msg)) return;
      const metadata = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      const ok = isSenderAdmin(metadata, sender) || msg.key.fromMe;
      if (!ok) return await sock.sendMessage(jid, { text: '❌ Only admins can order me to leave.' }, { quoted: msg });
      await sock.sendMessage(jid, { text: '👋 *Leaving group... Goodbye!*\n\n𝕄𝔼𝕊ℍ' }, { quoted: msg });
      await sock.groupLeave(jid);
    },
  },
];
