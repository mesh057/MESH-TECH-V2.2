/**
 * gitcmds.js — GitHub info commands: github, gitfollow, gitfollowers, gitrepos, gitstarred
 */
'use strict';
const axios = require('axios');
const GH = 'https://api.github.com';

function ghUser(name) {
  return axios.get(`${GH}/users/${encodeURIComponent(name)}`, {
    headers: { 'User-Agent': 'MESH-TECH-BOT', 'Accept': 'application/vnd.github+json' },
    timeout: 15000,
  }).then(r => r.data);
}

module.exports = [
  {
    name: 'github',
    description: 'Show GitHub profile info. Usage: .github <username>',
    category: 'GITHUB',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const name = (args[0] || 'mesh057').trim();
      try {
        const u = await ghUser(name);
        let txt = `🐙 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *GITHUB*\n\n`;
        txt += `👤 Name: ${u.name || u.login}\n`;
        txt += `🔖 Login: @${u.login}\n`;
        txt += `📝 Bio: ${u.bio || '—'}\n`;
        txt += `🏢 Company: ${u.company || '—'}\n`;
        txt += `📍 Location: ${u.location || '—'}\n`;
        txt += `📦 Public repos: ${u.public_repos}\n`;
        txt += `👥 Followers: ${u.followers}\n`;
        txt += `🤝 Following: ${u.following}\n`;
        txt += `⭐ Public gists: ${u.public_gists}\n`;
        txt += `📅 Joined: ${new Date(u.created_at).toLocaleDateString()}\n`;
        txt += `🔗 ${u.html_url}`;
        await sock.sendMessage(jid, { text: txt }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ GitHub user not found or API error: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'gitfollow',
    description: 'Show who a GitHub user is following. Usage: .gitfollow <username>',
    category: 'GITHUB',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const name = (args[0] || '').trim();
      if (!name) return await sock.sendMessage(jid, { text: '❌ Usage: `.gitfollow <username>`' }, { quoted: msg });
      try {
        const { data } = await axios.get(`${GH}/users/${encodeURIComponent(name)}/following`, {
          headers: { 'User-Agent': 'MESH-TECH-BOT', 'Accept': 'application/vnd.github+json' },
          timeout: 15000,
        });
        const list = data.slice(0, 15).map(u => `• @${u.login}`).join('\n') || 'None found.';
        await sock.sendMessage(jid, { text: `🤝 *GITHUB FOLLOWING* (@${name})\n\n${list}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'gitfollowers',
    description: 'Show GitHub user followers. Usage: .gitfollowers <username>',
    category: 'GITHUB',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const name = (args[0] || '').trim();
      if (!name) return await sock.sendMessage(jid, { text: '❌ Usage: `.gitfollowers <username>`' }, { quoted: msg });
      try {
        const { data } = await axios.get(`${GH}/users/${encodeURIComponent(name)}/followers`, {
          headers: { 'User-Agent': 'MESH-TECH-BOT', 'Accept': 'application/vnd.github+json' },
          timeout: 15000,
        });
        const list = data.slice(0, 15).map(u => `• @${u.login}`).join('\n') || 'None found.';
        await sock.sendMessage(jid, { text: `👥 *GITHUB FOLLOWERS* (@${name})\n\n${list}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'gitrepos',
    description: 'Show a GitHub user\'s repositories. Usage: .gitrepos <username>',
    category: 'GITHUB',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const name = (args[0] || '').trim();
      if (!name) return await sock.sendMessage(jid, { text: '❌ Usage: `.gitrepos <username>`' }, { quoted: msg });
      try {
        const { data } = await axios.get(`${GH}/users/${encodeURIComponent(name)}/repos?sort=updated&per_page=10`, {
          headers: { 'User-Agent': 'MESH-TECH-BOT', 'Accept': 'application/vnd.github+json' },
          timeout: 15000,
        });
        const list = data.map(r => `• *${r.name}* ⭐${r.stargazers_count} — ${r.html_url}`).join('\n') || 'No repos.';
        await sock.sendMessage(jid, { text: `📦 *GITHUB REPOS* (@${name})\n\n${list}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'gitstarred',
    description: 'Show a GitHub user\'s starred repositories. Usage: .gitstarred <username>',
    category: 'GITHUB',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const name = (args[0] || '').trim();
      if (!name) return await sock.sendMessage(jid, { text: '❌ Usage: `.gitstarred <username>`' }, { quoted: msg });
      try {
        const { data } = await axios.get(`${GH}/users/${encodeURIComponent(name)}/starred?per_page=10`, {
          headers: { 'User-Agent': 'MESH-TECH-BOT', 'Accept': 'application/vnd.github+json' },
          timeout: 15000,
        });
        const list = data.map(r => `• *${r.name}* ⭐${r.stargazers_count} — ${r.html_url}`).join('\n') || 'No starred repos.';
        await sock.sendMessage(jid, { text: `⭐ *GITHUB STARRED* (@${name})\n\n${list}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    },
  },
];
