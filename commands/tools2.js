/**
 * tools2.js — tools commands: weather, disk, xray, ghostping, rootme,
 *             delaymsg, reactch, listactive
 * + status-automation toggles: autogreet, autoreact, autostatus
 */
'use strict';
const os = require('os');
const axios = require('axios');
const settingsStore = require('../utils/settingsStore');

function isOwner(msg) {
  const config = require('../config/config');
  const sender = msg.key.participant || msg.key.remoteJid;
  return sender === `${config.ownerNumber}@s.whatsapp.net` || msg.key.fromMe;
}

module.exports = [
  {
    name: 'weather',
    description: 'Get weather for a city. Usage: .weather <city>',
    category: 'TOOLS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const city = args.join(' ').trim();
      if (!city) return await sock.sendMessage(jid, { text: '❌ Usage: `.weather <city>`' }, { quoted: msg });
      try {
        const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 15000 });
        const cur = data.current_condition?.[0];
        if (!cur) throw new Error('no data');
        await sock.sendMessage(jid, { text: `🌤 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *WEATHER*\n\n📍 ${city}\n🌡️ Temp: ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)\n☁️ Condition: ${cur.weatherDesc?.[0]?.value}\n💧 Humidity: ${cur.humidity}%\n💨 Wind: ${cur.windspeedKmph} km/h\n👁️ Visibility: ${cur.visibility} km` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed to fetch weather: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'disk',
    description: 'Show bot server disk & memory usage.',
    category: 'TOOLS',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10;
      const freeMem = Math.round(os.freeMemory() / 1024 / 1024 / 1024 * 10) / 10;
      const usedMem = Math.round((totalMem - freeMem) * 10) / 10;
      const cpu = os.cpus();
      const model = cpu[0]?.model || 'unknown';
      const load = os.loadavg().map(l => l.toFixed(2)).join(' / ');
      await sock.sendMessage(jid, { text: `💾 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *SERVER STATS*\n\n🧠 RAM: ${usedMem}GB used / ${totalMem}GB total\n🆓 Free: ${freeMem}GB\n⚙️ CPU: ${model}\n📊 Load: ${load}\n🖥️ Platform: ${os.platform()} ${os.arch()}` }, { quoted: msg });
    },
  },
  {
    name: 'xray',
    description: 'Scan a URL for safety (Google Safe Browsing-style header check). Usage: .xray <url>',
    category: 'TOOLS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const url = (args[0] || '').trim();
      if (!url) return await sock.sendMessage(jid, { text: '❌ Usage: `.xray <url>`' }, { quoted: msg });
      try {
        const res = await axios.get(url.startsWith('http') ? url : `https://${url}`, { timeout: 10000, maxRedirects: 3, validateStatus: () => true });
        const suspicious = /phish|login-verify|free-gift|claim-reward/i.test(res.config.url);
        await sock.sendMessage(jid, { text: `🛡 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *URL X-RAY*\n\n🔗 ${res.config.url}\n📡 Status: ${res.status}\n🔍 Suspicious keywords: ${suspicious ? '⚠️ YES — be careful!' : '✅ None detected'}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Scan failed: ${err.message}\n(The URL may be unreachable or blocked.)` }, { quoted: msg });
      }
    },
  },
  {
    name: 'ghostping',
    description: 'Delete-then-notify prank ping. Usage: .ghostping @mention',
    category: 'TOOLS',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const target = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target) return await sock.sendMessage(jid, { text: '❌ Mention someone to ghost-ping.' }, { quoted: msg });
      const sent = await sock.sendMessage(jid, { text: `👻 @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
      await new Promise(r => setTimeout(r, 2000));
      try { await sock.sendMessage(jid, { delete: sent.key }); } catch {}
      await sock.sendMessage(jid, { text: `👻 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *GHOST PING*\n\nYou were ghost-pinged by @${(msg.key.participant || msg.key.remoteJid).split('@')[0]}`, mentions: [target, msg.key.participant || msg.key.remoteJid] });
    },
  },
  {
    name: 'rootme',
    description: 'Fake "device rooted" prank report.',
    category: 'TOOLS',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const target = msg.key.participant || msg.key.remoteJid;
      const lines = [
        `🔓 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ROOT SCAN*`,
        `⏳ Scanning device @${target.split('@')[0]}...`,
        `✅ SU binary found: /system/xbin/su`,
        `✅ Magisk detected (v26.1)`,
        `✅ BusyBox detected`,
        `✅ SELinux: permissive`,
        `⚠️ Device ROOTED — security risk!`,
      ];
      for (const line of lines) {
        await sock.sendMessage(jid, { text: line, mentions: [target] }, { quoted: msg });
        await new Promise(r => setTimeout(r, 1800));
      }
    },
  },
  {
    name: 'autogreet',
    description: 'Toggle auto-greeting new members (status).',
    category: 'STATUS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!isOwner(msg)) return await sock.sendMessage(jid, { text: '❌ Owner only.' }, { quoted: msg });
      const settingsStore2 = require('../utils/settingsStore');
      if (args[0] === 'on') { settingsStore2.set('autogreet', true); return await sock.sendMessage(jid, { text: '✅ *Auto Greet:* ENABLED 🟢' }, { quoted: msg }); }
      if (args[0] === 'off') { settingsStore2.set('autogreet', false); return await sock.sendMessage(jid, { text: '🔴 *Auto Greet:* DISABLED' }, { quoted: msg }); }
      const status = settingsStore2.get('autogreet', false) ? 'ENABLED 🟢' : 'DISABLED 🔴';
      await sock.sendMessage(jid, { text: `👋 *Auto Greet Status:* ${status}\nUse \`.autogreet on/off\`.` }, { quoted: msg });
    },
  },
  {
    name: 'autoreact',
    description: 'Toggle auto-react to messages (status).',
    category: 'STATUS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!isOwner(msg)) return await sock.sendMessage(jid, { text: '❌ Owner only.' }, { quoted: msg });
      const settingsStore2 = require('../utils/settingsStore');
      if (args[0] === 'on') { settingsStore2.set('autoreact', true); return await sock.sendMessage(jid, { text: '✅ *Auto React:* ENABLED 🟢' }, { quoted: msg }); }
      if (args[0] === 'off') { settingsStore2.set('autoreact', false); return await sock.sendMessage(jid, { text: '🔴 *Auto React:* DISABLED' }, { quoted: msg }); }
      const status = settingsStore2.get('autoreact', false) ? 'ENABLED 🟢' : 'DISABLED 🔴';
      await sock.sendMessage(jid, { text: `❤️ *Auto React Status:* ${status}\nUse \`.autoreact on/off\`.` }, { quoted: msg });
    },
  },
  {
    name: 'autostatus',
    description: 'Toggle auto-viewing contacts\' status updates (status).',
    category: 'STATUS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!isOwner(msg)) return await sock.sendMessage(jid, { text: '❌ Owner only.' }, { quoted: msg });
      const settingsStore2 = require('../utils/settingsStore');
      if (args[0] === 'on') { settingsStore2.set('autostatus', true); return await sock.sendMessage(jid, { text: '✅ *Auto Status View:* ENABLED 🟢' }, { quoted: msg }); }
      if (args[0] === 'off') { settingsStore2.set('autostatus', false); return await sock.sendMessage(jid, { text: '🔴 *Auto Status View:* DISABLED' }, { quoted: msg }); }
      const status = settingsStore2.get('autostatus', false) ? 'ENABLED 🟢' : 'DISABLED 🔴';
      await sock.sendMessage(jid, { text: `📊 *Auto Status Status:* ${status}\nUse \`.autostatus on/off\`.` }, { quoted: msg });
    },
  },
  {
    name: 'delaymsg',
    description: 'Send a delayed message. Usage: .delaymsg <seconds> <text>',
    category: 'TOOLS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const secs = parseInt(args[0], 10);
      const text = args.slice(1).join(' ').trim();
      if (!secs || !text) return await sock.sendMessage(jid, { text: '❌ Usage: `.delaymsg <seconds> <text>`' }, { quoted: msg });
      await sock.sendMessage(jid, { text: `⏳ Message scheduled in ${secs}s...` }, { quoted: msg });
      setTimeout(async () => {
        try { await sock.sendMessage(jid, { text: `⏰ *Delayed message:*\n${text}` }); } catch {}
      }, Math.min(secs, 300) * 1000);
    },
  },
  {
    name: 'reactch',
    description: 'React to a replied message with an emoji. Usage: .reactch 😂 (reply to a message)',
    category: 'TOOLS',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const emoji = (args[0] || '👍').trim();
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const quotedKey = ctx?.stanzaId ? { remoteJid: ctx.remoteJid || jid, fromMe: ctx.participant === sock.user?.id, id: ctx.stanzaId } : null;
      if (!quotedKey) return await sock.sendMessage(jid, { text: '❌ Reply to a message with .reactch <emoji>' }, { quoted: msg });
      try {
        await sock.sendMessage(jid, { react: { text: emoji, key: quotedKey } });
        await sock.sendMessage(jid, { text: `✅ Reacted with ${emoji}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ React failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'listactive',
    description: 'List recently active users who triggered commands (real-time counter).',
    category: 'STATUS',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const { getActiveUsers } = require('../utils/activeTracker');
      const users = getActiveUsers(60);
      const list = users.length
        ? users.map((u, i) => `${i + 1}. @${u.jid.split('@')[0]} — ${u.count} cmd(s)`).join('\n')
        : 'No recent activity.';
      await sock.sendMessage(jid, { text: `📋 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ACTIVE USERS*\n\nLast 60 seconds:\n\n${list}`, mentions: users.map(u => u.jid) }, { quoted: msg });
    },
  },
];
